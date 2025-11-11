require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const { pool } = require("./config/database");
const { store } = require("./config/session");
const router = require("./routes/router");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.MONGODB_SESSION_SECRET,
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

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
app.use("/", router);

// 404 Handler (must be before error handler)
app.use((req, res) => {
  res.status(404).render("404", {
    title: "404 - Page Not Found",
    user: req.session.user || null,
  });
});

// Global Error Handler - ALWAYS logs full details
app.use((err, req, res, next) => {
  // ALWAYS log the full error with stack trace to console
  console.error("\n=== SERVER ERROR ===");
  console.error("Time:", new Date().toISOString());
  console.error("Route:", req.method, req.url);
  console.error(
    "User:",
    req.session.user ? req.session.user.username : "Not logged in",
  );
  console.error("Error Message:", err.message);
  console.error("Stack Trace:\n", err.stack);
  console.error("====================\n");

  // Show full error details in development, generic message in production
  const showDetails = process.env.NODE_ENV === "development";

  res.status(500).render("error", {
    title: "Error",
    user: req.session.user || null,
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

// Start server
async function startServer() {
  try {
    const pgClient = await pool.connect();
    console.log("✅ NeonDB (PostgreSQL) connected successfully");
    pgClient.release();

    await store.client.connect();
    console.log("✅ MongoDB Session Store connected successfully");

    app.listen(PORT, () => {
      console.log(`🚀 Greendale Community College App running on port ${PORT}`);
      console.log(`📚 Visit: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start services:", error);
    process.exit(1);
  }
}

startServer();
