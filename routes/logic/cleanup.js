const { runCleanup } = require('../../jobs/cleanupDeletedEvents');

/**
 * Manual cleanup endpoint for development/testing
 * Only available in development environment
 */
const cleanupDeletedEvents = async (req, res) => {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            success: false,
            error: 'This endpoint is only available in development environment'
        });
    }

    try {
        const result = await runCleanup();

        res.json({
            success: result.success,
            deletedCount: result.deletedCount,
            message: result.message
        });
    } catch (error) {
        console.error('Error in manual cleanup:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = { cleanupDeletedEvents };

