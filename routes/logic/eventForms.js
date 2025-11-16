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

const editEventGet = async (req, res) => { };

module.exports = { bookEventGet, createEventPost, editEventGet };
