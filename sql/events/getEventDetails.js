module.exports = (eventId, userId) => ({
    text: `
        WITH event_info AS (
            SELECT 
                e.*,
                u.user_name as owner_name,
                u.fname as owner_fname,
                u.lname as owner_lname,
                r.room_name,
                r.capacity as room_capacity,
                COUNT(rsvp.rsvp_id) FILTER (WHERE rsvp.status = 'accepted') as attending_count
            FROM event e
            JOIN users u ON e.owner_id = u.user_id
            LEFT JOIN rooms r ON e.room_id = r.room_id
            LEFT JOIN rsvp ON e.event_id = rsvp.event_id
            WHERE e.event_id = $1 AND e.is_deleted = FALSE
            GROUP BY e.event_id, u.user_id, r.room_id
        ),
        user_status AS (
            SELECT status FROM rsvp WHERE event_id = $1 AND user_id = $2
        ),
        user_permissions AS (
            SELECT 
                EXISTS (
                    SELECT 1 FROM event_admin WHERE event_id = $1 AND user_id = $2
                ) as is_admin,
                EXISTS (
                    SELECT 1 FROM event WHERE event_id = $1 AND owner_id = $2
                ) as is_owner
        )
        SELECT 
            ei.*,
            COALESCE(us.status, 'pending') as user_status,  -- CHANGED: default to 'pending'
            ia.is_admin,
            ia.is_owner
        FROM event_info ei
        CROSS JOIN user_permissions ia
        LEFT JOIN user_status us ON true
    `,
    values: [eventId, userId],
});
