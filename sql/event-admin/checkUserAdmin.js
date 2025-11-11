module.exports = (eventId, userId) => ({
  text: `
        SELECT 
            EXISTS (
                SELECT 1 FROM event_admin WHERE event_id = $1 AND user_id = $2
            ) as is_admin,
            EXISTS (
                SELECT 1 FROM event WHERE event_id = $1 AND owner_id = $2
            ) as is_owner
    `,
  values: [eventId, userId],
});
