const bcrypt = require("bcrypt");
const { pool } = require("../config/database");
const getUserByUsernameSQL = require("../sql/users/getUserByUsername");
const getUserByIdSQL = require("../sql/users/getUserById");
const getUserByEmailSQL = require("../sql/users/getUserByEmail");
const createUserSQL = require("../sql/users/createUser");

class User {
  static async findByUsername(username) {
    try {
      const result = await pool.query(getUserByUsernameSQL(username));
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`User lookup failed: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    try {
      const result = await pool.query(getUserByEmailSQL(email));
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Email lookup failed: ${error.message}`);
    }
  }

  static async create(userData) {
    try {
      const hashedPassword = await bcrypt.hash(
        userData.password,
        parseInt(process.env.BCRYPT_SALT_ROUNDS),
      );
      const result = await pool.query(
        createUserSQL({
          ...userData,
          passwordHash: hashedPassword,
        }),
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        throw new Error("Username or email already exists");
      }
      throw new Error(`User creation failed: ${error.message}`);
    }
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async findById(userId) {
    const result = await pool.query(getUserByIdSQL(userId));
    return result.rows[0] || null;
  }
}

module.exports = User;
