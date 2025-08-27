/**
 * Tests for the schedule evaluator
 */

import { describe, test, expect } from '@jest/globals';
import { DateTime } from 'luxon';
import { createScheduleEvaluator, getNextExecutionDescription } from '../src/scheduler/evaluator.js';

describe('Schedule Evaluator', () => {
  const timezone = 'America/Los_Angeles';

  describe('createScheduleEvaluator', () => {
    test('should create evaluator with valid schedule', () => {
      const schedule = {
        timezone,
        rules: [
          {
            id: 'test',
            type: 'weekly',
            days: ['mon'],
            status: { text: 'Working', emoji: ':computer:' },
          },
        ],
      };

      const evaluator = createScheduleEvaluator(schedule);
      expect(evaluator).toHaveProperty('findMatchingRule');
      expect(evaluator).toHaveProperty('getAllMatchingRules');
      expect(evaluator).toHaveProperty('ruleMatches');
    });

    test('should throw error for invalid schedule', () => {
      expect(() => createScheduleEvaluator(null)).toThrow('Schedule must contain rules array');
      expect(() => createScheduleEvaluator({})).toThrow('Schedule must contain rules array');
    });
  });

  describe('Weekly Rules', () => {
    const schedule = {
      timezone,
      rules: [
        {
          id: 'weekday-work',
          type: 'weekly',
          days: ['mon', 'tue', 'wed', 'thu', 'fri'],
          time: '09:00',
          status: { text: 'Working', emoji: ':computer:' },
        },
        {
          id: 'weekend-off',
          type: 'weekly',
          days: ['sat', 'sun'],
          status: { text: 'Weekend', emoji: ':palm_tree:' },
        },
      ],
    };

    const evaluator = createScheduleEvaluator(schedule);

    test('should match weekday rule on Monday', () => {
      const monday = DateTime.fromISO('2024-01-08T10:00:00', { zone: timezone }); // Monday
      const rule = evaluator.findMatchingRule(monday);

      expect(rule).not.toBeNull();
      expect(rule.id).toBe('weekday-work');
    });

    test('should match weekend rule on Saturday', () => {
      const saturday = DateTime.fromISO('2024-01-06T10:00:00', { zone: timezone }); // Saturday
      const rule = evaluator.findMatchingRule(saturday);

      expect(rule).not.toBeNull();
      expect(rule.id).toBe('weekend-off');
    });

    test('should respect time constraints', () => {
      // Before 9 AM on Monday - should not match weekday rule
      const mondayEarly = DateTime.fromISO('2024-01-08T08:00:00', { zone: timezone });
      const rule = evaluator.findMatchingRule(mondayEarly);

      expect(rule).toBeNull();
    });

    test('should match after time constraint', () => {
      // After 9 AM on Monday - should match weekday rule
      const mondayLate = DateTime.fromISO('2024-01-08T10:00:00', { zone: timezone });
      const rule = evaluator.findMatchingRule(mondayLate);

      expect(rule).not.toBeNull();
      expect(rule.id).toBe('weekday-work');
    });
  });

  describe('Interval Rules', () => {
    const schedule = {
      timezone,
      rules: [
        {
          id: 'every-3-days',
          type: 'every_n_days',
          start_date: '2024-01-01',
          interval_days: 3,
          status: { text: 'Standup', emoji: ':speaking_head_in_silhouette:' },
        },
        {
          id: 'weekdays-only',
          type: 'every_n_days',
          start_date: '2024-01-01',
          interval_days: 2,
          only_weekdays: true,
          status: { text: 'Weekday meeting', emoji: ':calendar:' },
        },
      ],
    };

    const evaluator = createScheduleEvaluator(schedule);

    test('should match on interval days', () => {
      // Jan 1, 2024 + 3 days = Jan 4, 2024
      const jan4 = DateTime.fromISO('2024-01-04T10:00:00', { zone: timezone });
      const rule = evaluator.findMatchingRule(jan4);

      expect(rule).not.toBeNull();
      expect(rule.id).toBe('every-3-days');
    });

    test('should not match on non-interval days', () => {
      // Jan 2, 2024 is not an interval day (1 day after start)
      const jan2 = DateTime.fromISO('2024-01-02T10:00:00', { zone: timezone });
      const rule = evaluator.findMatchingRule(jan2);

      expect(rule).toBeNull();
    });

    test('should respect only_weekdays constraint', () => {
      // Jan 6, 2024 is a Saturday and would be an interval day (2, 4, 6)
      // but should be skipped due to only_weekdays
      const jan6 = DateTime.fromISO('2024-01-06T10:00:00', { zone: timezone }); // Saturday
      const allRules = evaluator.getAllMatchingRules(jan6);
      const weekdayRule = allRules.find(r => r.id === 'weekdays-only');

      expect(weekdayRule).toBeUndefined();
    });

    test('should match weekday interval days', () => {
      // Jan 3, 2024 is a Wednesday and an interval day
      const jan3 = DateTime.fromISO('2024-01-03T10:00:00', { zone: timezone }); // Wednesday
      const allRules = evaluator.getAllMatchingRules(jan3);
      const weekdayRule = allRules.find(r => r.id === 'weekdays-only');

      expect(weekdayRule).toBeDefined();
    });

    test('should not match before start date', () => {
      // Dec 31, 2023 is before start date
      const dec31 = DateTime.fromISO('2023-12-31T10:00:00', { zone: timezone });
      const rule = evaluator.findMatchingRule(dec31);

      expect(rule).toBeNull();
    });
  });

  describe('Date Rules', () => {
    const schedule = {
      timezone,
      rules: [
        {
          id: 'holidays',
          type: 'dates',
          dates: ['2024-12-25', '2024-12-26', '2024-01-01'],
          status: { text: 'Holiday', emoji: ':palm_tree:' },
        },
      ],
    };

    const evaluator = createScheduleEvaluator(schedule);

    test('should match specific dates', () => {
      const christmas = DateTime.fromISO('2024-12-25T10:00:00', { zone: timezone });
      const rule = evaluator.findMatchingRule(christmas);

      expect(rule).not.toBeNull();
      expect(rule.id).toBe('holidays');
    });

    test('should not match non-specified dates', () => {
      const randomDate = DateTime.fromISO('2024-06-15T10:00:00', { zone: timezone });
      const rule = evaluator.findMatchingRule(randomDate);

      expect(rule).toBeNull();
    });
  });

  describe('Rule Priority', () => {
    const schedule = {
      timezone,
      rules: [
        {
          id: 'high-priority',
          type: 'weekly',
          days: ['mon'],
          status: { text: 'High Priority', emoji: ':one:' },
        },
        {
          id: 'low-priority',
          type: 'weekly',
          days: ['mon'],
          status: { text: 'Low Priority', emoji: ':two:' },
        },
      ],
    };

    const evaluator = createScheduleEvaluator(schedule);

    test('should return first matching rule', () => {
      const monday = DateTime.fromISO('2024-01-08T10:00:00', { zone: timezone });
      const rule = evaluator.findMatchingRule(monday);

      expect(rule).not.toBeNull();
      expect(rule.id).toBe('high-priority');
    });

    test('should return all matching rules', () => {
      const monday = DateTime.fromISO('2024-01-08T10:00:00', { zone: timezone });
      const rules = evaluator.getAllMatchingRules(monday);

      expect(rules).toHaveLength(2);
      expect(rules[0].id).toBe('high-priority');
      expect(rules[1].id).toBe('low-priority');
    });
  });

  describe('Timezone Handling', () => {
    test('should handle different timezones correctly', () => {
      const schedule = {
        timezone: 'Europe/London',
        rules: [
          {
            id: 'london-time',
            type: 'weekly',
            days: ['mon'],
            time: '09:00',
            status: { text: 'London time', emoji: ':gb:' },
          },
        ],
      };

      const evaluator = createScheduleEvaluator(schedule);

      // 9 AM London time on Monday
      const londonTime = DateTime.fromISO('2024-01-08T09:00:00', { zone: 'Europe/London' });
      const rule = evaluator.findMatchingRule(londonTime);

      expect(rule).not.toBeNull();
      expect(rule.id).toBe('london-time');
    });
  });

  describe('Edge Cases', () => {
    test('should handle invalid rule types gracefully', () => {
      const schedule = {
        timezone,
        rules: [
          {
            id: 'invalid',
            type: 'invalid_type',
            status: { text: 'Invalid', emoji: ':question:' },
          },
        ],
      };

      const evaluator = createScheduleEvaluator(schedule);
      const date = DateTime.fromISO('2024-01-08T10:00:00', { zone: timezone });

      expect(() => evaluator.findMatchingRule(date)).toThrow('Unknown rule type: invalid_type');
    });

    test('should handle rules without time', () => {
      const schedule = {
        timezone,
        rules: [
          {
            id: 'no-time',
            type: 'weekly',
            days: ['mon'],
            status: { text: 'No time', emoji: ':clock:' },
          },
        ],
      };

      const evaluator = createScheduleEvaluator(schedule);
      const monday = DateTime.fromISO('2024-01-08T10:00:00', { zone: timezone });
      const rule = evaluator.findMatchingRule(monday);

      expect(rule).not.toBeNull();
      expect(rule.id).toBe('no-time');
    });
  });

  describe('getNextExecutionDescription', () => {
    test('should describe next weekly execution', () => {
      const rule = {
        type: 'weekly',
        days: ['mon', 'fri'],
        time: '09:00',
      };

      const description = getNextExecutionDescription(rule, timezone);
      expect(description).toContain('Next:');
      expect(description).toContain('at 09:00');
    });

    test('should describe next interval execution', () => {
      const rule = {
        type: 'every_n_days',
        start_date: '2024-01-01',
        interval_days: 3,
        time: '10:00',
      };

      const description = getNextExecutionDescription(rule, timezone);
      expect(description).toContain('Next:');
      expect(description).toContain('at 10:00');
    });

    test('should describe next date execution', () => {
      const rule = {
        type: 'dates',
        dates: ['2025-12-25', '2025-12-26'],
        time: '08:00',
      };

      const description = getNextExecutionDescription(rule, timezone);
      expect(description).toContain('Next:');
    });

    test('should handle no future dates', () => {
      const rule = {
        type: 'dates',
        dates: ['2020-01-01'],
        time: '08:00',
      };

      const description = getNextExecutionDescription(rule, timezone);
      expect(description).toBe('No future dates scheduled');
    });
  });
});
