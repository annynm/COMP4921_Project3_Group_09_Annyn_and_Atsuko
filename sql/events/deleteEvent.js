// Soft delete event (set is_deleted = TRUE) with admin permission check
module.exports = (eventId, userId) => ({
    text: `
        UPDATE event
        SET is_deleted = TRUE
        WHERE event_id = $1
        AND is_deleted = FALSE
        AND (
            owner_id = $2
            OR EXISTS (
                SELECT 1 FROM event_admin WHERE event_id = $1 AND user_id = $2
            )
        )
        RETURNING event_id
    `,
    values: [eventId, userId],
});

