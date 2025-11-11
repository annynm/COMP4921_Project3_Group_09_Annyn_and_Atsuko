module.exports = (userId, limit = 20) => ({
    text: `
        WITH attending_events AS (
            SELECT 
                e.event_id,
                e.event_name,
                e.event_description,
                e.start_datetime,
                e.end_datetime,
                e.privacy_type,
                e.max_capacity,
                r.room_name,
                COUNT(rsvp.rsvp_id) FILTER (WHERE rsvp.status = 'accepted') as attending_count
            FROM event e
            JOIN rsvp ON e.event_id = rsvp.event_id
            LEFT JOIN rooms r ON e.room_id = r.room_id
            WHERE rsvp.user_id = $1 
            AND rsvp.status = 'accepted'
            AND e.is_deleted = FALSE
            AND e.is_cancelled = FALSE
            AND e.start_datetime > NOW()
            GROUP BY e.event_id, r.room_name
        )
        SELECT 
            ae.*,
            'accepted' as user_rsvp_status,
            CASE 
                WHEN ae.max_capacity IS NULL THEN 'Unlimited'
                ELSE CONCAT(ae.attending_count, '/', ae.max_capacity)
            END as capacity_display
        FROM attending_events ae
        ORDER BY ae.start_datetime ASC
        LIMIT $2
    `,
    values: [userId, limit],
});
