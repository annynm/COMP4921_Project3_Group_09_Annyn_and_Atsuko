// Basic event fetch by ID
module.exports = (eventId) => ({
    text: `
        WITH event_details AS (
            SELECT 
                e.*,
                u.user_name as owner_name,
                u.fname as owner_fname,
                u.lname as owner_lname,
                r.room_name,
                r.capacity as room_capacity
            FROM event e
            JOIN users u ON e.owner_id = u.user_id
            LEFT JOIN rooms r ON e.room_id = r.room_id
            WHERE e.event_id = $1 AND e.is_deleted = FALSE
        )
        SELECT * FROM event_details
    `,
    values: [eventId],
});
