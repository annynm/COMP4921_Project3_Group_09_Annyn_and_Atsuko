const { pool } = require("../config/database");
const getUpcomingEventsSQL = require("../sql/events/getUpcomingEvents");
const getAttendingEventsSQL = require("../sql/events/getAttendingEvents");
const getAdminEventsSQL = require("../sql/events/getAdminEvents");
const getEventByIdSQL = require("../sql/events/getEventById");
const createEventSQL = require("../sql/events/createEvent");
const insertEventAdmin = require("../sql/event-admin/insertEventAdmin");
const upsertRSVPSQL = require("../sql/rsvp/upsertRSVP");


class Event {
  static async getUpcomingForUser(userId, limit = 20) {
    try {
      const result = await pool.query(getUpcomingEventsSQL(userId, limit));
      console.log(result.rows)
      return result.rows;
    } catch (error) {
      console.error("Error fetching upcoming events for user:", userId, error);
      throw new Error(`Failed to fetch upcoming events: ${error.message}`);
    }
  }

  static async getAttendingForUser(userId, limit = 20) {
    try {
      const result = await pool.query(getAttendingEventsSQL(userId, limit));
      console.log(result)
      console.log(`attending event: ${result.rows}`)
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

}

module.exports = Event;
