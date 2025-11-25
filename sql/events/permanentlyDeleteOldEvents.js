// Permanently delete events that have been soft-deleted for 30+ days
module.exports = () => ({
    text: `
        DELETE FROM event
        WHERE is_deleted = TRUE
        AND deleted_at < (NOW() AT TIME ZONE 'UTC' - INTERVAL '30 days')
        RETURNING event_id
    `,
    values: []
});

