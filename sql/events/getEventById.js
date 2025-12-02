// Basic event fetch by ID
module.exports = (eventId) => ({
    text: `
        WITH event_details AS (
            SELECT 
                e.event_id,
                e.event_name,
                e.owner_id,
                e.event_description,
                e.is_recurring,
                e.recurring_id,
                e.room_id,
                e.color,
                e.is_all_day,
                e.start_datetime,
                e.end_datetime,
                e.created_at,
                e.updated_at,
                e.is_deleted,
                e.deleted_at,
                e.is_cancelled,
                e.privacy_type,
                e.max_capacity,
                e.allow_friend_invites,
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

