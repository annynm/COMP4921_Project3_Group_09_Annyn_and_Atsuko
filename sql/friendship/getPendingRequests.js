module.exports = (receiverId) => ({
    text: `
        SELECT 
            f.friendship_id,
            f.requestor_id,
            f.receiver_id,
            f.status,
            f.created_at,
            u.user_id,
            u.user_name,
            u.fname,
            u.lname
        FROM friendship f
        JOIN users u ON f.requestor_id = u.user_id
        WHERE f.receiver_id = $1 
          AND f.status = 'pending'
        ORDER BY f.created_at DESC
    `,
    values: [receiverId],
});

