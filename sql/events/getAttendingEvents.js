module.exports = (userId, limit = 20) => ({
    text: `
        WITH attending_events AS (
            SELECT e.event_id
            FROM event e
            INNER JOIN rsvp ON e.event_id = rsvp.event_id AND rsvp.user_id = $1 AND rsvp.status = 'accepted'
            WHERE e.end_datetime > NOW()
            AND e.is_deleted = FALSE  -- missing
            AND e.is_cancelled = FALSE  -- missing
        )

        SELECT
            e.event_id,
            e.event_name,
            e.event_description,
            e.start_datetime AT TIME ZONE 'UTC' as start_datetime,
            e.end_datetime AT TIME ZONE 'UTC' as end_datetime,
            r.room_name,
            COUNT(*) AS attending_count
        FROM event e
        INNER JOIN attending_events ae ON e.event_id = ae.event_id
        INNER JOIN rsvp ON e.event_id = rsvp.event_id AND rsvp.status = 'accepted'
        LEFT JOIN rooms r ON e.room_id = r.room_id
        GROUP BY
            e.event_id,
            e.event_name,
            e.event_description,
            e.start_datetime,
            e.end_datetime,
            r.room_name
        ORDER BY e.start_datetime ASC
        LIMIT $2
    `,
    values: [userId, limit],
});
