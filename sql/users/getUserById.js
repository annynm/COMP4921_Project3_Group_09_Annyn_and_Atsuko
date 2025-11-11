module.exports = (userId) => ({
    text: `
        SELECT user_id, user_name, email, fname, lname, created_at 
        FROM users 
        WHERE user_id = $1
    `,
    values: [userId],
});
