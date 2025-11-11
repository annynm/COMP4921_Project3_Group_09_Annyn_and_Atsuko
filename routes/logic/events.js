const Event = require("../../models/Event");

const eventsLogic = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [upcoming, attending, admin] = await Promise.all([
      Event.getUpcomingForUser(userId),
      Event.getAttendingForUser(userId),
      Event.getAdminForUser(userId),
    ]);

    res.render("events", {
      title: "My Events",
      user: req.session.user,
      activePage: "events",
      upcomingEvents: upcoming,
      attendingEvents: attending,
      adminEvents: admin,
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
