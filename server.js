// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const { pool } = require("./config/database");
const { store } = require("./config/session");
const router = require("./routes/router");

// Initialize scheduled jobs
require("./jobs/cleanupDeletedEvents");

const app = express();
const PORT = process.env.PORT || 3004;

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.MONGODB_SESSION_SECRET || "dev-secret",
    store: store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 3 * 60 * 60 * 1000, // 3 hours
    },
  }),
);

// --- View Engine ---
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// --- Routes ---
app.use("/", router);

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).render("404", {
    title: "404 - Page Not Found",
    user: req.session.user || null,
  });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error("\n=== SERVER ERROR ===");
  console.error("Time:", new Date().toISOString());
  console.error("Route:", req.method, req.url);
  console.error(
    "User:",
    req.session && req.session.user
      ? req.session.user.username
      : "Not logged in",
  );
  console.error("Error Message:", err.message);
  console.error("Stack Trace:\n", err.stack);
  console.error("====================\n");

  const showDetails = process.env.NODE_ENV === "development";

  res.status(500).render("error", {
    title: "Error",
    user: req.session ? req.session.user : null,
    error: showDetails ? err.message : "Something went wrong!",
    errorDetails: showDetails
      ? {
        message: err.message,
        stack: err.stack,
        route: `${req.method} ${req.url}`,
      }
      : null,
  });
});

// --- Start Server ---
async function startServer() {
  try {
    console.log("🔄 Starting Greendale Community College App...");
    console.log("🔗 Connecting to PostgreSQL (NeonDB)...");

    // Quick retry (2 attempts)
    let pgConnected = false;
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const pgClient = await pool.connect();
        console.log("✅ PostgreSQL connected successfully");
        pgClient.release();
        pgConnected = true;
        break;
      } catch (pgError) {
        console.log(
          `   PostgreSQL attempt ${attempt}/${maxAttempts} failed: ${pgError.message}`,
        );
        if (attempt < maxAttempts) {
          const delay = attempt * 500; // 0.5s, 1s
          console.log(`   Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (!pgConnected)
      throw new Error("PostgreSQL connection failed after retries");

    console.log(
      "⏳ MongoDB Session Store will auto-connect if available (non-blocking)...",
    );

    app.listen(PORT, () => {
      console.log(`🚀 Greendale Community College App running on port ${PORT}`);
      console.log(`📚 Visit: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("\n❌ Failed to start services:", error.message);

    if (error.code === "ETIMEDOUT" || error.message.includes("timeout")) {
      console.error("\n💡 Troubleshooting steps:");
      console.error("   1. Check PostgreSQL credentials in .env");
      console.error("   2. Verify IP is whitelisted in NeonDB");
      console.error("   3. Database might be idle - wait 30s and retry");
      console.error("   4. Increase connectionTimeoutMillis if needed");
    }

    process.exit(1);
  }
}

// --- Graceful Shutdown ---
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down gracefully...");
  pool.end().then(() => {
    console.log("📊 PostgreSQL pool closed");
    process.exit(0);
  });
});

startServer();
