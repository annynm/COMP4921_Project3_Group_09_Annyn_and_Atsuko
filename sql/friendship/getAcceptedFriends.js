module.exports = (userId) => ({
    text: `
        SELECT 
            f.friendship_id,
            f.requestor_id,
            f.receiver_id,
            f.status,
            f.created_at,
            CASE 
                WHEN f.requestor_id = $1 THEN u_receiver.user_id
                ELSE u_requestor.user_id
            END AS user_id,
            CASE 
                WHEN f.requestor_id = $1 THEN u_receiver.user_name
                ELSE u_requestor.user_name
            END AS user_name,
            CASE 
                WHEN f.requestor_id = $1 THEN u_receiver.email
                ELSE u_requestor.email
            END AS email,
            CASE 
                WHEN f.requestor_id = $1 THEN u_receiver.fname
                ELSE u_requestor.fname
            END AS fname,
            CASE 
                WHEN f.requestor_id = $1 THEN u_receiver.lname
                ELSE u_requestor.lname
            END AS lname
        FROM friendship f
        LEFT JOIN users u_requestor ON f.requestor_id = u_requestor.user_id
        LEFT JOIN users u_receiver ON f.receiver_id = u_receiver.user_id
        WHERE (f.requestor_id = $1 OR f.receiver_id = $1)
          AND f.status = 'accepted'
        ORDER BY f.created_at DESC
    `,
    values: [userId],
});

