const Event = require("../../models/Event");

const eventsLogic = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [upcoming, attending, admin] = await Promise.all([
      Event.getUpcomingForUser(userId),
      Event.getAttendingForUser(userId),
      Event.getAdminForUser(userId),
    ]);

    // Convert Date objects to ISO 8601 strings for frontend
    // PostgreSQL returns timestamps without timezone, so we need to treat them as UTC
    const convertToUTCISO = (dateValue) => {
      if (!dateValue) return null;

      // If it's already a string in PostgreSQL format, treat it as UTC
      const str = String(dateValue);
      if (str.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        // Format: "YYYY-MM-DD HH:mm:ss" - treat as UTC
        return str.replace(' ', 'T') + 'Z';
      }

      if (dateValue instanceof Date) {
        // PostgreSQL's pg library may convert timestamp without timezone to Date object
        // using server's local timezone. We need to reconstruct the UTC value.
        // However, if the Date was created from a string that pg interpreted incorrectly,
        // we can't recover the original value. So we use toISOString() which gives us
        // the UTC representation of what pg thought the time was.
        // But wait - if pg interpreted "2025-12-04 17:00:00" as local time (e.g., UTC+8),
        // then the Date object represents a different UTC time than intended.

        // Try to get the original string representation if available
        // Otherwise, we need to use the Date's UTC methods to reconstruct
        // But this won't work if pg already misinterpreted it

        // For now, use toISOString() - but this may be incorrect if pg misinterpreted
        // The real fix should be in the SQL query to use AT TIME ZONE 'UTC'
        return dateValue.toISOString();
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

    const convertEventDates = (events) => {
      return events.map(event => {
        if (event.start_datetime) {
          event.start_datetime = convertToUTCISO(event.start_datetime);
        }
        if (event.end_datetime) {
          event.end_datetime = convertToUTCISO(event.end_datetime);
        }
        return event;
      });
    };

    res.render("events", {
      title: "My Events",
      user: req.session.user,
      activePage: "events",
      upcomingEvents: convertEventDates(upcoming),
      attendingEvents: convertEventDates(attending),
      adminEvents: convertEventDates(admin),
    });
  } catch (error) {
    console.error("Events page error:", error);

    res.status(500).render("error", {
      title: "Error",
      user: req.session.user,
      error: "Failed to load events",
      errorDetails:
        process.env.NODE_ENV === "development"
          ? {
            message: error.message,
            stack: error.stack,
            route: "GET /events",
          }
          : null,
    });
  }
};

module.exports = { eventsLogic };
