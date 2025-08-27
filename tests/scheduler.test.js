/**
 * Tests for the schedule validator
 */

import { describe, test, expect } from '@jest/globals';
import { validateSchedule, validateRule, quickValidate } from '../src/scheduler/validator.js';

describe('Schedule Validator', () => {
  describe('validateSchedule', () => {
    test('should validate a correct schedule', () => {
      const schedule = {
        version: 1,
        timezone: 'America/Los_Angeles',
        rules: [
          {
            id: 'test-rule',
            type: 'weekly',
            days: ['mon', 'tue'],
            time: '09:00',
            status: {
              text: 'Working',
              emoji: ':computer:',
            },
          },
        ],
      };

      const result = validateSchedule(schedule);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject schedule without version', () => {
      const schedule = {
        timezone: 'America/Los_Angeles',
        rules: [],
      };

      const result = validateSchedule(schedule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Schedule version must be 1');
    });

    test('should reject schedule with invalid timezone', () => {
      const schedule = {
        version: 1,
        timezone: 'Invalid/Timezone',
        rules: [],
      };

      const result = validateSchedule(schedule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid timezone: Invalid/Timezone');
    });

    test('should reject schedule without rules', () => {
      const schedule = {
        version: 1,
        timezone: 'America/Los_Angeles',
      };

      const result = validateSchedule(schedule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Schedule must contain a rules array');
    });

    test('should reject schedule with empty rules array', () => {
      const schedule = {
        version: 1,
        timezone: 'America/Los_Angeles',
        rules: [],
      };

      const result = validateSchedule(schedule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Schedule must contain at least one rule');
    });

    test('should detect duplicate rule IDs', () => {
      const schedule = {
        version: 1,
        timezone: 'America/Los_Angeles',
        rules: [
          {
            id: 'duplicate',
            type: 'weekly',
            days: ['mon'],
            status: { text: 'Working', emoji: ':computer:' },
          },
          {
            id: 'duplicate',
            type: 'weekly',
            days: ['tue'],
            status: { text: 'Working', emoji: ':computer:' },
          },
        ],
      };

      const result = validateSchedule(schedule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate rule IDs found: duplicate');
    });
  });

  describe('validateRule', () => {
    test('should validate weekly rule', () => {
      const rule = {
        id: 'weekly-test',
        type: 'weekly',
        days: ['mon', 'wed', 'fri'],
        time: '09:00',
        status: {
          text: 'Working from office',
          emoji: ':office:',
          expire_hour: 17,
        },
      };

      const errors = validateRule(rule);
      expect(errors).toHaveLength(0);
    });

    test('should validate every_n_days rule', () => {
      const rule = {
        id: 'interval-test',
        type: 'every_n_days',
        start_date: '2024-01-01',
        interval_days: 3,
        only_weekdays: true,
        status: {
          text: 'Standup day',
          emoji: ':speaking_head_in_silhouette:',
        },
      };

      const errors = validateRule(rule);
      expect(errors).toHaveLength(0);
    });

    test('should validate dates rule', () => {
      const rule = {
        id: 'dates-test',
        type: 'dates',
        dates: ['2024-12-25', '2024-12-26', '2024-01-01'],
        status: {
          text: 'Holiday',
          emoji: ':palm_tree:',
        },
      };

      const errors = validateRule(rule);
      expect(errors).toHaveLength(0);
    });

    test('should reject rule without type', () => {
      const rule = {
        status: { text: 'Test', emoji: ':test:' },
      };

      const errors = validateRule(rule);
      expect(errors).toContain('Rule must specify a type');
    });

    test('should reject rule with invalid type', () => {
      const rule = {
        type: 'invalid_type',
        status: { text: 'Test', emoji: ':test:' },
      };

      const errors = validateRule(rule);
      expect(errors).toContain(
        "Invalid rule type: invalid_type. Must be 'weekly', 'every_n_days', or 'dates'"
      );
    });

    test('should reject rule without status', () => {
      const rule = {
        type: 'weekly',
        days: ['mon'],
      };

      const errors = validateRule(rule);
      expect(errors).toContain('Rule must specify a status');
    });

    test('should reject rule with invalid time format', () => {
      const rule = {
        type: 'weekly',
        days: ['mon'],
        time: '25:00',
        status: { text: 'Test', emoji: ':test:' },
      };

      const errors = validateRule(rule);
      expect(errors).toContain('Invalid time format: 25:00. Must be HH:MM format');
    });

    test('should reject weekly rule without days', () => {
      const rule = {
        type: 'weekly',
        status: { text: 'Test', emoji: ':test:' },
      };

      const errors = validateRule(rule);
      expect(errors).toContain('Weekly rule must have a days array');
    });

    test('should reject weekly rule with invalid days', () => {
      const rule = {
        type: 'weekly',
        days: ['monday', 'invalid_day'],
        status: { text: 'Test', emoji: ':test:' },
      };

      const errors = validateRule(rule);
      expect(errors).toContain(
        'Invalid days: monday, invalid_day. Must be: mon, tue, wed, thu, fri, sat, sun'
      );
    });

    test('should reject interval rule without start_date', () => {
      const rule = {
        type: 'every_n_days',
        interval_days: 3,
        status: { text: 'Test', emoji: ':test:' },
      };

      const errors = validateRule(rule);
      expect(errors).toContain('Interval rule must specify start_date');
    });

    test('should reject interval rule with invalid start_date', () => {
      const rule = {
        type: 'every_n_days',
        start_date: '2024-13-01',
        interval_days: 3,
        status: { text: 'Test', emoji: ':test:' },
      };

      const errors = validateRule(rule);
      expect(errors).toContain('Invalid start_date format: 2024-13-01. Must be YYYY-MM-DD');
    });

    test('should reject interval rule without interval_days', () => {
      const rule = {
        type: 'every_n_days',
        start_date: '2024-01-01',
        status: { text: 'Test', emoji: ':test:' },
      };

      const errors = validateRule(rule);
      expect(errors).toContain('Interval rule must specify interval_days');
    });

    test('should reject interval rule with invalid interval_days', () => {
      const rule = {
        type: 'every_n_days',
        start_date: '2024-01-01',
        interval_days: 0,
        status: { text: 'Test', emoji: ':test:' },
      };

      const errors = validateRule(rule);
      expect(errors).toContain('interval_days must be a positive integer');
    });

    test('should reject dates rule without dates', () => {
      const rule = {
        type: 'dates',
        status: { text: 'Test', emoji: ':test:' },
      };

      const errors = validateRule(rule);
      expect(errors).toContain('Date rule must have a dates array');
    });

    test('should reject dates rule with invalid dates', () => {
      const rule = {
        type: 'dates',
        dates: ['2024-01-01', '2024-13-01', 'invalid-date'],
        status: { text: 'Test', emoji: ':test:' },
      };

      const errors = validateRule(rule);
      expect(errors).toContain(
        'Invalid date formats: 2024-13-01, invalid-date. Must be YYYY-MM-DD'
      );
    });

    test('should reject status without text', () => {
      const rule = {
        type: 'weekly',
        days: ['mon'],
        status: { emoji: ':test:' },
      };

      const errors = validateRule(rule);
      expect(errors).toContain('Status: Status must specify text');
    });

    test('should reject status without emoji', () => {
      const rule = {
        type: 'weekly',
        days: ['mon'],
        status: { text: 'Test' },
      };

      const errors = validateRule(rule);
      expect(errors).toContain('Status: Status must specify emoji');
    });

    test('should reject status with invalid emoji format', () => {
      const rule = {
        type: 'weekly',
        days: ['mon'],
        status: { text: 'Test', emoji: ':malformed-emoji' }, // Missing closing colon
      };

      const errors = validateRule(rule);
      expect(errors).toContain(
        'Status: Invalid emoji format: :malformed-emoji. Must be Unicode emoji (🙂) or Slack emoji (:smile:) format'
      );
    });

    test('should reject status with text too long', () => {
      const rule = {
        type: 'weekly',
        days: ['mon'],
        status: {
          text: 'A'.repeat(101),
          emoji: ':test:',
        },
      };

      const errors = validateRule(rule);
      expect(errors).toContain('Status: Status text must be 100 characters or less');
    });

    test('should reject status with invalid expire_hour', () => {
      const rule = {
        type: 'weekly',
        days: ['mon'],
        status: {
          text: 'Test',
          emoji: ':test:',
          expire_hour: 25,
        },
      };

      const errors = validateRule(rule);
      expect(errors).toContain('Status: expire_hour must be an integer between 0 and 23');
    });
  });

  describe('quickValidate', () => {
    test('should pass quick validation for valid schedule', () => {
      const schedule = {
        timezone: 'America/Los_Angeles',
        rules: [
          {
            type: 'weekly',
            days: ['mon'],
            status: { text: 'Working', emoji: ':computer:' },
          },
        ],
      };

      const result = quickValidate(schedule);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should catch critical errors in quick validation', () => {
      const schedule = {
        rules: [
          {
            status: { text: 'Working' },
          },
        ],
      };

      const result = quickValidate(schedule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing timezone');
      expect(result.errors).toContain('Rule 1: Missing type');
      expect(result.errors).toContain('Rule 1: Missing status emoji');
    });

    test('should handle null schedule', () => {
      const result = quickValidate(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No schedule provided');
    });

    test('should handle empty rules', () => {
      const schedule = {
        timezone: 'America/Los_Angeles',
        rules: [],
      };

      const result = quickValidate(schedule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No rules defined');
    });
  });
});
