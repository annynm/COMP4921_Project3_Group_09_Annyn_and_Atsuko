// Soft delete event (set is_deleted = TRUE and deleted_at = NOW()) with admin permission check
// Store deleted_at as UTC to ensure consistent timezone handling
module.exports = (eventId, userId) => ({
    text: `
        UPDATE event
        SET is_deleted = TRUE,
            deleted_at = (NOW() AT TIME ZONE 'UTC')
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

