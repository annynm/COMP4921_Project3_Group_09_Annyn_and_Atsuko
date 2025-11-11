module.exports = (email) => ({
    text: `
        WITH user_lookup AS (
            SELECT 
                user_id, 
                user_name, 
                email, 
                fname, 
                lname, 
                password_hash,
                created_at
            FROM users
            WHERE email = $1
        )
        SELECT * FROM user_lookup
    `,
    values: [email],
});
