const { pool } = require("../../config/database");
const Event = require("../../models/Event");
const checkRoomConflictSQL = require("../../sql/events/checkRoomConflict");
const checkUserTimeConflictSQL = require("../../sql/events/checkUserTimeConflict");

/**
 * Calculate recurring event dates based on the recurring type
 * @param {string} recurringType - 'daily', 'weekly', or 'monthly'
 * @param {Date} startDate - Start date of the event
 * @param {Date} endDate - End date for recurring (inclusive)
 * @returns {Date[]} Array of dates for recurring events
 */
function calculateRecurringDates(recurringType, startDate, endDate) {
  const dates = [];
  // Create date objects with time set to midnight UTC for date-only comparison
  const start = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
    0, 0, 0, 0
  ));
  const end = new Date(Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
    23, 59, 59, 999
  ));

  // Get the day of week for weekly recurrence (0 = Sunday, 6 = Saturday)
  const startDayOfWeek = start.getUTCDay();
  // Get the day of month for monthly recurrence (1-31)
  const startDayOfMonth = start.getUTCDate();

  let currentDate = new Date(start);

  // For monthly recurrence, we need to handle months that don't have the target day
  if (recurringType === 'monthly') {
    // Start from the first month
    let currentYear = start.getUTCFullYear();
    let currentMonth = start.getUTCMonth();

    while (true) {
      // Get the last day of the current month
      const lastDayOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
      // Use the target day or the last day of month, whichever is smaller
      const targetDay = Math.min(startDayOfMonth, lastDayOfMonth);

      // Create date for this month
      const monthDate = new Date(Date.UTC(currentYear, currentMonth, targetDay, 0, 0, 0, 0));

      if (monthDate > end) {
        break;
      }

      if (monthDate >= start) {
        dates.push(new Date(monthDate));
      }

      // Move to next month
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
  } else {
    // For daily and weekly, iterate day by day
    while (currentDate <= end) {
      let shouldInclude = false;

      switch (recurringType) {
        case 'daily':
          shouldInclude = true;
          break;
        case 'weekly':
          // Include if it's the same day of week
          if (currentDate.getUTCDay() === startDayOfWeek) {
            shouldInclude = true;
          }
          break;
      }

      if (shouldInclude) {
        dates.push(new Date(currentDate));
      }

      // Move to next day
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  }

  return dates;
}

const bookEventGet = async (req, res) => {
  try {
    const { date, hour, minute } = req.query;
    let prefillData = {};

    if (date) {
      const dateObj = new Date(date);
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getUTCDate()).padStart(2, "0");
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
      warnings: [],
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
    console.log(user);
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
      allow_friend_invites,
      recurring_type,
      recurring_end_date,
    } = req.body;

    if (!event_name || !start_datetime || !end_datetime) {
      return res.status(400).send("Missing required fields");
    }

    let roomCapacity = null;
    if (room_id) {
      const roomResult = await pool.query(
        "SELECT capacity FROM rooms WHERE room_id = $1",
        [room_id],
      );
      if (roomResult.rows.length > 0) {
        roomCapacity = roomResult.rows[0].capacity;
      }
    }

    let finalMaxCapacity = null;
    if (max_capacity && max_capacity !== "") {
      finalMaxCapacity = Number(max_capacity);

      if (roomCapacity !== null && finalMaxCapacity > roomCapacity) {
        return res.status(400).render("error", {
          title: "Capacity Error",
          user: req.session.user,
          error: `Event capacity (${finalMaxCapacity}) cannot exceed room capacity (${roomCapacity})`,
        });
      }
    } else if (roomCapacity !== null) {
      finalMaxCapacity = roomCapacity;
    }

    const startUTC = start_datetime + ":00Z";
    const endUTC = end_datetime + ":00Z";

    console.log("Creating event with times:");
    console.log("Form start:", start_datetime, "UTC start:", startUTC);
    console.log("Form end:", end_datetime, "UTC end:", endUTC);

    // Check if this is a recurring event
    const isRecurring = recurring_type && recurring_type !== 'none' && recurring_end_date;

    const warnings = [];

    if (isRecurring) {
      // Parse the start datetime to extract date and time components
      const startDateObj = new Date(startUTC);
      const endDateObj = new Date(endUTC);
      const recurringEndDateObj = new Date(recurring_end_date + "T00:00:00Z");

      // Calculate the duration of the event
      const eventDurationMs = endDateObj.getTime() - startDateObj.getTime();

      // Get the time components from the start datetime
      const startHours = startDateObj.getUTCHours();
      const startMinutes = startDateObj.getUTCMinutes();
      const startSeconds = startDateObj.getUTCSeconds();

      // Calculate all recurring dates
      const recurringDates = calculateRecurringDates(
        recurring_type,
        startDateObj,
        recurringEndDateObj
      );

      console.log(`Found ${recurringDates.length} recurring dates for type: ${recurring_type}`);

      // Check conflicts for each recurring date
      for (const date of recurringDates) {
        // Create datetime strings for this occurrence
        const occurrenceStart = new Date(date);
        occurrenceStart.setUTCHours(startHours, startMinutes, startSeconds, 0);
        const occurrenceEnd = new Date(occurrenceStart.getTime() + eventDurationMs);

        const occurrenceStartUTC = occurrenceStart.toISOString().replace(/\.\d{3}Z$/, 'Z');
        const occurrenceEndUTC = occurrenceEnd.toISOString().replace(/\.\d{3}Z$/, 'Z');

        // Check room conflicts
        if (room_id) {
          const roomConflictResult = await pool.query(
            checkRoomConflictSQL(room_id, occurrenceStartUTC, occurrenceEndUTC),
          );

          if (roomConflictResult.rows.length > 0) {
            // Add all conflicts, not just the first one
            for (const conflict of roomConflictResult.rows) {
              const conflictStart = new Date(conflict.start_datetime);
              const conflictEnd = new Date(conflict.end_datetime);
              const conflictDate = conflictStart.toLocaleDateString();
              const conflictTime = `${conflictStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${conflictEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

              warnings.push({
                type: "room",
                message: `Room is occupied by "${conflict.event_name}" on ${conflictDate} from ${conflictTime}`,
              });
            }
          }
        }

        // Check user time conflicts
        const userTimeConflictResult = await pool.query(
          checkUserTimeConflictSQL(ownerId, occurrenceStartUTC, occurrenceEndUTC),
        );
        if (userTimeConflictResult.rows.length > 0) {
          // Add all conflicts, not just the first one
          for (const conflict of userTimeConflictResult.rows) {
            const conflictStart = new Date(conflict.start_datetime);
            const conflictEnd = new Date(conflict.end_datetime);
            const conflictDate = conflictStart.toLocaleDateString();
            const conflictTime = `${conflictStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${conflictEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

            warnings.push({
              type: "time",
              message: `You are already attending "${conflict.event_name}" on ${conflictDate} from ${conflictTime}`,
            });
          }
        }
      }

      // If there are conflicts, return to form with warnings
      if (warnings.length > 0) {
        const rooms = await pool.query(
          "SELECT room_id, room_name, capacity FROM rooms ORDER BY room_name",
        );

        return res.render("event-form", {
          title: "Book New Event",
          user: req.session.user,
          pageTitle: "Book New Event",
          formAction: "/events/book",
          submitButtonText: "Book Event",
          isEditMode: false,
          formData: req.body,
          rooms: rooms.rows,
          warnings: warnings,
        });
      }

      // Create events for each recurring date
      for (const date of recurringDates) {
        // Create datetime strings for this occurrence
        const occurrenceStart = new Date(date);
        occurrenceStart.setUTCHours(startHours, startMinutes, startSeconds, 0);
        const occurrenceEnd = new Date(occurrenceStart.getTime() + eventDurationMs);

        const occurrenceStartUTC = occurrenceStart.toISOString().replace(/\.\d{3}Z$/, 'Z');
        const occurrenceEndUTC = occurrenceEnd.toISOString().replace(/\.\d{3}Z$/, 'Z');

        const createdEvent = await Event.create({
          event_name: event_name,
          owner_id: ownerId,
          event_description: event_description,
          is_recurring: true,
          room_id: room_id ? Number(room_id) : null,
          color: color || "#4287f5",
          is_all_day: is_all_day,
          start_datetime: occurrenceStartUTC,
          end_datetime: occurrenceEndUTC,
          privacy_type: privacy_type || "public",
          max_capacity: finalMaxCapacity,
          allow_friend_invites:
            allow_friend_invites === "on" || allow_friend_invites === true,
        });

        const eventId = createdEvent.event_id;

        await Event.insertEventAdmin(eventId, ownerId);
        await Event.upsertRSVP(eventId, ownerId, "accepted");
      }

      console.log(`Created ${recurringDates.length} recurring events`);
      return res.redirect("/events");
    } else {
      // Non-recurring event - use existing logic
      if (room_id) {
        const roomConflictResult = await pool.query(
          checkRoomConflictSQL(room_id, startUTC, endUTC),
        );

        if (roomConflictResult.rows.length > 0) {
          // Add all conflicts, not just the first one
          for (const conflict of roomConflictResult.rows) {
            const conflictStart = new Date(conflict.start_datetime);
            const conflictEnd = new Date(conflict.end_datetime);
            const conflictTime = `${conflictStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${conflictEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

            warnings.push({
              type: "room",
              message: `Room is occupied by "${conflict.event_name}" from ${conflictTime}`,
            });
          }
        }
      }

      const userTimeConflictResult = await pool.query(
        checkUserTimeConflictSQL(ownerId, startUTC, endUTC),
      );
      if (userTimeConflictResult.rows.length > 0) {
        // Add all conflicts, not just the first one
        for (const conflict of userTimeConflictResult.rows) {
          const conflictStart = new Date(conflict.start_datetime);
          const conflictEnd = new Date(conflict.end_datetime);
          const conflictTime = `${conflictStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${conflictEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

          warnings.push({
            type: "time",
            message: `You are already attending "${conflict.event_name}" from ${conflictTime}`,
          });
        }
      }

      if (warnings.length > 0) {
        const rooms = await pool.query(
          "SELECT room_id, room_name, capacity FROM rooms ORDER BY room_name",
        );

        return res.render("event-form", {
          title: "Book New Event",
          user: req.session.user,
          pageTitle: "Book New Event",
          formAction: "/events/book",
          submitButtonText: "Book Event",
          isEditMode: false,
          formData: req.body,
          rooms: rooms.rows,
          warnings: warnings,
        });
      }

      const createdEvent = await Event.create({
        event_name: event_name,
        owner_id: ownerId,
        event_description: event_description,
        is_recurring: false,
        room_id: room_id ? Number(room_id) : null,
        color: color || "#4287f5",
        is_all_day: is_all_day,
        start_datetime: startUTC,
        end_datetime: endUTC,
        privacy_type: privacy_type || "public",
        max_capacity: finalMaxCapacity,
        allow_friend_invites:
          allow_friend_invites === "on" || allow_friend_invites === true,
      });

      const eventId = createdEvent.event_id;

      const insertedEventAdmin = await Event.insertEventAdmin(eventId, ownerId);
      console.log("inserted.");
      console.log(`${insertedEventAdmin}`);

      const RSVP = await Event.upsertRSVP(eventId, ownerId, "accepted");
      console.log(`upserted: ${RSVP}`);

      console.log("run this code");
      return res.redirect("/events");
    }
  } catch (err) {
    console.error("Error creating event: ", err);
    return res.status(500).send("Failed to create event");
  }
};

const editEventGet = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.user.id;

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

    const formatForForm = (dateValue) => {
      if (!dateValue) return "";
      const date = new Date(dateValue);
      const pad = (n) => n.toString().padStart(2, "0");
      return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
    };

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
        start_datetime: formatForForm(event.start_datetime),
        end_datetime: formatForForm(event.end_datetime),
        room_id: event.room_id,
        color: event.color,
        is_all_day: event.is_all_day,
        privacy_type: event.privacy_type,
        max_capacity: event.max_capacity,
        allow_friend_invites: event.allow_friend_invites,
      },
      rooms: rooms.rows,
      warnings: [],
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

    let roomCapacity = null;
    if (room_id) {
      const roomResult = await pool.query(
        "SELECT capacity FROM rooms WHERE room_id = $1",
        [room_id],
      );
      if (roomResult.rows.length > 0) {
        roomCapacity = roomResult.rows[0].capacity;
      }
    }

    let finalMaxCapacity = null;
    if (max_capacity && max_capacity !== "") {
      finalMaxCapacity = Number(max_capacity);

      if (roomCapacity !== null && finalMaxCapacity > roomCapacity) {
        return res.status(400).render("error", {
          title: "Capacity Error",
          user: req.session.user,
          error: `Event capacity (${finalMaxCapacity}) cannot exceed room capacity (${roomCapacity})`,
        });
      }
    } else if (roomCapacity !== null) {
      finalMaxCapacity = roomCapacity;
    }

    const startUTC = start_datetime + ":00Z";
    const endUTC = end_datetime + ":00Z";

    console.log("Updating event with times:");
    console.log("Form start:", start_datetime, "UTC start:", startUTC);
    console.log("Form end:", end_datetime, "UTC end:", endUTC);

    const warnings = [];

    if (room_id) {
      const roomConflictResult = await pool.query(
        checkRoomConflictSQL(room_id, startUTC, endUTC, eventId),
      );

      if (roomConflictResult.rows.length > 0) {
        // Add all conflicts, not just the first one
        for (const conflict of roomConflictResult.rows) {
          const conflictStart = new Date(conflict.start_datetime);
          const conflictEnd = new Date(conflict.end_datetime);
          const conflictTime = `${conflictStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${conflictEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

          warnings.push({
            type: "room",
            message: `Room is occupied by "${conflict.event_name}" from ${conflictTime}`,
          });
        }
      }
    }

    const userTimeConflictResult = await pool.query(
      checkUserTimeConflictSQL(userId, startUTC, endUTC, eventId),
    );
    if (userTimeConflictResult.rows.length > 0) {
      // Add all conflicts, not just the first one
      for (const conflict of userTimeConflictResult.rows) {
        const conflictStart = new Date(conflict.start_datetime);
        const conflictEnd = new Date(conflict.end_datetime);
        const conflictTime = `${conflictStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${conflictEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

        warnings.push({
          type: "time",
          message: `You are already attending "${conflict.event_name}" from ${conflictTime}`,
        });
      }
    }

    if (warnings.length > 0) {
      const rooms = await pool.query(
        "SELECT room_id, room_name, capacity FROM rooms ORDER BY room_name",
      );

      const formatForForm = (dateValue) => {
        if (!dateValue) return "";
        const date = new Date(dateValue);
        const pad = (n) => n.toString().padStart(2, "0");
        return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
      };

      return res.render("event-form", {
        title: "Edit Event",
        user: req.session.user,
        pageTitle: "Edit Event",
        formAction: `/event/${eventId}/edit`,
        submitButtonText: "Update Event",
        isEditMode: true,
        formData: {
          event_name: event_name,
          event_description: event_description,
          start_datetime: start_datetime,
          end_datetime: end_datetime,
          room_id: room_id,
          color: color,
          is_all_day: is_all_day,
          privacy_type: privacy_type,
          max_capacity: max_capacity,
          allow_friend_invites: allow_friend_invites,
        },
        rooms: rooms.rows,
        warnings: warnings,
      });
    }

    await Event.update(eventId, {
      event_name,
      event_description:
        event_description !== undefined
          ? event_description
          : event.event_description,
      color: color || event.color || "#4287f5",
      start_datetime: startUTC,
      end_datetime: endUTC,
      room_id: room_id
        ? Number(room_id)
        : room_id === ""
          ? null
          : event.room_id,
      is_all_day:
        is_all_day !== undefined
          ? is_all_day === "on" || is_all_day === true
          : event.is_all_day,
      privacy_type: privacy_type || event.privacy_type || "public",
      max_capacity: finalMaxCapacity,
      allow_friend_invites:
        allow_friend_invites !== undefined
          ? allow_friend_invites === "on" || allow_friend_invites === true
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

    const result = await Event.delete(eventId, userId);

    if (!result) {
      return res.status(403).render("error", {
        title: "Access Denied",
        user: req.session.user,
        error:
          "You do not have permission to delete this event, or the event does not exist",
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
        error:
          "You do not have permission to restore this event, or the event does not exist",
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

module.exports = {
  bookEventGet,
  createEventPost,
  editEventGet,
  editEventPost,
  deleteEventPost,
  restoreEventPost,
};
