const { pool } = require("../config/database");
const getUpcomingEventsSQL = require("../sql/events/getUpcomingEvents");
const getAttendingEventsSQL = require("../sql/events/getAttendingEvents");
const getAdminEventsSQL = require("../sql/events/getAdminEvents");
const getEventByIdSQL = require("../sql/events/getEventById");
const getEventForEditSQL = require("../sql/events/getEventForEdit");
const createEventSQL = require("../sql/events/createEvent");
const updateEventSQL = require("../sql/events/updateEvent");
const deleteEventSQL = require("../sql/events/deleteEvent");
const insertEventAdmin = require("../sql/event-admin/insertEventAdmin");
const upsertRSVPSQL = require("../sql/rsvp/upsertRSVP");


class Event {
  static async getUpcomingForUser(userId, limit = 20) {
    try {
      const result = await pool.query(getUpcomingEventsSQL(userId, limit));
      return result.rows;
    } catch (error) {
      console.error("Error fetching upcoming events for user:", userId, error);
      throw new Error(`Failed to fetch upcoming events: ${error.message}`);
    }
  }

  static async getAttendingForUser(userId, limit = 20) {
    try {
      const result = await pool.query(getAttendingEventsSQL(userId, limit));
      return result.rows;
    } catch (error) {
      console.error("Error fetching attending events for user:", userId, error);
      throw new Error(`Failed to fetch attending events: ${error.message}`);
    }
  }

  static async getAdminForUser(userId, limit = 20) {
    try {
      const result = await pool.query(getAdminEventsSQL(userId, limit));
      return result.rows;
    } catch (error) {
      console.error("Error fetching admin events for user:", userId, error);
      throw new Error(`Failed to fetch admin events: ${error.message}`);
    }
  }

  static async findById(eventId) {
    const result = await pool.query(getEventByIdSQL(eventId));
    return result.rows[0] || null;
  }

  static async create(eventData) {
    const result = await pool.query(createEventSQL(eventData));
    return result.rows[0];
  }

  static async insertEventAdmin(eventId, userId) {
    const result = await pool.query(insertEventAdmin(eventId, userId));
    return result.rows[0];
  }

  static async upsertRSVP(eventId, userId, status) {
    const result = await pool.query(upsertRSVPSQL(eventId, userId, status));
    return result.rows[0];
  }

  static async getForEdit(eventId, userId) {
    try {
      const result = await pool.query(getEventForEditSQL(eventId, userId));
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error fetching event for edit:", eventId, error);
      throw new Error(`Failed to fetch event for edit: ${error.message}`);
    }
  }

  static async update(eventId, eventData) {
    try {
      const result = await pool.query(updateEventSQL(eventId, eventData));
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error updating event:", eventId, error);
      throw new Error(`Failed to update event: ${error.message}`);
    }
  }

  static async delete(eventId, userId) {
    try {
      const result = await pool.query(deleteEventSQL(eventId, userId));
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error deleting event:", eventId, error);
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  }

}

module.exports = Event;
