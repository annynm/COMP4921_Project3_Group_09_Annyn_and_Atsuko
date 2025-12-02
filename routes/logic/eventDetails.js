const { pool } = require("../../config/database");
const getEventDetailsSQL = require("../../sql/events/getEventDetails");
const upsertRSVPSQL = require("../../sql/rsvp/upsertRSVP");

const eventDetailsLogic = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.user.id;

    const result = await pool.query(getEventDetailsSQL(eventId, userId));
    const event = result.rows[0];

    if (!event) {
      return res
        .status(404)
        .render("404", { title: "Event Not Found", user: req.session.user });
    }

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
    
    if (event.start_datetime) {
      event.start_datetime = convertToUTCISO(event.start_datetime);
    }
    if (event.end_datetime) {
      event.end_datetime = convertToUTCISO(event.end_datetime);
    }

    res.render("event-details", {
      title: event.event_name,
      user: req.session.user,
      event: event,
    });
  } catch (error) {
    console.error("Event details error:", error);
    res.status(500).render("error", {
      title: "Error",
      user: req.session.user,
      error: "Failed to load event details",
    });
  }
};

const updateRSVPLogic = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.user.id;
    const { status } = req.body;

    await pool.query(upsertRSVPSQL(eventId, userId, status));
    res.redirect(`/event/${eventId}`);
  } catch (error) {
    console.error("RSVP update error:", error);
    res.status(500).json({ error: "Failed to update RSVP" });
  }
};

module.exports = { eventDetailsLogic, updateRSVPLogic };
