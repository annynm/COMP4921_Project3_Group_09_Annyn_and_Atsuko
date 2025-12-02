/**
 * Timezone conversion utilities
 * Converts between UTC (database) and user's local timezone
 */

/**
 * Convert a datetime-local string (from form) in user's timezone to UTC ISO string
 * @param {string} datetimeLocal - Format: "YYYY-MM-DDTHH:mm" (no timezone info, interpreted as user's local timezone)
 * @param {string} timezone - IANA timezone string (e.g., "Asia/Tokyo", "America/New_York")
 * @returns {string} UTC ISO string (e.g., "2024-01-01T12:00:00Z")
 */
function localToUTC(datetimeLocal, timezone) {
  if (!datetimeLocal) return null;
  if (!timezone || timezone === 'UTC') {
    // Fallback: treat as UTC if no timezone provided
    return datetimeLocal + ':00Z';
  }

  // Parse the datetime-local string (YYYY-MM-DDTHH:mm format)
  const [datePart, timePart] = datetimeLocal.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);

  // Strategy: We need to find what UTC time, when displayed in the target timezone,
  // equals our target local time (year, month, day, hours, minutes)

  // Use Intl API to find the UTC time that displays as our target local time in the timezone
  // We'll use an iterative approach: start with a guess and adjust

  // Start with the local time as if it were UTC
  let guessUTC = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

  // Format this UTC date in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Iterate to find the correct UTC time (usually converges in 1-2 iterations)
  for (let i = 0; i < 5; i++) {
    const parts = formatter.formatToParts(guessUTC);
    const tzYear = parseInt(parts.find(p => p.type === 'year').value);
    const tzMonth = parseInt(parts.find(p => p.type === 'month').value) - 1;
    const tzDay = parseInt(parts.find(p => p.type === 'day').value);
    const tzHour = parseInt(parts.find(p => p.type === 'hour').value);
    const tzMinute = parseInt(parts.find(p => p.type === 'minute').value);

    // Check if we've found the correct time
    if (tzYear === year && tzMonth === month - 1 && tzDay === day &&
      tzHour === hours && tzMinute === minutes) {
      break;
    }

    // Calculate the difference
    const tzDateAsUTC = new Date(Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, 0));
    const targetAsUTC = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    const diffMs = targetAsUTC.getTime() - tzDateAsUTC.getTime();

    // Adjust the guess
    guessUTC = new Date(guessUTC.getTime() + diffMs);
  }

  return guessUTC.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Get timezone offset in minutes for a given timezone at a specific date
 * @param {string} dateStr - Date string in format "YYYY-MM-DDTHH:mm:ss"
 * @param {string} timezone - IANA timezone string
 * @returns {number} Offset in minutes (positive for west of UTC, negative for east)
 */
function getTimezoneOffset(dateStr, timezone) {
  try {
    // Create a date object from the string (treating it as UTC for calculation)
    const testDate = new Date(dateStr + 'Z');

    // Get what the time would be in UTC
    const utcTime = testDate.getTime();

    // Get what the time would be in the target timezone
    // We'll use Intl.DateTimeFormat to format the date in the target timezone
    // and then parse it back to get the offset

    // Format the UTC date in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(testDate);
    const tzYear = parseInt(parts.find(p => p.type === 'year').value);
    const tzMonth = parseInt(parts.find(p => p.type === 'month').value) - 1; // Month is 0-indexed
    const tzDay = parseInt(parts.find(p => p.type === 'day').value);
    const tzHour = parseInt(parts.find(p => p.type === 'hour').value);
    const tzMinute = parseInt(parts.find(p => p.type === 'minute').value);
    const tzSecond = parseInt(parts.find(p => p.type === 'second').value);

    // Create a date object from the timezone-formatted parts (treating as UTC)
    const tzDateAsUTC = new Date(Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, tzSecond));

    // The difference between the UTC time and the timezone time (as if it were UTC)
    // gives us the offset
    const offsetMs = utcTime - tzDateAsUTC.getTime();

    return offsetMs / (1000 * 60);
  } catch (error) {
    console.error('Error calculating timezone offset:', error);
    // Fallback: assume UTC
    return 0;
  }
}

/**
 * Convert UTC ISO string to datetime-local string in user's timezone
 * @param {string} utcISOString - UTC ISO string (e.g., "2024-01-01T12:00:00Z")
 * @param {string} timezone - IANA timezone string
 * @returns {string} datetime-local format string (e.g., "2024-01-01T21:00")
 */
function utcToLocal(utcISOString, timezone) {
  if (!utcISOString) return '';

  const date = new Date(utcISOString);

  // Use Intl.DateTimeFormat to format in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Format the date
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Format UTC date for display in user's timezone
 * @param {string} utcISOString - UTC ISO string
 * @param {string} timezone - IANA timezone string
 * @param {object} options - Formatting options
 * @returns {object} Object with formatted date and time strings
 */
function formatForDisplay(utcISOString, timezone, options = {}) {
  if (!utcISOString) return { date: '', time: '', datetime: '' };

  const date = new Date(utcISOString);

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options.dateOptions
  });

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: options.hour12 !== false,
    ...options.timeOptions
  });

  return {
    date: dateFormatter.format(date),
    time: timeFormatter.format(date),
    datetime: `${dateFormatter.format(date)} ${timeFormatter.format(date)}`
  };
}

module.exports = {
  localToUTC,
  utcToLocal,
  formatForDisplay,
  getTimezoneOffset
};

