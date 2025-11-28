module.exports = (userId, startUTC, endUTC, excludeEventId = null) => {
    const values = [userId, startUTC, endUTC];
    let query = `
        SELECT e.event_name, e.start_datetime, e.end_datetime 
        FROM event e
        INNER JOIN rsvp r ON e.event_id = r.event_id
        WHERE r.user_id = $1 
        AND r.status = 'accepted'
        AND e.is_deleted = FALSE 
        AND e.is_cancelled = FALSE
        AND (
            (e.start_datetime < $3 AND e.end_datetime > $2) OR
            (e.start_datetime >= $2 AND e.start_datetime < $3) OR
            (e.end_datetime > $2 AND e.end_datetime <= $3)
        )
    `;

    if (excludeEventId) {
        query += ` AND e.event_id != $4`;
        values.push(excludeEventId);
    }

    return { text: query, values };
};
