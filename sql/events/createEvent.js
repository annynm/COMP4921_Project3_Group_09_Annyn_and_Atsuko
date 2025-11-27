module.exports = (eventData) => ({
    text: `
        INSERT INTO event (
            event_name, 
            owner_id, 
            event_description, 
            is_recurring, 
            room_id, 
            color, 
            is_all_day, 
            start_datetime, 
            end_datetime,
            privacy_type,
            max_capacity,
            allow_friend_invites
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
    `,
    values: [
        eventData.event_name,
        eventData.owner_id,
        eventData.event_description || null,
        eventData.is_recurring || false,
        eventData.room_id || null,
        eventData.color || "#4287f5",
        eventData.is_all_day || false,
        eventData.start_datetime,
        eventData.end_datetime,
        eventData.privacy_type || "public",
        eventData.max_capacity || null,
        eventData.allow_friend_invites || false,
    ],
});
