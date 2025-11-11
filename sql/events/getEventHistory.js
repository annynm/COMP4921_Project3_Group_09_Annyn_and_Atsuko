module.exports = (userId, limit = 50) => ({
    text: `
        WITH past_events AS (
            SELECT 
                e.event_id,
                e.event_name,
                e.event_description,
                e.start_datetime,
                e.end_datetime,
                e.privacy_type,
                e.max_capacity,
                r.room_name,
                u.user_name as owner_name,
                u.fname as owner_fname,
                u.lname as owner_lname,
                rsvp.status as user_rsvp_status,
                COUNT(rsvp2.rsvp_id) FILTER (WHERE rsvp2.status = 'accepted') as attending_count
            FROM event e
            JOIN rsvp ON e.event_id = rsvp.event_id
            JOIN users u ON e.owner_id = u.user_id
            LEFT JOIN rooms r ON e.room_id = r.room_id
            LEFT JOIN rsvp rsvp2 ON e.event_id = rsvp2.event_id
            WHERE rsvp.user_id = $1
            AND e.is_deleted = FALSE
            AND e.is_cancelled = FALSE
            AND e.end_datetime < NOW()
            GROUP BY e.event_id, u.user_id, r.room_id, rsvp.status
            ORDER BY e.start_datetime DESC
            LIMIT $2
        )
        SELECT * FROM past_events
    `,
    values: [userId, limit],
});
