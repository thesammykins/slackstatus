# API Reference

This document provides detailed API reference for the Slack Status Scheduler
library.

## Table of Contents

- [SlackStatusScheduler Class](#slackstatusscheduler-class)
- [Schedule Configuration](#schedule-configuration)
- [Rule Types](#rule-types)
- [Status Configuration](#status-configuration)
- [Utility Functions](#utility-functions)
- [CLI Commands](#cli-commands)

## SlackStatusScheduler Class

The main class for managing scheduled Slack status updates.

### Constructor

```javascript
new SlackStatusScheduler(options);
```

**Parameters:**

- `options` (Object, optional)
  - `dryRun` (boolean) - If true, no actual API calls will be made
  - `logLevel` (string) - Log level: 'error', 'warn', 'info', 'debug'

**Example:**

```javascript
import { SlackStatusScheduler } from './src/index.js';

const scheduler = new SlackStatusScheduler({
  dryRun: false,
  logLevel: 'info',
});
```

### Methods

#### initialize(scheduleSource, slackToken)

Initialize the scheduler with a schedule configuration and Slack token.

**Parameters:**

- `scheduleSource` (string|Object) - Path to schedule.json file or schedule
  object
- `slackToken` (string, optional) - Slack user token (xoxp-). Required for live
  updates

**Returns:** Promise<void>

**Example:**

```javascript
await scheduler.initialize('./schedule.json', process.env.SLACK_TOKEN);
```

#### run(targetDate)

Execute the scheduler for a specific date.

**Parameters:**

- `targetDate` (DateTime|string, optional) - Date to evaluate (defaults to now)

**Returns:** Promise<Object>

**Response Object:**

```javascript
{
  success: true,
  action: 'update_status' | 'clear_status' | 'no_change',
  rule?: string,        // Rule ID that matched
  status?: Object,      // Status that was set
  expiration?: string,  // ISO timestamp when status expires
  message?: string      // Human-readable message
}
```

**Example:**

```javascript
const result = await scheduler.run();
console.log(result.action); // 'update_status'
```

#### preview(targetDate)

Preview what would happen for a given date without making changes.

**Parameters:**

- `targetDate` (DateTime|string, optional) - Date to preview

**Returns:** Promise<Object> - Same as `run()` but with `preview: true`

**Example:**

```javascript
const preview = await scheduler.preview('2024-01-15');
console.log(`Would ${preview.action}`);
```

#### getUpcomingChanges(days)

Get upcoming scheduled changes.

**Parameters:**

- `days` (number, optional) - Number of days to look ahead (default: 7)

**Returns:** Array<Object>

**Response Array Items:**

```javascript
{
  date: '2024-01-15',           // ISO date
  time: '09:00',                // Time of execution
  executeAt: '2024-01-15T09:00:00-08:00', // Full ISO timestamp
  rule: Object,                 // Full rule object
  status: Object                // Status configuration
}
```

**Example:**

```javascript
const upcoming = scheduler.getUpcomingChanges(14);
upcoming.forEach(change => {
  console.log(`${change.date}: ${change.status.text}`);
});
```

## Schedule Configuration

The schedule configuration defines timezone and rules for status updates.

### Schema

```javascript
{
  "version": 1,                    // Schema version (required)
  "timezone": "America/Los_Angeles", // IANA timezone (required)
  "rules": [...],                  // Array of rules (required)
  "options": {...}                 // Optional settings
}
```

### Options

```javascript
{
  "clear_when_no_match": false,    // Clear status when no rules match
  "log_level": "info",             // Logging level
  "retry_attempts": 3,             // Number of retry attempts
  "retry_delay_ms": 1000          // Delay between retries
}
```

## Rule Types

### Weekly Rule

Executes on specific days of the week.

```javascript
{
  "id": "weekday-work",
  "type": "weekly",
  "days": ["mon", "tue", "wed", "thu", "fri"],
  "time": "09:00",                 // Optional: time to execute
  "only_weekdays": false,          // Optional: skip weekends
  "status": {...}
}
```

**Properties:**

- `days` (Array<string>) - Day abbreviations: 'mon', 'tue', 'wed', 'thu', 'fri',
  'sat', 'sun'
- `time` (string, optional) - Time in HH:MM format (24-hour)
- `only_weekdays` (boolean, optional) - If true, skip weekends

### Interval Rule

Executes every N days from a start date.

```javascript
{
  "id": "every-third-day",
  "type": "every_n_days",
  "start_date": "2024-01-01",
  "interval_days": 3,
  "time": "10:00",
  "only_weekdays": true,           // Optional: skip weekends
  "status": {...}
}
```

**Properties:**

- `start_date` (string) - ISO date (YYYY-MM-DD) to start counting from
- `interval_days` (number) - Number of days between executions
- `time` (string, optional) - Time in HH:MM format
- `only_weekdays` (boolean, optional) - If true, skip weekends

### Date Rule

Executes on specific dates.

```javascript
{
  "id": "holidays",
  "type": "dates",
  "dates": ["2024-12-25", "2024-12-26", "2024-01-01"],
  "time": "08:00",
  "status": {...}
}
```

**Properties:**

- `dates` (Array<string>) - Array of ISO dates (YYYY-MM-DD)
- `time` (string, optional) - Time in HH:MM format

## Status Configuration

Defines the Slack status to set when a rule matches.

```javascript
{
  "text": "Working from home",      // Status text (required, max 100 chars)
  "emoji": ":house:",             // Emoji shortcode (required)
  "expire_hour": 17               // Optional: hour to clear status (0-23)
}
```

**Properties:**

- `text` (string) - Status message text (max 100 characters)
- `emoji` (string) - Slack emoji in `:emoji_name:` format
- `expire_hour` (number, optional) - Hour to automatically clear status (0-23)

## Utility Functions

### validateSchedule(schedule)

Validate a schedule configuration.

**Parameters:**

- `schedule` (Object) - Schedule configuration to validate

**Returns:** Object

```javascript
{
  valid: boolean,
  errors: Array<string>
}
```

**Example:**

```javascript
import { validateSchedule } from './src/scheduler/validator.js';

const result = validateSchedule(schedule);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### createScheduleEvaluator(schedule)

Create an evaluator for testing rule matching.

**Parameters:**

- `schedule` (Object) - Schedule configuration

**Returns:** Object with methods:

- `findMatchingRule(date)` - Find first matching rule
- `getAllMatchingRules(date)` - Get all matching rules
- `ruleMatches(rule, date)` - Test if specific rule matches

**Example:**

```javascript
import { createScheduleEvaluator } from './src/scheduler/evaluator.js';
import { DateTime } from 'luxon';

const evaluator = createScheduleEvaluator(schedule);
const rule = evaluator.findMatchingRule(DateTime.now());
```

### safeTestToken(token, options)

Test a Slack token safely without exposing it in logs.

**Parameters:**

- `token` (string) - Slack user token
- `options` (Object, optional) - Test options

**Returns:** Promise<Object>

```javascript
{
  success: boolean,
  user?: string,
  team?: string,
  hasRequiredPermissions?: boolean,
  error?: string
}
```

**Example:**

```javascript
import { safeTestToken } from './src/slack/client.js';

const result = await safeTestToken(token);
if (result.success) {
  console.log(`Connected as ${result.user}`);
}
```

## CLI Commands

### validate

Validate a schedule configuration file.

```bash
slack-status-cli validate <schedule> [options]
```

**Options:**

- `-q, --quick` - Perform quick validation only
- `-v, --verbose` - Show detailed validation results

### preview

Preview what would happen for a given date.

```bash
slack-status-cli preview <schedule> [options]
```

**Options:**

- `-d, --date <date>` - Date to preview (YYYY-MM-DD)
- `-n, --next <days>` - Show next N days of changes
- `-v, --verbose` - Show detailed information

### run

Execute the scheduler to update Slack status.

```bash
slack-status-cli run <schedule> [options]
```

**Options:**

- `-t, --token <token>` - Slack user token
- `-d, --date <date>` - Date to run for
- `--dry-run` - Perform dry run without changes
- `--clear-if-not-matched` - Clear status when no rules match
- `-v, --verbose` - Show detailed logs

### test

Test Slack token and connection.

```bash
slack-status-cli test [options]
```

**Options:**

- `-t, --token <token>` - Slack user token
- `-v, --verbose` - Show detailed information

### info

Show detailed information about a schedule.

```bash
slack-status-cli info <schedule>
```

## Error Handling

### SlackAPIError

Custom error class for Slack API errors.

**Properties:**

- `message` (string) - Error message
- `originalError` (Error) - Original error from Slack API
- `code` (string, optional) - Slack error code
- `data` (Object, optional) - Additional error data

**Example:**

```javascript
try {
  await scheduler.run();
} catch (error) {
  if (error.name === 'SlackAPIError') {
    console.error('Slack API error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}
```

## TypeScript Support

While this library is written in JavaScript, TypeScript definitions can be
inferred from JSDoc comments. For full TypeScript support, consider using the
types from the function signatures in this documentation.

## Rate Limiting

The Slack Web API has rate limits. The library automatically retries failed
requests with exponential backoff. Configure retry behavior in the schedule
options:

```javascript
{
  "options": {
    "retry_attempts": 3,
    "retry_delay_ms": 1000
  }
}
```

## Security Considerations

1. **Token Storage**: Never commit Slack tokens to version control
2. **Permissions**: Use tokens with minimal required scopes
   (`users.profile:write`)
3. **Logging**: The library automatically scrubs sensitive data from logs
4. **Environment**: Store tokens in environment variables or secure stores

## Examples

See the `examples/` directory for complete working examples:

- `examples/schedule.json` - Comprehensive schedule example
- `examples/simple-schedule.json` - Basic schedule example
