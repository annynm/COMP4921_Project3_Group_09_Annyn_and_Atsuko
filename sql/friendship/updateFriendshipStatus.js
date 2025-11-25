// Update friendship status for accept/decline (receiver can accept/decline)
module.exports = (friendshipId, receiverId, newStatus) => ({
    text: `
        UPDATE friendship
        SET status = $3
        WHERE friendship_id = $1
          AND receiver_id = $2
          AND status = 'pending'
        RETURNING *
    `,
    values: [friendshipId, receiverId, newStatus],
});

// Update friendship status for cancel (requestor can cancel)
module.exports.cancel = (friendshipId, requestorId) => ({
    text: `
        UPDATE friendship
        SET status = 'cancelled'
        WHERE friendship_id = $1
          AND requestor_id = $2
          AND status = 'pending'
        RETURNING *
    `,
    values: [friendshipId, requestorId],
});

