const { pool } = require("../../config/database");
const getCalendarEventsSQL = require("../../sql/events/getCalendarEvents");
const getDayEventsSQL = require("../../sql/events/getDayEvents");

const calendarPageLogic = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth();

    if (month < 0 || month > 11) {
      return res.status(400).json({ error: "Invalid month" });
    }

    const result = await pool.query(getCalendarEventsSQL(userId, year, month));

    res.render("calendar", {
      title: "Calendar",
      user: req.session.user,
      activePage: "calendar",
      events: result.rows,
      query: { year, month },
    });
  } catch (error) {
    console.error("Calendar page error:", error);
    res.status(500).render("error", {
      title: "Error",
      user: req.session.user,
      error: "Failed to load calendar",
      errorDetails: {
        message: error.message,
        stack: error.stack,
      },
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

    const result = await pool.query(getDayEventsSQL(userId, date));

    const eventsWithPositions = result.rows.map((event) => {
      const start = new Date(event.start_datetime);
      const end = new Date(event.end_datetime);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const duration = (end - start) / (1000 * 60); // minutes

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

module.exports = { calendarPageLogic, calendarDayLogic };
