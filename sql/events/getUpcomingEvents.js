module.exports = (userId, limit = 20) => ({
    text: `
        WITH user_friends AS (
            SELECT 
                CASE 
                    WHEN requestor_id = $1 THEN receiver_id 
                    ELSE requestor_id 
                END AS friend_id
            FROM friendship
            WHERE (requestor_id = $1 OR receiver_id = $1) 
            AND status = 'accepted'
        ),
        visible_events AS (
            SELECT 
                e.event_id,
                e.event_name,
                e.event_description,
                e.start_datetime,
                e.end_datetime,
                e.privacy_type,
                e.max_capacity,
                e.owner_id,
                r.room_name,
                COUNT(rsvp.rsvp_id) FILTER (WHERE rsvp.status = 'accepted') as attending_count
            FROM event e
            LEFT JOIN rooms r ON e.room_id = r.room_id
            LEFT JOIN rsvp ON e.event_id = rsvp.event_id
            WHERE e.is_deleted = FALSE 
            AND e.is_cancelled = FALSE
            AND e.start_datetime > NOW()
            AND (
                e.privacy_type = 'public'
                OR e.owner_id = $1
                OR (e.privacy_type = 'friends_only' AND EXISTS (
                    SELECT 1 FROM user_friends uf WHERE uf.friend_id = e.owner_id
                ))
            )
            GROUP BY e.event_id, r.room_name
        ),
        user_rsvp_status AS (
            SELECT event_id, status FROM rsvp WHERE user_id = $1
        ),
        user_attending_events AS (
            SELECT e.event_id, e.start_datetime, e.end_datetime
            FROM event e
            INNER JOIN rsvp r ON e.event_id = r.event_id
            WHERE r.user_id = $1 
            AND r.status = 'accepted'
            AND e.is_deleted = FALSE
            AND e.is_cancelled = FALSE
            AND e.start_datetime > NOW()
        ),
        events_with_conflicts AS (
            SELECT 
                ve.*,
                COALESCE(urs.status, 'pending') as user_rsvp_status,
                CASE 
                    WHEN ve.max_capacity IS NULL THEN 'Unlimited'
                    ELSE CONCAT(ve.attending_count, '/', ve.max_capacity)
                END as capacity_display,
                CASE 
                    WHEN ve.max_capacity IS NOT NULL AND ve.attending_count >= ve.max_capacity THEN true
                    ELSE false
                END as is_full,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM user_attending_events uae 
                        WHERE (uae.start_datetime < ve.end_datetime AND uae.end_datetime > ve.start_datetime)
                    ) THEN true
                    ELSE false
                END as has_time_conflict
            FROM visible_events ve
            LEFT JOIN user_rsvp_status urs ON ve.event_id = urs.event_id
            WHERE urs.status IS NULL OR urs.status != 'accepted'
        )
        SELECT * FROM events_with_conflicts
        ORDER BY start_datetime ASC
        LIMIT $2
    `,
    values: [userId, limit],
});
