module.exports = (requestorId, receiverId) => ({
    text: `
        INSERT INTO friendship (requestor_id, receiver_id, status, created_at)
        VALUES ($1, $2, 'pending', CURRENT_TIMESTAMP)
        RETURNING *
    `,
    values: [requestorId, receiverId],
});

