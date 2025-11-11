const { pool } = require("../config/database");
const getUpcomingEventsSQL = require("../sql/events/getUpcomingEvents");
const getAttendingEventsSQL = require("../sql/events/getAttendingEvents");
const getAdminEventsSQL = require("../sql/events/getAdminEvents");
const getEventByIdSQL = require("../sql/events/getEventById");
const createEventSQL = require("../sql/events/createEvent");

class Event {
  static async getUpcomingForUser(userId, limit = 20) {
    const result = await pool.query(getUpcomingEventsSQL(userId, limit));
    return result.rows;
  }

  static async getAttendingForUser(userId, limit = 20) {
    const result = await pool.query(getAttendingEventsSQL(userId, limit));
    return result.rows;
  }

  static async getAdminForUser(userId, limit = 20) {
    const result = await pool.query(getAdminEventsSQL(userId, limit));
    return result.rows;
  }

  static async findById(eventId) {
    const result = await pool.query(getEventByIdSQL(eventId));
    return result.rows[0] || null;
  }

  static async create(eventData) {
    const result = await pool.query(createEventSQL(eventData));
    return result.rows[0];
  }
}

module.exports = Event;
