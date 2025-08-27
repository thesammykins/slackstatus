/**
 * Schedule evaluator for matching rules against dates
 * Handles all rule types: weekly, every_n_days, and dates
 */

import { DateTime } from 'luxon';

/**
 * Create a schedule evaluator for a given schedule configuration
 * @param {Object} schedule - The schedule configuration
 * @returns {Object} Evaluator with rule matching methods
 */
export function createScheduleEvaluator(schedule) {
  if (!schedule || !schedule.rules) {
    throw new Error('Schedule must contain rules array');
  }

  return {
    /**
     * Find the first matching rule for a given date
     * @param {DateTime} targetDate - Date to evaluate
     * @returns {Object|null} Matching rule or null
     */
    findMatchingRule(targetDate) {
      // Ensure we're working in the schedule's timezone
      const localDate = targetDate.setZone(schedule.timezone);

      // Rules are evaluated in order, first match wins
      for (const rule of schedule.rules) {
        if (evaluateRule(rule, localDate)) {
          return rule;
        }
      }

      return null;
    },

    /**
     * Get all matching rules for a date (for debugging/analysis)
     * @param {DateTime} targetDate - Date to evaluate
     * @returns {Array} Array of matching rules
     */
    getAllMatchingRules(targetDate) {
      const localDate = targetDate.setZone(schedule.timezone);
      return schedule.rules.filter(rule => evaluateRule(rule, localDate));
    },

    /**
     * Check if a specific rule matches a date
     * @param {Object} rule - Rule to check
     * @param {DateTime} targetDate - Date to evaluate
     * @returns {boolean} True if rule matches
     */
    ruleMatches(rule, targetDate) {
      const localDate = targetDate.setZone(schedule.timezone);
      return evaluateRule(rule, localDate);
    },
  };
}

/**
 * Evaluate a single rule against a date
 * @param {Object} rule - Rule configuration
 * @param {DateTime} localDate - Date in the schedule's timezone
 * @returns {boolean} True if rule matches
 */
function evaluateRule(rule, localDate) {
  // Check if we should execute at a specific time
  if (rule.time) {
    if (!shouldExecuteAtTime(rule.time, localDate)) {
      return false;
    }
  }

  switch (rule.type) {
  case 'weekly':
    return evaluateWeeklyRule(rule, localDate);
  case 'every_n_days':
    return evaluateIntervalRule(rule, localDate);
  case 'dates':
    return evaluateDateRule(rule, localDate);
  default:
    throw new Error(`Unknown rule type: ${rule.type}`);
  }
}

/**
 * Check if the current time matches the rule's execution time
 * @param {string} ruleTime - Time in HH:MM format
 * @param {DateTime} currentDate - Current date/time
 * @returns {boolean} True if we should execute now
 */
function shouldExecuteAtTime(ruleTime, currentDate) {
  const [hours, minutes] = ruleTime.split(':').map(Number);
  const ruleDateTime = currentDate.startOf('day').plus({ hours, minutes });

  // Execute if current time is at or past the rule time, but still the same day
  return currentDate >= ruleDateTime && currentDate.hasSame(ruleDateTime, 'day');
}

/**
 * Evaluate weekly rule (runs on specific days of week)
 * @param {Object} rule - Weekly rule configuration
 * @param {DateTime} localDate - Date to check
 * @returns {boolean} True if rule matches
 */
function evaluateWeeklyRule(rule, localDate) {
  if (!rule.days || !Array.isArray(rule.days)) {
    throw new Error('Weekly rule must have days array');
  }

  // Check if today is one of the specified days
  const dayOfWeek = localDate.weekdayShort.toLowerCase(); // 'mon', 'tue', etc.
  const matchesDay = rule.days.includes(dayOfWeek);

  if (!matchesDay) {
    return false;
  }

  // Check only_weekdays constraint if specified
  if (rule.only_weekdays) {
    const isWeekday = localDate.weekday <= 5; // Monday = 1, Sunday = 7
    return isWeekday;
  }

  return true;
}

/**
 * Evaluate interval rule (runs every N days from start date)
 * @param {Object} rule - Interval rule configuration
 * @param {DateTime} localDate - Date to check
 * @returns {boolean} True if rule matches
 */
function evaluateIntervalRule(rule, localDate) {
  if (!rule.start_date || !rule.interval_days) {
    throw new Error('Interval rule must have start_date and interval_days');
  }

  const startDate = DateTime.fromISO(rule.start_date, { zone: localDate.zone });
  if (!startDate.isValid) {
    throw new Error(`Invalid start_date in rule: ${rule.start_date}`);
  }

  // Calculate days since start date
  const daysSinceStart = Math.floor(localDate.diff(startDate, 'days').days);

  // Rule doesn't apply before start date
  if (daysSinceStart < 0) {
    return false;
  }

  // Check if today is an interval day
  const isIntervalDay = daysSinceStart % rule.interval_days === 0;

  if (!isIntervalDay) {
    return false;
  }

  // Check only_weekdays constraint if specified
  if (rule.only_weekdays) {
    const isWeekday = localDate.weekday <= 5;
    return isWeekday;
  }

  return true;
}

/**
 * Evaluate date rule (runs on specific dates)
 * @param {Object} rule - Date rule configuration
 * @param {DateTime} localDate - Date to check
 * @returns {boolean} True if rule matches
 */
function evaluateDateRule(rule, localDate) {
  if (!rule.dates || !Array.isArray(rule.dates)) {
    throw new Error('Date rule must have dates array');
  }

  const todayISO = localDate.toISODate(); // YYYY-MM-DD format

  return rule.dates.includes(todayISO);
}

/**
 * Get human-readable description of when a rule will next execute
 * @param {Object} rule - Rule configuration
 * @param {string} timezone - Timezone for calculations
 * @returns {string} Description of next execution
 */
export function getNextExecutionDescription(rule, timezone) {
  const now = DateTime.now().setZone(timezone);

  switch (rule.type) {
  case 'weekly':
    return getNextWeeklyExecution(rule, now);
  case 'every_n_days':
    return getNextIntervalExecution(rule, now);
  case 'dates':
    return getNextDateExecution(rule, now);
  default:
    return 'Unknown rule type';
  }
}

function getNextWeeklyExecution(rule, now) {
  const days = rule.days.map(day => {
    const dayMap = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 };
    return dayMap[day];
  }).sort();

  const currentWeekday = now.weekday;
  let nextDay = days.find(day => day > currentWeekday);

  if (!nextDay) {
    nextDay = days[0] + 7; // Next week
  }

  const daysUntil = nextDay > 7 ? nextDay - 7 - currentWeekday : nextDay - currentWeekday;
  const nextDate = now.plus({ days: daysUntil });

  return `Next: ${nextDate.toFormat('cccc, LLL dd')} at ${rule.time || 'start of day'}`;
}

function getNextIntervalExecution(rule, now) {
  const startDate = DateTime.fromISO(rule.start_date, { zone: now.zone });
  const daysSinceStart = Math.floor(now.diff(startDate, 'days').days);

  let nextIntervalDays;
  if (daysSinceStart < 0) {
    nextIntervalDays = 0;
  } else {
    const remainder = daysSinceStart % rule.interval_days;
    nextIntervalDays = remainder === 0 ? 0 : rule.interval_days - remainder;
  }

  const nextDate = now.plus({ days: nextIntervalDays });
  return `Next: ${nextDate.toFormat('cccc, LLL dd')} at ${rule.time || 'start of day'}`;
}

function getNextDateExecution(rule, now) {
  const today = now.toISODate();
  const futureDates = rule.dates
    .filter(date => date >= today)
    .sort();

  if (futureDates.length === 0) {
    return 'No future dates scheduled';
  }

  const nextDate = DateTime.fromISO(futureDates[0], { zone: now.zone });
  return `Next: ${nextDate.toFormat('cccc, LLL dd')} at ${rule.time || 'start of day'}`;
}
