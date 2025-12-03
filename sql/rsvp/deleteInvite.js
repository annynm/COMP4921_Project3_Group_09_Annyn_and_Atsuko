const deleteInviteSQL = (eventId, userId) => {
  return `
    DELETE FROM rsvp 
    WHERE event_id = ${eventId} 
    AND user_id = ${userId} 
    AND status = 'pending'
    RETURNING rsvp_id, event_id, user_id, status;
  `;
};

module.exports = deleteInviteSQL;
