/**
 * Schedule configuration validator
 * Validates schedule.json structure and rule configurations
 */

import { DateTime } from 'luxon';

/**
 * Validate a complete schedule configuration
 * @param {Object} schedule - Schedule configuration to validate
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateSchedule(schedule) {
  const errors = [];

  // Basic structure validation
  if (!schedule || typeof schedule !== 'object') {
    return { valid: false, errors: ['Schedule must be an object'] };
  }

  // Version validation
  if (schedule.version !== 1) {
    errors.push('Schedule version must be 1');
  }

  // Timezone validation
  if (!schedule.timezone) {
    errors.push('Schedule must specify a timezone');
  } else if (!isValidTimezone(schedule.timezone)) {
    errors.push(`Invalid timezone: ${schedule.timezone}`);
  }

  // Rules validation
  if (!schedule.rules || !Array.isArray(schedule.rules)) {
    errors.push('Schedule must contain a rules array');
  } else if (schedule.rules.length === 0) {
    errors.push('Schedule must contain at least one rule');
  } else {
    // Validate each rule
    schedule.rules.forEach((rule, index) => {
      const ruleErrors = validateRule(rule);
      ruleErrors.forEach(error => {
        errors.push(`Rule ${index + 1}: ${error}`);
      });
    });

    // Check for duplicate rule IDs
    const ruleIds = schedule.rules.map(rule => rule.id).filter(Boolean);
    const duplicateIds = ruleIds.filter((id, index) => ruleIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate rule IDs found: ${duplicateIds.join(', ')}`);
    }
  }

  // Options validation (optional section)
  if (schedule.options) {
    const optionErrors = validateOptions(schedule.options);
    optionErrors.forEach(error => {
      errors.push(`Options: ${error}`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single rule configuration
 * @param {Object} rule - Rule to validate
 * @returns {Array} Array of validation errors
 */
export function validateRule(rule) {
  const errors = [];

  if (!rule || typeof rule !== 'object') {
    return ['Rule must be an object'];
  }

  // ID validation (optional but recommended)
  if (rule.id && typeof rule.id !== 'string') {
    errors.push('Rule ID must be a string');
  }

  // Type validation
  if (!rule.type) {
    errors.push('Rule must specify a type');
  } else if (!['weekly', 'every_n_days', 'dates'].includes(rule.type)) {
    errors.push(`Invalid rule type: ${rule.type}. Must be 'weekly', 'every_n_days', or 'dates'`);
  }

  // Time validation (optional)
  if (rule.time && !isValidTime(rule.time)) {
    errors.push(`Invalid time format: ${rule.time}. Must be HH:MM format`);
  }

  // Status validation
  if (!rule.status) {
    errors.push('Rule must specify a status');
  } else {
    const statusErrors = validateStatus(rule.status);
    statusErrors.forEach(error => {
      errors.push(`Status: ${error}`);
    });
  }

  // Type-specific validation
  switch (rule.type) {
    case 'weekly':
      errors.push(...validateWeeklyRule(rule));
      break;
    case 'every_n_days':
      errors.push(...validateIntervalRule(rule));
      break;
    case 'dates':
      errors.push(...validateDateRule(rule));
      break;
  }

  return errors;
}

/**
 * Validate weekly rule specific properties
 * @param {Object} rule - Weekly rule to validate
 * @returns {Array} Array of validation errors
 */
function validateWeeklyRule(rule) {
  const errors = [];

  if (!rule.days || !Array.isArray(rule.days)) {
    errors.push('Weekly rule must have a days array');
  } else {
    const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const invalidDays = rule.days.filter(day => !validDays.includes(day));

    if (invalidDays.length > 0) {
      errors.push(`Invalid days: ${invalidDays.join(', ')}. Must be: ${validDays.join(', ')}`);
    }

    if (rule.days.length === 0) {
      errors.push('Weekly rule must specify at least one day');
    }

    // Check for duplicates
    const uniqueDays = [...new Set(rule.days)];
    if (uniqueDays.length !== rule.days.length) {
      errors.push('Weekly rule contains duplicate days');
    }
  }

  // only_weekdays validation
  if (rule.only_weekdays !== undefined && typeof rule.only_weekdays !== 'boolean') {
    errors.push('only_weekdays must be a boolean');
  }

  return errors;
}

/**
 * Validate interval rule specific properties
 * @param {Object} rule - Interval rule to validate
 * @returns {Array} Array of validation errors
 */
function validateIntervalRule(rule) {
  const errors = [];

  if (!rule.start_date) {
    errors.push('Interval rule must specify start_date');
  } else if (!isValidISODate(rule.start_date)) {
    errors.push(`Invalid start_date format: ${rule.start_date}. Must be YYYY-MM-DD`);
  }

  if (rule.interval_days === undefined || rule.interval_days === null) {
    errors.push('Interval rule must specify interval_days');
  } else if (!Number.isInteger(rule.interval_days) || rule.interval_days < 1) {
    errors.push('interval_days must be a positive integer');
  }

  // only_weekdays validation
  if (rule.only_weekdays !== undefined && typeof rule.only_weekdays !== 'boolean') {
    errors.push('only_weekdays must be a boolean');
  }

  return errors;
}

/**
 * Validate date rule specific properties
 * @param {Object} rule - Date rule to validate
 * @returns {Array} Array of validation errors
 */
function validateDateRule(rule) {
  const errors = [];

  if (!rule.dates || !Array.isArray(rule.dates)) {
    errors.push('Date rule must have a dates array');
  } else {
    if (rule.dates.length === 0) {
      errors.push('Date rule must specify at least one date');
    }

    const invalidDates = rule.dates.filter(date => !isValidISODate(date));
    if (invalidDates.length > 0) {
      errors.push(`Invalid date formats: ${invalidDates.join(', ')}. Must be YYYY-MM-DD`);
    }

    // Check for duplicates
    const uniqueDates = [...new Set(rule.dates)];
    if (uniqueDates.length !== rule.dates.length) {
      errors.push('Date rule contains duplicate dates');
    }
  }

  return errors;
}

/**
 * Validate status configuration
 * @param {Object} status - Status to validate
 * @returns {Array} Array of validation errors
 */
function validateStatus(status) {
  const errors = [];

  if (!status || typeof status !== 'object') {
    return ['Status must be an object'];
  }

  // Text validation
  if (!status.text) {
    errors.push('Status must specify text');
  } else if (typeof status.text !== 'string') {
    errors.push('Status text must be a string');
  } else if (status.text.length > 100) {
    errors.push('Status text must be 100 characters or less');
  }

  // Emoji validation
  if (!status.emoji) {
    errors.push('Status must specify emoji');
  } else if (typeof status.emoji !== 'string') {
    errors.push('Status emoji must be a string');
  } else if (!isValidEmoji(status.emoji)) {
    errors.push(
      `Invalid emoji format: ${status.emoji}. Must be Unicode emoji (🙂) or ` +
        'Slack emoji (:smile:) format',
    );
  }

  // Expire hour validation (optional)
  if (status.expire_hour !== undefined) {
    if (
      !Number.isInteger(status.expire_hour) ||
      status.expire_hour < 0 ||
      status.expire_hour > 23
    ) {
      errors.push('expire_hour must be an integer between 0 and 23');
    }
  }

  return errors;
}

/**
 * Validate options configuration
 * @param {Object} options - Options to validate
 * @returns {Array} Array of validation errors
 */
function validateOptions(options) {
  const errors = [];

  if (typeof options !== 'object') {
    return ['Options must be an object'];
  }

  // clear_when_no_match validation
  if (
    options.clear_when_no_match !== undefined &&
    typeof options.clear_when_no_match !== 'boolean'
  ) {
    errors.push('clear_when_no_match must be a boolean');
  }

  // log_level validation
  if (options.log_level !== undefined) {
    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLogLevels.includes(options.log_level)) {
      errors.push(
        `Invalid log_level: ${options.log_level}. Must be one of: ` +
          `${validLogLevels.join(', ')}`,
      );
    }
  }

  // retry_attempts validation
  if (options.retry_attempts !== undefined) {
    if (!Number.isInteger(options.retry_attempts) || options.retry_attempts < 0) {
      errors.push('retry_attempts must be a non-negative integer');
    }
  }

  // retry_delay_ms validation
  if (options.retry_delay_ms !== undefined) {
    if (!Number.isInteger(options.retry_delay_ms) || options.retry_delay_ms < 0) {
      errors.push('retry_delay_ms must be a non-negative integer');
    }
  }

  return errors;
}

/**
 * Check if a timezone is valid
 * @param {string} timezone - Timezone to check
 * @returns {boolean} True if valid
 */
function isValidTimezone(timezone) {
  try {
    const dt = DateTime.now().setZone(timezone);
    return dt.isValid;
  } catch {
    return false;
  }
}

/**
 * Check if a time string is valid (HH:MM format)
 * @param {string} time - Time string to check
 * @returns {boolean} True if valid
 */
function isValidTime(time) {
  if (typeof time !== 'string') return false;

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Check if an ISO date string is valid (YYYY-MM-DD format)
 * @param {string} date - Date string to check
 * @returns {boolean} True if valid
 */
function isValidISODate(date) {
  if (typeof date !== 'string') return false;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;

  // Check if the date is actually valid
  const parsed = DateTime.fromISO(date);
  return parsed.isValid && parsed.toISODate() === date;
}

/**
 * Check if an emoji string is valid (Unicode emoji or :emoji_name: format)
 * @param {string} emoji - Emoji string to check
 * @returns {boolean} True if valid
 */
function isValidEmoji(emoji) {
  if (typeof emoji !== 'string') return false;
  if (emoji.trim().length === 0) return false;

  // Allow Slack emoji format (:emoji_name:)
  const slackEmojiRegex = /^:[a-z0-9_+-]+:$/;
  if (slackEmojiRegex.test(emoji)) {
    return true;
  }

  // Allow Unicode emojis - be permissive since Slack accepts most Unicode
  // Just check that it's not empty and doesn't start/end with colons
  // (which would be malformed Slack emoji)
  if (emoji.startsWith(':') || emoji.endsWith(':')) {
    return false; // Malformed Slack emoji
  }

  // Accept any other string as potential Unicode emoji
  // Slack is quite permissive with Unicode emojis
  return true;
}

/**
 * Quick validation for common schedule errors
 * @param {Object} schedule - Schedule to check
 * @returns {Object} Quick validation result
 */
export function quickValidate(schedule) {
  const criticalErrors = [];

  if (!schedule) {
    criticalErrors.push('No schedule provided');
  } else {
    if (!schedule.timezone) criticalErrors.push('Missing timezone');
    if (!schedule.rules?.length) {
      criticalErrors.push('No rules defined');
    }

    if (schedule.rules) {
      schedule.rules.forEach((rule, index) => {
        if (!rule.type) criticalErrors.push(`Rule ${index + 1}: Missing type`);
        if (!rule.status?.text) criticalErrors.push(`Rule ${index + 1}: Missing status text`);
        if (!rule.status?.emoji) criticalErrors.push(`Rule ${index + 1}: Missing status emoji`);
      });
    }
  }

  return {
    valid: criticalErrors.length === 0,
    errors: criticalErrors,
  };
}
