module.exports = (eventData) => ({
    text: `
        WITH new_event AS (
            INSERT INTO event (
                event_name,
                owner_id,
                event_description,
                start_datetime,
                end_datetime,
                privacy_type,
                max_capacity,
                room_id,
                color,
                is_all_day,
                allow_friend_invites
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        )
        SELECT * FROM new_event
    `,
    values: [
        eventData.event_name,
        eventData.owner_id,
        eventData.event_description || null,
        eventData.start_datetime,
        eventData.end_datetime,
        eventData.privacy_type || "public",
        eventData.max_capacity || null,
        eventData.room_id || null,
        eventData.color || null,
        eventData.is_all_day || false,
        eventData.allow_friend_invites !== false,
    ],
});
