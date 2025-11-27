module.exports = (userId, date) => ({
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
        day_events AS (
            SELECT DISTINCT
                e.event_id,
                e.event_name,
                e.start_datetime,
                e.end_datetime,
                e.color,
                e.privacy_type,
                r.room_name
            FROM event e
            LEFT JOIN rooms r ON e.room_id = r.room_id
            LEFT JOIN rsvp ON e.event_id = rsvp.event_id
            WHERE e.is_deleted = FALSE
            AND e.is_cancelled = FALSE
            AND DATE(e.start_datetime) = $2
            AND (
                e.privacy_type = 'public'
                OR e.owner_id = $1
                OR rsvp.user_id = $1
                OR (e.privacy_type = 'friends_only' AND EXISTS (
                    SELECT 1 FROM user_friends uf WHERE uf.friend_id = e.owner_id
                ))
            )
            ORDER BY e.start_datetime ASC
        )
        SELECT * FROM day_events
    `,
    values: [userId, date],
});
