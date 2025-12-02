/**
 * Day.js setup and timezone utilities
 * This file should be loaded after Day.js and its plugins from CDN
 */

// Wait for Day.js to be available
if (typeof dayjs !== 'undefined') {
  // Extend Day.js with UTC and timezone plugins
  if (typeof dayjs_plugin_utc !== 'undefined') {
    dayjs.extend(dayjs_plugin_utc);
  }
  if (typeof dayjs_plugin_timezone !== 'undefined') {
    dayjs.extend(dayjs_plugin_timezone);
  }

  /**
   * Get user's timezone
   * @returns {string} IANA timezone string (e.g., "America/Los_Angeles")
   */
  window.getUserTimezone = function() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.error('Error detecting timezone:', error);
      return 'UTC';
    }
  };

  /**
   * Convert local datetime-local string to UTC ISO string
   * @param {string} localDateTime - Format: "YYYY-MM-DDTHH:mm" (local timezone)
   * @returns {string} UTC ISO string (e.g., "2025-12-02T16:00:00Z")
   */
  window.localToUTC = function(localDateTime) {
    if (!localDateTime) return null;
    const timezone = getUserTimezone();
    // Parse local time and convert to UTC
    return dayjs.tz(localDateTime, timezone).utc().format('YYYY-MM-DDTHH:mm:ss[Z]');
  };

  /**
   * Convert UTC ISO string to local datetime-local string
   * @param {string} utcISOString - UTC ISO string (e.g., "2025-12-02T16:00:00Z")
   * @returns {string} datetime-local format string (e.g., "2025-12-02T08:00")
   */
  window.utcToLocal = function(utcISOString) {
    if (!utcISOString) return '';
    const timezone = getUserTimezone();
    // Parse UTC time and convert to local timezone
    return dayjs.utc(utcISOString).tz(timezone).format('YYYY-MM-DDTHH:mm');
  };

  /**
   * Format UTC date for display in local timezone
   * @param {string} utcISOString - UTC ISO string
   * @param {object} options - Formatting options
   * @returns {object} Object with formatted date and time strings
   */
  window.formatForDisplay = function(utcISOString, options = {}) {
    if (!utcISOString) return { date: '', time: '', datetime: '' };
    const timezone = getUserTimezone();
    const date = dayjs.utc(utcISOString).tz(timezone);

    return {
      date: date.format(options.dateFormat || 'MMMM D, YYYY'),
      time: date.format(options.timeFormat || 'h:mm A'),
      datetime: date.format(options.datetimeFormat || 'MMMM D, YYYY h:mm A'),
      dateShort: date.format('MMM D, YYYY'),
      timeShort: date.format('HH:mm'),
    };
  };
} else {
  console.error('Day.js is not loaded. Please include Day.js and plugins before this script.');
}

