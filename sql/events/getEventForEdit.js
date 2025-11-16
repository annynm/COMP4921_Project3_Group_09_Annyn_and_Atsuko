// Get event for editing (with admin permission check)
module.exports = (eventId, userId) => ({
    text: `
        WITH event_info AS (
            SELECT 
                e.*,
                r.room_name,
                r.capacity as room_capacity
            FROM event e
            LEFT JOIN rooms r ON e.room_id = r.room_id
            WHERE e.event_id = $1 AND e.is_deleted = FALSE
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
            up.is_admin,
            up.is_owner,
            (up.is_admin OR up.is_owner) as can_edit
        FROM event_info ei
        CROSS JOIN user_permissions up
    `,
    values: [eventId, userId],
});

