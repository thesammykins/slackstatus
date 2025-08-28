/**
 * Main entry point for the Slack Status Scheduler
 * Provides the core scheduling logic and API
 */

import { DateTime } from 'luxon';
import { readFile } from 'fs/promises';
import { createScheduleEvaluator } from './scheduler/evaluator.js';
import { createSlackClient } from './slack/client.js';
import { validateSchedule } from './scheduler/validator.js';
import { createLogger } from './utils/logger.js';

/**
 * Main scheduler class that coordinates rule evaluation and Slack updates
 */
export class SlackStatusScheduler {
  constructor(options = {}) {
    this.logger = createLogger(options.logLevel || 'info');
    this.slackClient = null;
    this.schedule = null;
    this.dryRun = options.dryRun || false;
  }

  /**
   * Initialize the scheduler with a schedule configuration
   * @param {string|Object} scheduleSource - Path to schedule.json or schedule object
   * @param {string} slackToken - Slack user token (optional for dry runs)
   */
  async initialize(scheduleSource, slackToken = null) {
    // Load and validate schedule
    if (typeof scheduleSource === 'string') {
      const scheduleContent = await readFile(scheduleSource, 'utf8');
      this.schedule = JSON.parse(scheduleContent);
    } else {
      this.schedule = scheduleSource;
    }

    const validation = validateSchedule(this.schedule);
    if (!validation.valid) {
      throw new Error(`Invalid schedule: ${validation.errors.join(', ')}`);
    }

    // Initialize Slack client if token provided
    if (slackToken && !this.dryRun) {
      this.slackClient = createSlackClient(slackToken, {
        logger: this.logger,
      });
    }

    this.logger.info('Scheduler initialized', {
      timezone: this.schedule.timezone,
      ruleCount: this.schedule.rules.length,
      dryRun: this.dryRun,
    });
  }

  /**
   * Run the scheduler for the current time or a specific date
   * @param {DateTime|string} targetDate - Date to evaluate (defaults to now)
   * @returns {Object} Result of the scheduling run
   */
  async run(targetDate = null) {
    if (!this.schedule) {
      throw new Error('Scheduler not initialized. Call initialize() first.');
    }

    const evaluateDate = targetDate
      ? typeof targetDate === 'string'
        ? DateTime.fromISO(targetDate)
        : targetDate
      : DateTime.now();

    // Ensure we're working in the schedule's timezone
    const localDate = evaluateDate.setZone(this.schedule.timezone);

    this.logger.info('Running scheduler', {
      date: localDate.toISO(),
      timezone: this.schedule.timezone,
      dryRun: this.dryRun,
    });

    const evaluator = createScheduleEvaluator(this.schedule);
    const matchedRule = evaluator.findMatchingRule(localDate);

    if (!matchedRule) {
      if (this.schedule.options?.clear_when_no_match) {
        return await this._clearStatus();
      } else {
        this.logger.info('No matching rules found, leaving status unchanged');
        return {
          success: true,
          action: 'no_change',
          message: 'No matching rules found',
        };
      }
    }

    return await this._updateStatus(matchedRule, localDate);
  }

  /**
   * Preview what would happen for a given date without making changes
   * @param {DateTime|string} targetDate - Date to preview
   * @returns {Object} Preview result
   */
  async preview(targetDate = null) {
    const previousDryRun = this.dryRun;
    this.dryRun = true;

    try {
      const result = await this.run(targetDate);
      return {
        ...result,
        preview: true,
      };
    } finally {
      this.dryRun = previousDryRun;
    }
  }

  /**
   * Get the next scheduled status changes
   * @param {number} days - Number of days to look ahead
   * @returns {Array} Array of upcoming changes
   */
  getUpcomingChanges(days = 7) {
    if (!this.schedule) {
      throw new Error('Scheduler not initialized');
    }

    const evaluator = createScheduleEvaluator(this.schedule);
    const upcoming = [];
    const startDate = DateTime.now().setZone(this.schedule.timezone);

    for (let i = 0; i < days; i++) {
      const checkDate = startDate.plus({ days: i });
      const matchedRule = evaluator.findMatchingRule(checkDate);

      if (matchedRule) {
        const executeTime = checkDate.startOf('day').plus({
          hours: parseInt(matchedRule.time?.split(':')[0] || 0),
          minutes: parseInt(matchedRule.time?.split(':')[1] || 0),
        });

        upcoming.push({
          date: checkDate.toISODate(),
          time: matchedRule.time,
          executeAt: executeTime.toISO(),
          rule: matchedRule,
          status: matchedRule.status,
        });
      }
    }

    return upcoming;
  }

  /**
   * Update Slack status based on matched rule
   * @private
   */
  async _updateStatus(rule, currentDate) {
    const { status } = rule;
    const expiration = this._calculateExpiration(status, currentDate);

    if (this.dryRun) {
      this.logger.info('DRY RUN: Would update status', {
        ruleId: rule.id,
        text: status.text,
        emoji: status.emoji,
        expiration: expiration?.toISO(),
      });

      return {
        success: true,
        action: 'update_status',
        rule: rule.id,
        status,
        expiration: expiration?.toISO(),
        dryRun: true,
      };
    }

    if (!this.slackClient) {
      throw new Error('Slack client not initialized. Token required for live updates.');
    }

    try {
      await this.slackClient.updateStatus(status.text, status.emoji, expiration);

      this.logger.info('Status updated successfully', {
        ruleId: rule.id,
        text: status.text,
        emoji: status.emoji,
      });

      return {
        success: true,
        action: 'update_status',
        rule: rule.id,
        status,
        expiration: expiration?.toISO(),
      };
    } catch (error) {
      this.logger.error('Failed to update status', { error: error.message });
      throw error;
    }
  }

  /**
   * Clear Slack status
   * @private
   */
  async _clearStatus() {
    if (this.dryRun) {
      this.logger.info('DRY RUN: Would clear status');
      return {
        success: true,
        action: 'clear_status',
        dryRun: true,
      };
    }

    if (!this.slackClient) {
      throw new Error('Slack client not initialized');
    }

    try {
      await this.slackClient.clearStatus();
      this.logger.info('Status cleared successfully');

      return {
        success: true,
        action: 'clear_status',
      };
    } catch (error) {
      this.logger.error('Failed to clear status', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate expiration time for status
   * @private
   */
  _calculateExpiration(status, currentDate) {
    if (!status.expire_hour) {
      // Default to end of day
      return currentDate.endOf('day');
    }

    const expireTime = currentDate.startOf('day').plus({ hours: status.expire_hour });

    // If expire time has already passed today, set for end of day
    if (expireTime <= currentDate) {
      return currentDate.endOf('day');
    }

    return expireTime;
  }
}

/**
 * Convenience function to create and run scheduler
 * @param {string} schedulePath - Path to schedule.json
 * @param {string} slackToken - Slack token
 * @param {Object} options - Additional options
 */
export async function runScheduler(schedulePath, slackToken, options = {}) {
  const scheduler = new SlackStatusScheduler(options);
  await scheduler.initialize(schedulePath, slackToken);
  return await scheduler.run();
}

/**
 * Convenience function to preview schedule
 * @param {string} schedulePath - Path to schedule.json
 * @param {string|DateTime} targetDate - Date to preview
 * @param {Object} options - Additional options
 */
export async function previewSchedule(schedulePath, targetDate = null, options = {}) {
  const scheduler = new SlackStatusScheduler({ ...options, dryRun: true });
  await scheduler.initialize(schedulePath);
  return await scheduler.preview(targetDate);
}

export default SlackStatusScheduler;
