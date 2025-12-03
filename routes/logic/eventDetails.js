const { pool } = require("../../config/database");
const getEventDetailsSQL = require("../../sql/events/getEventDetails");
const upsertRSVPSQL = require("../../sql/rsvp/upsertRSVP");
const getEventInviteInfoSQL = require("../../sql/events/getEventInviteInfo");
const createInviteSQL = require("../../sql/rsvp/createInvite");
const deleteInviteSQL = require("../../sql/rsvp/deleteInvite");

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

    const convertToUTCISO = (dateValue) => {
      if (!dateValue) return null;

      if (dateValue instanceof Date) {
        return dateValue.toISOString();
      }

      const str = String(dateValue);
      if (str.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        return str.replace(" ", "T") + "Z";
      }

      if (
        str.includes("T") ||
        str.includes("Z") ||
        str.match(/[+-]\d{2}:\d{2}$/)
      ) {
        const dateObj = new Date(str);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString();
        }
      }

      return null;
    };

    if (event.start_datetime) {
      event.start_datetime = convertToUTCISO(event.start_datetime);
    }
    if (event.end_datetime) {
      event.end_datetime = convertToUTCISO(event.end_datetime);
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

const getEventInviteInfoLogic = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.user.id;

    const eventDetailsResult = await pool.query(
      getEventDetailsSQL(eventId, userId),
    );
    const event = eventDetailsResult.rows[0];

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (!event.is_owner && !event.is_admin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to manage invites for this event",
      });
    }

    const inviteInfoResult = await pool.query(getEventInviteInfoSQL(eventId));
    const inviteInfo = inviteInfoResult.rows[0];

    if (!inviteInfo) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    let invitedUsers = [];
    if (inviteInfo.invited_users) {
      if (typeof inviteInfo.invited_users === "string") {
        invitedUsers = JSON.parse(inviteInfo.invited_users);
      } else {
        invitedUsers = inviteInfo.invited_users;
      }
    }

    const attendingCount = parseInt(inviteInfo.attending_count) || 0;
    const pendingCount = parseInt(inviteInfo.pending_count) || 0;
    const totalInvitedAndAttending = attendingCount + pendingCount;

    res.json({
      success: true,
      max_capacity: inviteInfo.max_capacity,
      attending_count: attendingCount,
      pending_count: pendingCount,
      invited_count: parseInt(inviteInfo.invited_count) || 0,
      total_invited_and_attending: totalInvitedAndAttending,
      invited_users: invitedUsers,
    });
  } catch (error) {
    console.error("Get event invite info error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load event invite info",
    });
  }
};

const createInvitesLogic = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.user.id;
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "user_ids must be a non-empty array",
      });
    }

    const eventDetailsResult = await pool.query(
      getEventDetailsSQL(eventId, userId),
    );
    const event = eventDetailsResult.rows[0];

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (!event.is_owner && !event.is_admin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to manage invites for this event",
      });
    }

    const inviteInfoResult = await pool.query(getEventInviteInfoSQL(eventId));
    const inviteInfo = inviteInfoResult.rows[0];

    if (!inviteInfo) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (inviteInfo.max_capacity !== null) {
      const attendingCount = parseInt(inviteInfo.attending_count) || 0;
      const pendingCount = parseInt(inviteInfo.pending_count) || 0;
      const newInvitesCount = user_ids.length;
      const totalAfterInvite = attendingCount + pendingCount + newInvitesCount;

      if (totalAfterInvite > inviteInfo.max_capacity) {
        return res.status(400).json({
          success: false,
          message: `Cannot invite ${newInvitesCount} friend(s). The total number of invites (${pendingCount} pending + ${attendingCount} attending) plus new invites (${newInvitesCount}) would exceed the maximum capacity of ${inviteInfo.max_capacity}.`,
        });
      }
    }

    const results = [];
    for (const invitedUserId of user_ids) {
      try {
        const result = await pool.query(
          createInviteSQL(eventId, invitedUserId, userId),
        );
        results.push(result.rows[0]);
      } catch (error) {
        console.error(
          `Error creating invite for user ${invitedUserId}:`,
          error,
        );
      }
    }

    res.json({
      success: true,
      message: `Successfully invited ${results.length} friend(s)`,
      invites: results,
    });
  } catch (error) {
    console.error("Create invites error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create invites",
    });
  }
};

const deleteInviteLogic = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.user.id;
    const { user_id: invitedUserId } = req.body;

    if (!invitedUserId) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    const eventDetailsResult = await pool.query(
      getEventDetailsSQL(eventId, userId),
    );
    const event = eventDetailsResult.rows[0];

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (!event.is_owner && !event.is_admin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to manage invites for this event",
      });
    }

    const deleteResult = await pool.query(
      deleteInviteSQL(eventId, invitedUserId),
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invite not found or already accepted/declined",
      });
    }

    res.json({
      success: true,
      message: "Invite successfully cancelled",
      deleted_invite: deleteResult.rows[0],
    });
  } catch (error) {
    console.error("Delete invite error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel invite",
    });
  }
};

module.exports = {
  eventDetailsLogic,
  updateRSVPLogic,
  getEventInviteInfoLogic,
  createInvitesLogic,
  deleteInviteLogic,
};
