module.exports = (userData) => ({
    text: `
        WITH new_user AS (
            INSERT INTO users (user_name, fname, lname, email, password_hash)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING user_id, user_name, email, fname, lname, created_at
        )
        SELECT * FROM new_user
    `,
    values: [
        userData.username,
        userData.fname,
        userData.lname,
        userData.email,
        userData.passwordHash,
    ],
});
