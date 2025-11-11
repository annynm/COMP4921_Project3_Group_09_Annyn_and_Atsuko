const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);

const store = new MongoDBStore({
  uri: `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_URL_END}/?retryWrites=true&w=majority`,
  databaseName: "GreendaleCalendar",
  collection: process.env.MONGODB_SESSION_TABLE,
  expires: 1000 * 60 * 60 * 3,
});

store.on("error", (error) => {
  console.error("MongoDB Session Store Error:", error);
});

module.exports = { store };
