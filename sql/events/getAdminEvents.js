module.exports = (userId, limit = 20) => ({
    text: `
        WITH user_admin_event_ids AS (
            SELECT DISTINCT e.event_id
            FROM event e
            LEFT JOIN event_admin ea ON e.event_id = ea.event_id
            WHERE e.is_deleted = FALSE
            AND e.is_cancelled = FALSE
            AND e.start_datetime > NOW()
            AND (e.owner_id = $1 OR ea.user_id = $1)
        ),
        admin_events AS (
            SELECT 
                e.event_id,
                e.event_name,
                e.event_description,
                e.start_datetime AT TIME ZONE 'UTC' as start_datetime,
                e.end_datetime AT TIME ZONE 'UTC' as end_datetime,
                e.privacy_type,
                e.max_capacity,
                r.room_name,
                e.owner_id,
                COUNT(rsvp.rsvp_id) FILTER (WHERE rsvp.status = 'accepted') as attending_count,
                CASE 
                    WHEN e.owner_id = $1 THEN 'owner'
                    ELSE 'admin'
                END as admin_status
            FROM event e
            INNER JOIN user_admin_event_ids uaei ON e.event_id = uaei.event_id
            LEFT JOIN rooms r ON e.room_id = r.room_id
            LEFT JOIN rsvp ON e.event_id = rsvp.event_id
            GROUP BY e.event_id, r.room_name, e.start_datetime, e.end_datetime
        )
        SELECT 
            ae.event_id,
            ae.event_name,
            ae.event_description,
            ae.start_datetime,
            ae.end_datetime,
            ae.privacy_type,
            ae.max_capacity,
            ae.room_name,
            ae.owner_id,
            ae.admin_status,
            CASE 
                WHEN ae.max_capacity IS NULL THEN 'Unlimited'
                ELSE CONCAT(ae.attending_count, '/', ae.max_capacity)
            END as capacity_display
        FROM admin_events ae
        ORDER BY ae.start_datetime ASC
        LIMIT $2
    `,
    values: [userId, limit],
});
