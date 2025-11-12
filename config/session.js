// config/session.js
const session = require("express-session");
const MongoDBStoreFactory = require("connect-mongodb-session");
const encode = encodeURIComponent;

let store;
const MongoDBStore = MongoDBStoreFactory(session);

// Helper to safely build MongoDB URI
function buildMongoUri() {
  const user = process.env.MONGODB_USER || "";
  const pass = process.env.MONGODB_PASSWORD || "";
  const end = process.env.MONGODB_URL_END || "";
  if (!user || !pass || !end) return null;

  return `mongodb+srv://${encode(user)}:${encode(pass)}@${end}/?retryWrites=true&w=majority`;
}

try {
  const uri = buildMongoUri();

  if (!uri) {
    throw new Error(
      "MongoDB credentials missing (check MONGODB_USER, MONGODB_PASSWORD, MONGODB_URL_END)",
    );
  }

  store = new MongoDBStore({
    uri,
    databaseName: "GreendaleCalendar",
    collection: process.env.MONGODB_SESSION_TABLE || "sessions",
    expires: 1000 * 60 * 60 * 3, // 3 hours
    connectionOptions: {
      serverSelectionTimeoutMS: 5000, // Faster failure
      connectTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 600000,
      w: "majority",
      retryWrites: true,
    },
  });

  store.on("connected", () => {
    console.log("✅ MongoDB Session Store connected successfully");
  });

  store.on("disconnected", () => {
    console.log("⚠️  MongoDB Session Store disconnected");
  });

  store.on("error", (err) => {
    console.error("⚠️  MongoDB Session Store Error:", err.message);
    console.log(
      "   Sessions will be unavailable until MongoDB Atlas is reachable",
    );
  });
} catch (err) {
  console.error("⚠️  Failed to initialize MongoDB session store:", err.message);
  console.error("   Falling back to in-memory session store (non-persistent).");
  store = new session.MemoryStore();
}

module.exports = { store };
