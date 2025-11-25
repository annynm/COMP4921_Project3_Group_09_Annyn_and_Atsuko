// Restore deleted event (set is_deleted = FALSE) with admin permission check
module.exports = (eventId, userId) => ({
    text: `
        UPDATE event
        SET is_deleted = FALSE,
            deleted_at = NULL
        WHERE event_id = $1
        AND is_deleted = TRUE
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

