const User = require("../../models/User");
const { pool } = require("../../config/database");
const createFriendshipRequestSQL = require("../../sql/friendship/createFriendshipRequest");
const getUserByUsernameSQL = require("../../sql/users/getUserByUsername");
const getPendingRequestsSQL = require("../../sql/friendship/getPendingRequests");
const getOutgoingRequestsSQL = require("../../sql/friendship/getOutgoingRequests");
const getAcceptedFriendsSQL = require("../../sql/friendship/getAcceptedFriends");
const updateFriendshipStatusSQL = require("../../sql/friendship/updateFriendshipStatus");
const updateFriendshipToPendingSQL = require("../../sql/friendship/updateFriendshipToPending");

// GET /friends/check-username - Check if the user exists.
const checkUsername = async (req, res) => {
    try {
        const { username } = req.query;

        if (!username || username.trim() === "") {
            return res.json({ exists: false, message: "" });
        }

        // 自分自身のusernameは除外
        if (username === req.session.user.username) {
            return res.json({ exists: false, message: "Cannot send request to yourself" });
        }

        const result = await pool.query(getUserByUsernameSQL(username.trim()));
        const user = result.rows[0];

        if (user) {
            return res.json({ exists: true, message: "User found" });
        } else {
            return res.json({ exists: false, message: "User not found" });
        }
    } catch (error) {
        console.error("Error checking username:", error);
        return res.status(500).json({ exists: false, message: "Error checking username" });
    }
};

// POST /friends/request - Send a friend request.
const sendFriendRequest = async (req, res) => {
    try {
        const { username } = req.body;
        const requestorId = req.session.user.id;

        if (!username || username.trim() === "") {
            return res.status(400).json({ success: false, message: "Username is required" });
        }

        // can't send to self
        if (username === req.session.user.username) {
            return res.status(400).json({ success: false, message: "Cannot send request to yourself" });
        }

        // search for the user
        const result = await pool.query(getUserByUsernameSQL(username.trim()));
        const receiver = result.rows[0];

        if (!receiver) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const receiverId = receiver.user_id;

        // Check for existing friendship
        const existingRequest = await pool.query(
            `SELECT * FROM friendship 
               WHERE (requestor_id = $1 AND receiver_id = $2) 
               OR (requestor_id = $2 AND receiver_id = $1)`
            , [requestorId, receiverId]
        );

        if (existingRequest.rows.length > 0) {
            const existing = existingRequest.rows[0];
            if (existing.status === 'pending') {
                return res.status(400).json({
                    success: false,
                    message: "Friend request already exists"
                });
            }
            if (existing.status === 'accepted') {
                return res.status(400).json({
                    success: false,
                    message: "You are already friends"
                });
            }
            // If status is 'blocked' or 'declined', update the existing record to 'pending'
            if (existing.status === 'blocked' || existing.status === 'declined') {
                const updateResult = await pool.query(
                    updateFriendshipToPendingSQL(existing.friendship_id, requestorId, receiverId)
                );
                return res.json({
                    success: true,
                    message: "Friend request sent successfully",
                    friendship: updateResult.rows[0]
                });
            }
        }

        // create a new request
        const insertResult = await pool.query(
            createFriendshipRequestSQL(requestorId, receiverId)
        );

        return res.json({
            success: true,
            message: "Friend request sent successfully",
            friendship: insertResult.rows[0]
        });
    } catch (error) {
        console.error("Error sending friend request:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send friend request"
        });
    }
};

// GET /friends/pending - Get pending friend requests received by the user
const getPendingRequests = async (req, res) => {
    try {
        const receiverId = req.session.user.id;
        const result = await pool.query(getPendingRequestsSQL(receiverId));
        return res.json({ success: true, requests: result.rows });
    } catch (error) {
        console.error("Error fetching pending requests:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch pending requests",
            requests: []
        });
    }
};

// GET /friends/outgoing - Get outgoing friend requests sent by the user
const getOutgoingRequests = async (req, res) => {
    try {
        const requestorId = req.session.user.id;
        const result = await pool.query(getOutgoingRequestsSQL(requestorId));
        return res.json({ success: true, requests: result.rows });
    } catch (error) {
        console.error("Error fetching outgoing requests:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch outgoing requests",
            requests: []
        });
    }
};

// GET /friends/accepted - Get accepted friends (both requested and received)
const getAcceptedFriends = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const result = await pool.query(getAcceptedFriendsSQL(userId));
        return res.json({ success: true, friends: result.rows });
    } catch (error) {
        console.error("Error fetching accepted friends:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch accepted friends",
            friends: []
        });
    }
};

// POST /friends/accept/:id - Accept a friend request
const acceptFriendship = async (req, res) => {
    try {
        const friendshipId = parseInt(req.params.id);
        const receiverId = req.session.user.id;

        if (isNaN(friendshipId)) {
            return res.status(400).json({ success: false, message: "Invalid friendship ID" });
        }

        const result = await pool.query(
            updateFriendshipStatusSQL(friendshipId, receiverId, 'accepted')
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Friend request not found or already processed"
            });
        }

        return res.json({
            success: true,
            message: "Friend request accepted successfully",
            friendship: result.rows[0]
        });
    } catch (error) {
        console.error("Error accepting friend request:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to accept friend request"
        });
    }
};

// POST /friends/decline/:id - Decline a friend request
const declineFriendship = async (req, res) => {
    try {
        const friendshipId = parseInt(req.params.id);
        const receiverId = req.session.user.id;

        if (isNaN(friendshipId)) {
            return res.status(400).json({ success: false, message: "Invalid friendship ID" });
        }

        const result = await pool.query(
            updateFriendshipStatusSQL(friendshipId, receiverId, 'declined')
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Friend request not found or already processed"
            });
        }

        return res.json({
            success: true,
            message: "Friend request declined successfully",
            friendship: result.rows[0]
        });
    } catch (error) {
        console.error("Error declining friend request:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to decline friend request"
        });
    }
};

// POST /friends/cancel/:id - Cancel a friend request
const cancelFriendship = async (req, res) => {
    try {
        const friendshipId = parseInt(req.params.id);
        const requestorId = req.session.user.id;

        if (isNaN(friendshipId)) {
            return res.status(400).json({ success: false, message: "Invalid friendship ID" });
        }

        const result = await pool.query(
            updateFriendshipStatusSQL.cancel(friendshipId, requestorId)
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Friend request not found or already processed"
            });
        }

        return res.json({
            success: true,
            message: "Friend request cancelled successfully",
            friendship: result.rows[0]
        });
    } catch (error) {
        console.error("Error cancelling friend request:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to cancel friend request"
        });
    }
};

module.exports = {
    checkUsername,
    sendFriendRequest,
    getPendingRequests,
    getOutgoingRequests,
    getAcceptedFriends,
    acceptFriendship,
    declineFriendship,
    cancelFriendship,
};

