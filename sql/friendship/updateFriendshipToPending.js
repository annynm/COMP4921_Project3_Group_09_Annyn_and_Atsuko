// Update existing friendship record to pending status (for re-sending requests)
module.exports = (friendshipId, requestorId, receiverId) => ({
  text: `
        UPDATE friendship
        SET 
            requestor_id = $2,
            receiver_id = $3,
            status = 'pending',
            created_at = CURRENT_TIMESTAMP
        WHERE friendship_id = $1
        RETURNING *
    `,
  values: [friendshipId, requestorId, receiverId],
});

