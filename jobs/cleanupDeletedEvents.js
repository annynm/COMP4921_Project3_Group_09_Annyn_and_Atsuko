const cron = require('node-cron');
const { pool } = require('../config/database');
const permanentlyDeleteOldEventsSQL = require('../sql/events/permanentlyDeleteOldEvents');

// Advisory lock ID for preventing duplicate executions
const LOCK_ID = 123456;

// Run cleanup job to permanently delete events that have been soft-deleted for 30 days
const runCleanup = async () => {
    const client = await pool.connect();

    try {
        // Try to acquire advisory lock to prevent duplicate execution
        const lockResult = await client.query(
            `SELECT pg_try_advisory_lock($1) as acquired`,
            [LOCK_ID]
        );

        if (!lockResult.rows[0].acquired) {
            console.log('Cleanup job already running on another instance, skipping...');
            return { success: false, message: 'Job already running', deletedCount: 0 };
        }

        console.log('Starting cleanup of deleted events (30+ days old)...');

        const result = await client.query(permanentlyDeleteOldEventsSQL());
        const deletedCount = result.rowCount;

        console.log(`Cleaned up ${deletedCount} deleted events`);

        // Release the lock
        await client.query(`SELECT pg_advisory_unlock($1)`, [LOCK_ID]);

        return { success: true, deletedCount, message: `Successfully deleted ${deletedCount} old deleted events` };
    } catch (error) {
        console.error('Error cleaning up deleted events:', error);
        // Release the lock in case of error
        try {
            await client.query(`SELECT pg_advisory_unlock($1)`, [LOCK_ID]);
        } catch (unlockError) {
            console.error('Error releasing lock:', unlockError);
        }
        throw error;
    } finally {
        client.release();
    }
};

// Schedule configuration
// Development: every 5 minutes (for testing)
// Production: daily at 2:00 AM UTC
const schedule = process.env.NODE_ENV === 'development'
    ? '*/5 * * * *'  // Every 5 minutes
    : '0 2 * * *';   // Daily at 2:00 AM UTC

// Start the scheduled job
const job = cron.schedule(schedule, runCleanup, {
    timezone: "UTC",
    scheduled: process.env.NODE_ENV !== 'test' // Disable in test environment
});

if (process.env.NODE_ENV !== 'test') {
    console.log(`Cleanup job scheduled: ${schedule === '*/5 * * * *' ? 'Every 5 minutes (development)' : 'Daily at 2:00 AM UTC (production)'}`);
}

// Run cleanup on startup if enabled (development only)
if (process.env.NODE_ENV === 'development' && process.env.RUN_CLEANUP_ON_START === 'true') {
    console.log('Development mode: Running cleanup on startup...');
    // Delay startup execution to allow server to fully initialize
    setTimeout(() => {
        runCleanup().catch(err => {
            console.error('Startup cleanup failed:', err);
        });
    }, 5000); // 5 seconds delay
}

module.exports = { runCleanup, job };

