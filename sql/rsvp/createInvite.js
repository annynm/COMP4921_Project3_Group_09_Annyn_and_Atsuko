module.exports = (eventId, userId, invitedBy) => ({
  text: `
        INSERT INTO rsvp (event_id, user_id, invited_by, status)
        VALUES ($1, $2, $3, 'pending')
        ON CONFLICT (event_id, user_id)
        DO UPDATE SET 
            status = 'pending',
            invited_by = $3,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *
    `,
  values: [eventId, userId, invitedBy],
});

