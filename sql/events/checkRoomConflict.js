module.exports = (roomId, startUTC, endUTC, excludeEventId = null) => {
    const values = [roomId, startUTC, endUTC];
    let query = `
        SELECT event_name, start_datetime, end_datetime 
        FROM event 
        WHERE room_id = $1 
        AND is_deleted = FALSE 
        AND is_cancelled = FALSE
        AND (
            (start_datetime < $3 AND end_datetime > $2) OR
            (start_datetime >= $2 AND start_datetime < $3) OR
            (end_datetime > $2 AND end_datetime <= $3)
        )
    `;

    if (excludeEventId) {
        query += ` AND event_id != $4`;
        values.push(excludeEventId);
    }

    return { text: query, values };
};
