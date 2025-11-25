const { pool } = require("../../config/database");
const Event = require("../../models/Event");

const bookEventGet = async (req, res) => {
  try {
    const { date, hour, minute } = req.query;
    let prefillData = {};

    if (date) {
      const dateObj = new Date(date);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      const h = hour ? String(hour).padStart(2, "0") : "12";
      const m = minute ? String(minute).padStart(2, "0") : "00";

      prefillData.start_datetime = `${year}-${month}-${day}T${h}:${m}`;
      const endHour = parseInt(h) + 1;
      const eh = String(endHour).padStart(2, "0");
      prefillData.end_datetime = `${year}-${month}-${day}T${eh}:${m}`;
    }

    const rooms = await pool.query(
      "SELECT room_id, room_name, capacity FROM rooms ORDER BY room_name",
    );

    res.render("event-form", {
      title: "Book New Event",
      user: req.session.user,
      pageTitle: "Book New Event",
      formAction: "/events/book",
      submitButtonText: "Book Event",
      isEditMode: false,
      formData: prefillData,
      rooms: rooms.rows,
    });
  } catch (error) {
    console.error("Book event form error:", error);
    res.status(500).render("error", {
      title: "Error",
      user: req.session.user,
      error: "Failed to load booking form",
      errorDetails: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
};

const createEventPost = async (req, res) => {
  try {
    const user = req.session.user;
    console.log(user)
    const ownerId = user.id;

    const {
      event_name,
      event_description,
      color,
      start_datetime,
      end_datetime,
      room_id,
      is_all_day,
      privacy_type,
      max_capacity,
      allow_friend_invites
    } = req.body;

    if (!event_name || !start_datetime || !end_datetime) {
      return res.status(400).send("Missing required fields");
    }

    // DB INSERT
    const createdEvent = await Event.create({
      event_name: event_name,
      owner_id: ownerId,
      event_description: event_description,
      is_recurring: false, // false for now
      room_id: room_id ? Number(room_id) : null,
      color: color || "#4287f5", // default
      is_all_day: is_all_day,
      start_datetime: start_datetime,
      end_datetime: end_datetime,
      // recurring_id: null // null for now
    });

    const eventId = createdEvent.event_id;

    // register myself as admin
    const insertedEventAdmin = await Event.insertEventAdmin(eventId, ownerId);
    console.log("inserted.")
    console.log(`${insertedEventAdmin}`)

    // set owner as attending in RSVP
    const RSVP = await Event.upsertRSVP(eventId, ownerId, "accepted");
    console.log(`upserted: ${RSVP}`)


    console.log("run this code")
    return res.redirect("/events");

  } catch (err) {
    console.error("Error creating event: ", err);
    return res.status(500).send("Failed to create event");
  }

};

const editEventGet = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.user.id;

    // Check if user has admin permission
    const event = await Event.getForEdit(eventId, userId);

    if (!event) {
      return res.status(404).render("404", {
        title: "Event Not Found",
        user: req.session.user,
      });
    }

    if (!event.can_edit) {
      return res.status(403).render("error", {
        title: "Access Denied",
        user: req.session.user,
        error: "You do not have permission to edit this event",
      });
    }

    const rooms = await pool.query(
      "SELECT room_id, room_name, capacity FROM rooms ORDER BY room_name",
    );

    res.render("event-form", {
      title: "Edit Event",
      user: req.session.user,
      pageTitle: "Edit Event",
      formAction: `/event/${eventId}/edit`,
      submitButtonText: "Update Event",
      isEditMode: true,
      formData: {
        event_name: event.event_name,
        event_description: event.event_description,
        start_datetime: event.start_datetime,
        end_datetime: event.end_datetime,
        room_id: event.room_id,
        color: event.color,
        is_all_day: event.is_all_day,
        privacy_type: event.privacy_type,
        max_capacity: event.max_capacity,
        allow_friend_invites: event.allow_friend_invites,
      },
      rooms: rooms.rows,
    });
  } catch (error) {
    console.error("Edit event form error:", error);
    res.status(500).render("error", {
      title: "Error",
      user: req.session.user,
      error: "Failed to load edit form",
      errorDetails: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
};

const editEventPost = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.user.id;

    // Check if user has admin permission
    const event = await Event.getForEdit(eventId, userId);

    if (!event || !event.can_edit) {
      return res.status(403).render("error", {
        title: "Access Denied",
        user: req.session.user,
        error: "You do not have permission to edit this event",
      });
    }

    const {
      event_name,
      event_description,
      color,
      start_datetime,
      end_datetime,
      room_id,
      is_all_day,
      privacy_type,
      max_capacity,
      allow_friend_invites,
    } = req.body;

    if (!event_name || !start_datetime || !end_datetime) {
      return res.status(400).send("Missing required fields");
    }

    // merge with the existing data
    await Event.update(eventId, {
      event_name,
      event_description: event_description !== undefined ? event_description : event.event_description,
      color: color || event.color || "#4287f5",
      start_datetime,
      end_datetime,
      room_id: room_id ? Number(room_id) : (room_id === "" ? null : event.room_id),
      is_all_day: is_all_day !== undefined
        ? (is_all_day === "on" || is_all_day === true)
        : event.is_all_day,
      privacy_type: privacy_type || event.privacy_type || 'public',
      max_capacity: max_capacity
        ? Number(max_capacity)
        : (max_capacity === "" ? null : event.max_capacity),
      allow_friend_invites: allow_friend_invites !== undefined
        ? (allow_friend_invites === "on" || allow_friend_invites === true)
        : event.allow_friend_invites,
    });

    return res.redirect(`/event/${eventId}`);
  } catch (error) {
    console.error("Error updating event:", error);
    return res.status(500).render("error", {
      title: "Error",
      user: req.session.user,
      error: "Failed to update event",
      errorDetails: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
};

const deleteEventPost = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.user.id;

    // Check if user has admin permission and delete
    const result = await Event.delete(eventId, userId);

    if (!result) {
      return res.status(403).render("error", {
        title: "Access Denied",
        user: req.session.user,
        error: "You do not have permission to delete this event, or the event does not exist",
      });
    }

    return res.redirect("/events");
  } catch (error) {
    console.error("Error deleting event:", error);
    return res.status(500).render("error", {
      title: "Error",
      user: req.session.user,
      error: "Failed to delete event",
      errorDetails: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
};

const restoreEventPost = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.user.id;

    const restoreEventSQL = require("../../sql/events/restoreEvent");
    const result = await pool.query(restoreEventSQL(eventId, userId));

    if (!result.rows[0]) {
      return res.status(403).render("error", {
        title: "Access Denied",
        user: req.session.user,
        error: "You do not have permission to restore this event, or the event does not exist",
      });
    }

    return res.redirect("/events/deleted");
  } catch (error) {
    console.error("Error restoring event:", error);
    return res.status(500).render("error", {
      title: "Error",
      user: req.session.user,
      error: "Failed to restore event",
      errorDetails: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
};

module.exports = { bookEventGet, createEventPost, editEventGet, editEventPost, deleteEventPost, restoreEventPost };
