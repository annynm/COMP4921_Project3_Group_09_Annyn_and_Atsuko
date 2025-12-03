module.exports = (eventId) => ({
    text: `
        SELECT 
            e.event_id,
            e.max_capacity,
            COUNT(rsvp.rsvp_id) FILTER (WHERE rsvp.status = 'accepted') as attending_count,
            COUNT(rsvp.rsvp_id) FILTER (WHERE rsvp.status = 'pending') as pending_count,
            COUNT(rsvp.rsvp_id) FILTER (WHERE rsvp.status IN ('pending', 'accepted')) as invited_count,
            COALESCE(
                json_agg(
                    json_build_object(
                        'user_id', rsvp.user_id,
                        'status', rsvp.status
                    )
                ) FILTER (WHERE rsvp.user_id IS NOT NULL),
                '[]'::json
            ) as invited_users
        FROM event e
        LEFT JOIN rsvp ON e.event_id = rsvp.event_id
        WHERE e.event_id = $1 AND e.is_deleted = FALSE
        GROUP BY e.event_id, e.max_capacity
    `,
    values: [eventId],
});

