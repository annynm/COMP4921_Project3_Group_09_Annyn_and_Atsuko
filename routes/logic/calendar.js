const { pool } = require("../../config/database");
const getAttendingCalendarEventsSQL = require("../../sql/events/getAttendingCalendarEvents");
const getAttendingDayEventsSQL = require("../../sql/events/getAttendingDayEvents");

const calendarPageLogic = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const now = new Date();

    // Accept month as 1-12 in the URL. Internally we use 0-11 for templates/Date().
    let year = parseInt(req.query.year, 10);
    const monthParam = req.query.month; // expected 1..12 or undefined

    if (isNaN(year)) year = now.getFullYear();

    let month; // 0-11 internally
    if (typeof monthParam === "undefined") {
      month = now.getMonth();
    } else {
      const parsedMonth = parseInt(monthParam, 10);
      // Reject month=0 and out-of-range values
      if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return res.status(400).json({ error: "Invalid month (must be 1-12)" });
      }
      month = parsedMonth - 1; // normalize to 0-11
    }

    const sqlMonth = month + 1; // 1-12 for SQL

    const result = await pool.query(
      getAttendingCalendarEventsSQL(userId, year, sqlMonth),
    );

    res.render("calendar", {
      title: "Calendar",
      user: req.session.user,
      activePage: "calendar",
      events: result.rows,
      // Pass month as 0-based to templates (they expect 0-11)
      query: { year, month },
    });
  } catch (error) {
    console.error("Calendar page error:", error);
    res.status(500).render("error", {
      title: "Error",
      user: req.session.user,
      error: "Failed to load calendar",
    });
  }
};

const calendarDayLogic = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Date parameter required" });
    }

    const result = await pool.query(getAttendingDayEventsSQL(userId, date));

    const eventsWithPositions = result.rows.map((event) => {
      const start = new Date(event.start_datetime);
      const end = new Date(event.end_datetime);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const duration = (end - start) / (1000 * 60);

      return {
        ...event,
        startMinutes,
        duration,
        top: (startMinutes / 60) * 60,
        height: (duration / 60) * 60,
      };
    });

    res.json({
      date,
      events: eventsWithPositions,
      dayName: new Date(date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    });
  } catch (error) {
    console.error("Calendar day AJAX error:", error);
    res.status(500).json({
      error: "Failed to load day events",
      details: error.message,
    });
  }
};

const calendarGridLogic = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const year = parseInt(req.query.year, 10);

    const monthParam = req.query.month;

    // Validate year and month
    if (isNaN(year)) {
      return res.status(400).json({ error: "Invalid year" });
    }

    let month; // internal 0-11
    if (typeof monthParam === "undefined") {
      month = new Date().getMonth();
    } else {
      const parsedMonth = parseInt(monthParam, 10);
      if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return res.status(400).json({ error: "Invalid month (must be 1-12)" });
      }
      month = parsedMonth - 1;
    }

    const sqlMonth = month + 1; // 1-12 for SQL

    const result = await pool.query(
      getAttendingCalendarEventsSQL(userId, year, sqlMonth),
    );

    res.render("partials/calendar-day-box", {
      events: result.rows,
      year: year,
      month: month, // pass 0-based to partials
      query: { year, month },
      layout: false,
    });
  } catch (error) {
    console.error("Calendar grid error:", error);
    res.status(500).send("Error loading calendar");
  }
};

module.exports = { calendarPageLogic, calendarDayLogic, calendarGridLogic };
