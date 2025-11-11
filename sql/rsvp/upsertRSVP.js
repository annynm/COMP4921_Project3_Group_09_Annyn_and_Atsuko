module.exports = (eventId, userId, status) => ({
  text: `
        WITH upsert_rsvp AS (
            INSERT INTO rsvp (event_id, user_id, status)
            VALUES ($1, $2, $3)
            ON CONFLICT (event_id, user_id)
            DO UPDATE SET status = $3, updated_at = CURRENT_TIMESTAMP
            RETURNING *
        )
        SELECT * FROM upsert_rsvp
    `,
  values: [eventId, userId, status],
});
