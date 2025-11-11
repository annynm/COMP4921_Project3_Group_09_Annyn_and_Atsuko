module.exports = (userId, limit = 20) => ({
    text: `
        WITH admin_events AS (
            SELECT 
                e.event_id,
                e.event_name,
                e.event_description,
                e.start_datetime,
                e.end_datetime,
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
            LEFT JOIN rooms r ON e.room_id = r.room_id
            LEFT JOIN rsvp ON e.event_id = rsvp.event_id
            LEFT JOIN event_admin ea ON e.event_id = ea.event_id
            WHERE e.is_deleted = FALSE
            AND e.is_cancelled = FALSE
            AND e.start_datetime > NOW()
            AND (e.owner_id = $1 OR ea.user_id = $1)
            GROUP BY e.event_id, r.room_name, ea.user_id
        )
        SELECT 
            ae.*,
            ae.admin_status as user_rsvp_status,
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
