const pool = require("../../config/database");

module.exports = (eventId, userId) => ({
    text: `
        INSERT INTO event_admin (event_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (event_id, user_id) DO NOTHING
        RETURNING *;
        `,
    values: [eventId, userId]
});