module.exports = (eventId, eventData) => ({
    text: `
        UPDATE event
        SET 
            event_name = $2,
            event_description = $3,
            room_id = $4,
            color = $5,
            is_all_day = $6,
            start_datetime = $7,
            end_datetime = $8,
            privacy_type = $9,
            max_capacity = $10,
            allow_friend_invites = $11
        WHERE event_id = $1
        AND is_deleted = FALSE
        RETURNING *
    `,
    values: [
        eventId,
        eventData.event_name,
        eventData.event_description || null,
        eventData.room_id || null,
        eventData.color || "#4287f5",
        eventData.is_all_day || false,
        eventData.start_datetime,
        eventData.end_datetime,
        eventData.privacy_type || 'public',
        eventData.max_capacity || null,
        eventData.allow_friend_invites || false,
    ],
});

