module.exports = (userId, date) => ({
    text: `
        SELECT DISTINCT
            e.event_id,
            e.event_name,
            e.start_datetime,
            e.end_datetime,
            e.color,
            r.room_name
        FROM event e
        INNER JOIN rsvp ON e.event_id = rsvp.event_id
        LEFT JOIN rooms r ON e.room_id = r.room_id
        WHERE e.is_deleted = FALSE
        AND e.is_cancelled = FALSE
        AND rsvp.user_id = $1 
        AND rsvp.status = 'accepted'
        AND DATE(e.start_datetime) = $2
        ORDER BY e.start_datetime ASC
    `,
    values: [userId, date],
});
