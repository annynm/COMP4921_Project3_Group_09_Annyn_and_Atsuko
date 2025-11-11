const { pool } = require("../../config/database");

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

const editEventGet = async (req, res) => { };

module.exports = { bookEventGet, editEventGet };
