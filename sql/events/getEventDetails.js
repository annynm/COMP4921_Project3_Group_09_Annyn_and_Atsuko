const getEventDetailsSQL = (eventId, userId) => {
    return `
    SELECT 
      e.*,
      u.fname as owner_fname,
      u.lname as owner_lname,
      r.room_name,
      r.capacity as room_capacity,
      COALESCE(att.attending_count, 0) as attending_count,
      COALESCE(pending.pending_count, 0) as pending_count,
      COALESCE(declined.declined_count, 0) as declined_count,
      CASE 
        WHEN e.owner_id = ${userId} THEN true
        ELSE false
      END as is_owner,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM event_admin ea 
          WHERE ea.event_id = e.event_id AND ea.user_id = ${userId}
        ) THEN true
        ELSE false
      END as is_admin,
      COALESCE(my_rsvp.status, 'pending') as user_status,
      -- Get attending users
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'user_id', attending_u.user_id,
              'fname', attending_u.fname,
              'lname', attending_u.lname
            )
          )
          FROM rsvp attending_r
          JOIN users attending_u ON attending_u.user_id = attending_r.user_id
          WHERE attending_r.event_id = e.event_id 
            AND attending_r.status = 'accepted'
        ), '[]'::json
      ) as attending_users,
      -- Get pending invites
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'user_id', pending_u.user_id,
              'fname', pending_u.fname,
              'lname', pending_u.lname
            )
          )
          FROM rsvp pending_r
          JOIN users pending_u ON pending_u.user_id = pending_r.user_id
          WHERE pending_r.event_id = e.event_id 
            AND pending_r.status = 'pending'
        ), '[]'::json
      ) as pending_invites
    FROM event e
    JOIN users u ON u.user_id = e.owner_id
    LEFT JOIN rooms r ON r.room_id = e.room_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as attending_count
      FROM rsvp
      WHERE event_id = e.event_id AND status = 'accepted'
    ) att ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as pending_count
      FROM rsvp
      WHERE event_id = e.event_id AND status = 'pending'
    ) pending ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as declined_count
      FROM rsvp
      WHERE event_id = e.event_id AND status = 'declined'
    ) declined ON true
    LEFT JOIN rsvp my_rsvp ON my_rsvp.event_id = e.event_id AND my_rsvp.user_id = ${userId}
    WHERE e.event_id = ${eventId}
      AND e.is_deleted = false;
  `;
};

module.exports = getEventDetailsSQL;
