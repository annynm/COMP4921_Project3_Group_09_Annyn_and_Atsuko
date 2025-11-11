module.exports = (username) => ({
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
            WHERE user_name = $1 AND is_deleted = FALSE
        )
        SELECT * FROM user_lookup
    `,
  values: [username],
});
