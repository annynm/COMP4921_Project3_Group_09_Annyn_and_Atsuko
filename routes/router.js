const express = require("express");
const router = express.Router();
const { pool } = require("../config/database");

const { homeLogic } = require("./logic/home");
const {
  loginGet,
  loginPost,
  logout,
  registerGet,
  registerPost,
} = require("./logic/auth");
const { eventsLogic } = require("./logic/events");
const { eventDetailsLogic, updateRSVPLogic } = require("./logic/eventDetails");
const { bookEventGet, editEventGet, editEventPost, createEventPost, deleteEventPost } = require("./logic/eventForms");
const { calendarPageLogic, calendarDayLogic } = require("./logic/calendar");
const getEventHistorySQL = require("../sql/events/getEventHistory");

// Public routes
router.get("/", homeLogic);

router.get("/about", (req, res) => {
  res.render("about", {
    title: "About Greendale",
    user: req.session.user,
    activePage: "about",
  });
});

// Auth routes
router.get("/login", loginGet);
router.post("/login", loginPost);
router.get("/logout", logout);
router.get("/register", registerGet);
router.post("/register", registerPost);

// Protected routes
router.use((req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
});

// Events Dashboard
router.get("/events", eventsLogic);

// Event Details & RSVP Management
router.get("/event/:id", eventDetailsLogic);
router.post("/event/:id/rsvp", updateRSVPLogic);

// Event Booking & Management
router.get("/events/book", bookEventGet);
router.get("/event/:id/edit", editEventGet);
router.post("/events/book", createEventPost);
router.post("/event/:id/edit", editEventPost);
router.post("/event/:id/delete", deleteEventPost);

// Calendar routes
router.get("/calendar", calendarPageLogic);
router.get("/calendar/api", calendarDayLogic);

// Event History
router.get("/events/history", async (req, res) => {
  try {
    const result = await pool.query(getEventHistorySQL(req.session.user.id));

    res.render("event-history", {
      title: "Event History",
      user: req.session.user,
      activePage: "events",
      events: result.rows,
    });
  } catch (error) {
    console.error("History error:", error);
    res.status(500).render("error", {
      title: "Error",
      user: req.session.user,
      error: "Failed to load event history",
      errorDetails: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
});

// Friends Management
router.get("/friends", (req, res) => {
  res.render("friends", {
    title: "Friends",
    user: req.session.user,
    activePage: "friends",
  });
});

// 404 Handler
router.use((req, res) => {
  res.status(404).render("404", {
    title: "404 - Page Not Found",
    user: req.session.user,
  });
});

module.exports = router;
