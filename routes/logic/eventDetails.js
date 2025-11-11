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
