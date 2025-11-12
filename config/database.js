const { Pool } = require("pg");

// --- CHIKORITA CREDENTIALS (Development) ---
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  user: process.env.CHIKORITA_USER,
  password: process.env.CHIKORITA_PASSWORD,
  ssl:
    process.env.DB_SSL === "true"
      ? { rejectUnauthorized: false }
      : process.env.DB_SSL === "false"
        ? false
        : true, // Default: true for Neon or other managed Postgres
  max: 20,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: false,
});

// --- TOTODILE CREDENTIALS (Production) ---
// Uncomment below and comment out the CHIKORITA block above when deploying.
/*
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  user: process.env.TOTODILE_USER,
  password: process.env.TOTODILE_PASSWORD,
  ssl:
    process.env.DB_SSL === "true"
      ? { rejectUnauthorized: false }
      : process.env.DB_SSL === "false"
      ? false
      : true,
  max: 20,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: false,
});
*/

pool.on("error", (err) => {
  console.error("⚠️  PostgreSQL pool error:", err.message);
});

pool.on("connect", () => {
  console.log("📊 PostgreSQL client connected to pool");
});

module.exports = { pool };
