const { pool } = require("../../config/database");
const getAttendingCalendarEventsSQL = require("../../sql/events/getAttendingCalendarEvents");
const getAttendingDayEventsSQL = require("../../sql/events/getAttendingDayEvents");

const calendarPageLogic = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const now = new Date();

    let year = parseInt(req.query.year, 10);
    const monthParam = req.query.month;

    if (isNaN(year)) year = now.getFullYear();

    let month;
    if (typeof monthParam === "undefined") {
      month = now.getMonth();
    } else {
      const parsedMonth = parseInt(monthParam, 10);
      if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return res.status(400).json({ error: "Invalid month (must be 1-12)" });
      }
      month = parsedMonth - 1;
    }

    const sqlMonth = month + 1;

    const result = await pool.query(
      getAttendingCalendarEventsSQL(userId, year, sqlMonth),
    );

    // Convert Date objects to ISO 8601 strings for frontend
    // PostgreSQL returns timestamps without timezone, so we need to treat them as UTC
    const convertToUTCISO = (dateValue) => {
      if (!dateValue) return null;
      
      if (dateValue instanceof Date) {
        // PostgreSQL's pg library converts timestamp without timezone to Date object
        // The Date object represents the UTC time, so toISOString() should work correctly
        return dateValue.toISOString();
      }
      
      // If it's a string like "2025-12-02 17:00:00" (from PostgreSQL without timezone),
      // treat it as UTC by appending 'Z'
      const str = String(dateValue);
      if (str.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        // Format: "YYYY-MM-DD HH:mm:ss" - treat as UTC
        return str.replace(' ', 'T') + 'Z';
      }
      
      // If it already has timezone info or is ISO format, parse it
      if (str.includes('T') || str.includes('Z') || str.match(/[+-]\d{2}:\d{2}$/)) {
        // Already in ISO format or has timezone
        const dateObj = new Date(str);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString();
        }
      }
      
      return null;
    };
    
    const events = result.rows.map(event => {
      try {
        if (event.start_datetime) {
          event.start_datetime = convertToUTCISO(event.start_datetime);
        }
        if (event.end_datetime) {
          event.end_datetime = convertToUTCISO(event.end_datetime);
        }
      } catch (err) {
        console.error('Error converting event datetime in calendarPageLogic:', err, event);
      }
      return event;
    });

    res.render("calendar", {
      title: "Calendar",
      user: req.session.user,
      activePage: "calendar",
      events: events,
      query: { year, month },
    });
  } catch (error) {
    console.error("Calendar page error:", error);
    res.status(500).render("error", {
      title: "Error",
      user: req.session.user,
      error: "Failed to load calendar",
      errorDetails: process.env.NODE_ENV === "development"
        ? {
            message: error.message,
            stack: error.stack,
          }
        : null,
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

    // PostgreSQL returns timestamps without timezone, so we need to treat them as UTC
    const convertToUTCISO = (dateValue) => {
      if (!dateValue) return null;
      
      if (dateValue instanceof Date) {
        // PostgreSQL's pg library converts timestamp without timezone to Date object
        // The Date object represents the UTC time, so toISOString() should work correctly
        return dateValue.toISOString();
      }
      
      // If it's a string like "2025-12-02 17:00:00" (from PostgreSQL without timezone),
      // treat it as UTC by appending 'Z'
      const str = String(dateValue);
      if (str.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        // Format: "YYYY-MM-DD HH:mm:ss" - treat as UTC
        return str.replace(' ', 'T') + 'Z';
      }
      
      // If it already has timezone info or is ISO format, parse it
      if (str.includes('T') || str.includes('Z') || str.match(/[+-]\d{2}:\d{2}$/)) {
        // Already in ISO format or has timezone
        const dateObj = new Date(str);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString();
        }
      }
      
      return null;
    };
    
    const eventsWithPositions = result.rows.map((event) => {
      // Convert to ISO strings for frontend
      if (event.start_datetime) {
        event.start_datetime = convertToUTCISO(event.start_datetime);
      }
      if (event.end_datetime) {
        event.end_datetime = convertToUTCISO(event.end_datetime);
      }

      // Calculate positions (frontend will recalculate in local timezone)
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

    if (isNaN(year)) {
      return res.status(400).json({ error: "Invalid year" });
    }

    let month;
    if (typeof monthParam === "undefined") {
      month = new Date().getMonth();
    } else {
      const parsedMonth = parseInt(monthParam, 10);
      if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return res.status(400).json({ error: "Invalid month (must be 1-12)" });
      }
      month = parsedMonth - 1;
    }

    const sqlMonth = month + 1;

    const result = await pool.query(
      getAttendingCalendarEventsSQL(userId, year, sqlMonth),
    );

    // Convert Date objects to ISO 8601 strings for frontend
    // PostgreSQL returns timestamps without timezone, so we need to treat them as UTC
    const convertToUTCISO = (dateValue) => {
      if (!dateValue) return null;
      
      if (dateValue instanceof Date) {
        // PostgreSQL's pg library converts timestamp without timezone to Date object
        // The Date object represents the UTC time, so toISOString() should work correctly
        return dateValue.toISOString();
      }
      
      // If it's a string like "2025-12-02 17:00:00" (from PostgreSQL without timezone),
      // treat it as UTC by appending 'Z'
      const str = String(dateValue);
      if (str.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        // Format: "YYYY-MM-DD HH:mm:ss" - treat as UTC
        return str.replace(' ', 'T') + 'Z';
      }
      
      // If it already has timezone info or is ISO format, parse it
      if (str.includes('T') || str.includes('Z') || str.match(/[+-]\d{2}:\d{2}$/)) {
        // Already in ISO format or has timezone
        const dateObj = new Date(str);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString();
        }
      }
      
      return null;
    };
    
    const events = result.rows.map(event => {
      if (event.start_datetime) {
        event.start_datetime = convertToUTCISO(event.start_datetime);
      }
      if (event.end_datetime) {
        event.end_datetime = convertToUTCISO(event.end_datetime);
      }
      return event;
    });

    res.render("partials/calendar-day-box", {
      events: events,
      year: year,
      month: month,
      query: { year, month },
      layout: false,
    });
  } catch (error) {
    console.error("Calendar grid error:", error);
    res.status(500).send("Error loading calendar");
  }
};

module.exports = { calendarPageLogic, calendarDayLogic, calendarGridLogic };
