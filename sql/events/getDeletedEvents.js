// Get deleted events for a user (owned or attended), ordered by start_datetime DESC
// Convert deleted_at from UTC (stored as timestamp without time zone) to Vancouver time
module.exports = (userId, limit = 50) => ({
    text: `
        WITH attended_events AS (
            SELECT 
                e.event_id,
                e.event_name,
                e.event_description,
                e.start_datetime AT TIME ZONE 'UTC' as start_datetime,
                e.end_datetime AT TIME ZONE 'UTC' as end_datetime,
                e.privacy_type,
                e.max_capacity,
                e.deleted_at,
                TO_CHAR((e.deleted_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Vancouver', 'MM/DD/YYYY HH12:MI AM') as deleted_at_vancouver,
                r.room_name,
                u.user_name as owner_name,
                u.fname as owner_fname,
                u.lname as owner_lname,
                rsvp.status::text as user_rsvp_status,
                'attended' as event_type,
                COUNT(rsvp2.rsvp_id) FILTER (WHERE rsvp2.status = 'accepted') as attending_count
            FROM event e
            JOIN rsvp ON e.event_id = rsvp.event_id
            JOIN users u ON e.owner_id = u.user_id
            LEFT JOIN rooms r ON e.room_id = r.room_id
            LEFT JOIN rsvp rsvp2 ON e.event_id = rsvp2.event_id
            WHERE rsvp.user_id = $1
            AND e.is_deleted = TRUE
            GROUP BY e.event_id, u.user_id, r.room_id, rsvp.status, e.deleted_at, e.start_datetime, e.end_datetime
        ),
        owned_events AS (
            SELECT 
                e.event_id,
                e.event_name,
                e.event_description,
                e.start_datetime AT TIME ZONE 'UTC' as start_datetime,
                e.end_datetime AT TIME ZONE 'UTC' as end_datetime,
                e.privacy_type,
                e.max_capacity,
                e.deleted_at,
                TO_CHAR((e.deleted_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Vancouver', 'MM/DD/YYYY HH12:MI AM') as deleted_at_vancouver,
                r.room_name,
                u.user_name as owner_name,
                u.fname as owner_fname,
                u.lname as owner_lname,
                'owner' as user_rsvp_status,
                'owned' as event_type,
                COUNT(rsvp.rsvp_id) FILTER (WHERE rsvp.status = 'accepted') as attending_count
            FROM event e
            JOIN users u ON e.owner_id = u.user_id
            LEFT JOIN rooms r ON e.room_id = r.room_id
            LEFT JOIN rsvp ON e.event_id = rsvp.event_id
            WHERE e.owner_id = $1
            AND e.is_deleted = TRUE
            GROUP BY e.event_id, u.user_id, r.room_id, e.deleted_at, e.start_datetime, e.end_datetime
        ),
        deleted_events AS (
            SELECT * FROM attended_events
            UNION
            SELECT * FROM owned_events
        ),
        unique_events AS (
            SELECT DISTINCT ON (event_id) *
            FROM deleted_events
            ORDER BY event_id, 
                     CASE event_type 
                         WHEN 'owned' THEN 1 
                         ELSE 2 
                     END
        )
        SELECT * FROM unique_events
        ORDER BY start_datetime DESC
        LIMIT $2
    `,
    values: [userId, limit],
});

