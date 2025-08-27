#!/usr/bin/env node

/**
 * Command-line interface for Slack Status Scheduler
 * Provides validation, preview, and run commands
 */

import { program } from 'commander';
import { readFile } from 'fs/promises';
import { DateTime } from 'luxon';
import { SlackStatusScheduler } from '../src/index.js';
import { validateSchedule, quickValidate } from '../src/scheduler/validator.js';
import { safeTestToken } from '../src/slack/client.js';
import { createLogger } from '../src/utils/logger.js';
import { getNextExecutionDescription } from '../src/scheduler/evaluator.js';

// Package info
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

program
  .name('slack-status-cli')
  .description('Slack Status Scheduler CLI')
  .version(packageJson.version);

/**
 * Validate command - check schedule configuration
 */
program
  .command('validate')
  .description('Validate a schedule configuration file')
  .argument('<schedule>', 'Path to schedule.json file')
  .option('-q, --quick', 'Perform quick validation only')
  .option('-v, --verbose', 'Show detailed validation results')
  .action(async (schedulePath, options) => {
    try {
      const scheduleContent = await readFile(schedulePath, 'utf8');
      const schedule = JSON.parse(scheduleContent);

      const validation = options.quick ? quickValidate(schedule) : validateSchedule(schedule);

      if (validation.valid) {
        console.log('✅ Schedule configuration is valid');

        if (options.verbose) {
          console.log('\nSchedule details:');
          console.log(`  Timezone: ${schedule.timezone}`);
          console.log(`  Rules: ${schedule.rules.length}`);

          if (schedule.rules.length > 0) {
            console.log('\nRule summary:');
            schedule.rules.forEach((rule, index) => {
              console.log(`  ${index + 1}. ${rule.id || 'Unnamed'} (${rule.type})`);
              if (rule.status) {
                console.log(`     Status: "${rule.status.text}" ${rule.status.emoji}`);
              }
              console.log(`     ${getNextExecutionDescription(rule, schedule.timezone)}`);
            });
          }
        }
      } else {
        console.error('❌ Schedule configuration is invalid');
        console.error('\nErrors:');
        validation.errors.forEach(error => {
          console.error(`  • ${error}`);
        });
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to validate schedule:', error.message);
      process.exit(1);
    }
  });

/**
 * Preview command - show what would happen without making changes
 */
program
  .command('preview')
  .description('Preview what would happen for a given date')
  .argument('<schedule>', 'Path to schedule.json file')
  .option('-d, --date <date>', 'Date to preview (YYYY-MM-DD format, defaults to today)')
  .option('-n, --next <days>', 'Show next N days of changes', '7')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (schedulePath, options) => {
    try {
      const logger = createLogger(options.verbose ? 'debug' : 'info');

      if (options.date && options.next) {
        console.error('❌ Cannot specify both --date and --next options');
        process.exit(1);
      }

      const scheduler = new SlackStatusScheduler({
        dryRun: true,
        logger,
      });

      await scheduler.initialize(schedulePath);

      if (options.next) {
        const days = parseInt(options.next);
        if (isNaN(days) || days < 1) {
          console.error('❌ Next days must be a positive number');
          process.exit(1);
        }

        console.log(`📅 Upcoming changes for next ${days} days:\n`);

        const upcoming = scheduler.getUpcomingChanges(days);

        if (upcoming.length === 0) {
          console.log('No scheduled changes found');
        } else {
          upcoming.forEach(change => {
            console.log(`📌 ${change.date} at ${change.time}`);
            console.log(`   Status: "${change.status.text}" ${change.status.emoji}`);
            console.log(`   Rule: ${change.rule.id || 'Unnamed'}`);
            console.log();
          });
        }
      } else {
        const targetDate = options.date ? DateTime.fromISO(options.date) : DateTime.now();

        if (!targetDate.isValid) {
          console.error('❌ Invalid date format. Use YYYY-MM-DD');
          process.exit(1);
        }

        console.log(`🔍 Preview for ${targetDate.toISODate()}:\n`);

        const result = await scheduler.preview(targetDate);

        if (result.action === 'no_change') {
          console.log('ℹ️  No changes would be made');
          console.log(`   Reason: ${result.message}`);
        } else if (result.action === 'update_status') {
          console.log('✅ Status would be updated');
          console.log(`   Text: "${result.status.text}"`);
          console.log(`   Emoji: ${result.status.emoji}`);
          console.log(`   Rule: ${result.rule}`);

          if (result.expiration) {
            const expireTime = DateTime.fromISO(result.expiration);
            console.log(`   Expires: ${expireTime.toLocaleString(DateTime.DATETIME_MED)}`);
          }
        } else if (result.action === 'clear_status') {
          console.log('🗑️  Status would be cleared');
        }
      }
    } catch (error) {
      console.error('❌ Preview failed:', error.message);
      process.exit(1);
    }
  });

/**
 * Run command - execute the scheduler
 */
program
  .command('run')
  .description('Run the scheduler to update Slack status')
  .argument('<schedule>', 'Path to schedule.json file')
  .option('-t, --token <token>', 'Slack user token (or set SLACK_TOKEN env var)')
  .option('-d, --date <date>', 'Date to run for (defaults to now)')
  .option('--dry-run', 'Perform a dry run without making actual changes')
  .option('--clear-if-not-matched', 'Clear status when no rules match')
  .option('-v, --verbose', 'Show detailed logs')
  .action(async (schedulePath, options) => {
    try {
      const logger = createLogger(options.verbose ? 'debug' : 'info');

      // Get token from option or environment
      const token = options.token || process.env.SLACK_TOKEN;

      if (!options.dryRun && !token) {
        console.error(
          '❌ Slack token required. Use --token option or set SLACK_TOKEN environment variable',
        );
        process.exit(1);
      }

      // Validate token format if provided
      if (token && !options.dryRun) {
        console.log('🔐 Testing Slack token...');

        const tokenTest = await safeTestToken(token);
        if (!tokenTest.success) {
          console.error('❌ Token validation failed:', tokenTest.error);
          process.exit(1);
        }

        if (!tokenTest.hasRequiredPermissions) {
          console.error('❌ Token missing required permissions:', tokenTest.permissionError);
          console.error('   Make sure your token has the "users.profile:write" scope');
          process.exit(1);
        }

        console.log(`✅ Token valid for user: ${tokenTest.user} in team: ${tokenTest.team}`);
      }

      const scheduler = new SlackStatusScheduler({
        dryRun: options.dryRun,
        logger,
      });

      await scheduler.initialize(schedulePath, token);

      // Override clear_when_no_match if specified via CLI
      if (options.clearIfNotMatched) {
        const schedule = JSON.parse(await readFile(schedulePath, 'utf8'));
        schedule.options = schedule.options || {};
        schedule.options.clear_when_no_match = true;
        await scheduler.initialize(schedule, token);
      }

      const targetDate = options.date ? DateTime.fromISO(options.date) : DateTime.now();

      if (!targetDate.isValid) {
        console.error('❌ Invalid date format. Use YYYY-MM-DD');
        process.exit(1);
      }

      console.log(
        `🚀 ${options.dryRun ? 'Dry run' : 'Running'} scheduler for ${targetDate.toISODate()}...\n`,
      );

      const result = await scheduler.run(targetDate);

      if (result.success) {
        if (result.action === 'no_change') {
          console.log('ℹ️  No changes made');
          console.log(`   ${result.message}`);
        } else if (result.action === 'update_status') {
          console.log(`✅ Status ${options.dryRun ? 'would be' : ''} updated`);
          console.log(`   Text: "${result.status.text}"`);
          console.log(`   Emoji: ${result.status.emoji}`);
          console.log(`   Rule: ${result.rule}`);
        } else if (result.action === 'clear_status') {
          console.log(`🗑️  Status ${options.dryRun ? 'would be' : ''} cleared`);
        }
      } else {
        console.error('❌ Scheduler failed');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Run failed:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

/**
 * Test command - test Slack token and connection
 */
program
  .command('test')
  .description('Test Slack token and connection')
  .option('-t, --token <token>', 'Slack user token (or set SLACK_TOKEN env var)')
  .option('-v, --verbose', 'Show detailed information')
  .action(async options => {
    try {
      const token = options.token || process.env.SLACK_TOKEN;

      if (!token) {
        console.error(
          '❌ Slack token required. Use --token option or set SLACK_TOKEN environment variable',
        );
        process.exit(1);
      }

      console.log('🔐 Testing Slack connection...\n');

      const result = await safeTestToken(token, {
        logger: options.verbose ? console : { error: console.error },
      });

      if (result.success) {
        console.log('✅ Connection successful!');
        console.log(`   User: ${result.user}`);
        console.log(`   Team: ${result.team}`);
        console.log(`   Required permissions: ${result.hasRequiredPermissions ? '✅' : '❌'}`);

        if (!result.hasRequiredPermissions) {
          console.log(`   Permission error: ${result.permissionError}`);
          console.log('\n💡 To fix: Make sure your token has the "users.profile:write" scope');
          process.exit(1);
        }
      } else {
        console.error('❌ Connection failed:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    }
  });

/**
 * Info command - show information about a schedule
 */
program
  .command('info')
  .description('Show detailed information about a schedule')
  .argument('<schedule>', 'Path to schedule.json file')
  .action(async schedulePath => {
    try {
      const scheduleContent = await readFile(schedulePath, 'utf8');
      const schedule = JSON.parse(scheduleContent);

      const validation = validateSchedule(schedule);

      console.log('📋 Schedule Information\n');
      console.log(`File: ${schedulePath}`);
      console.log(`Version: ${schedule.version || 'Not specified'}`);
      console.log(`Timezone: ${schedule.timezone}`);
      console.log(`Valid: ${validation.valid ? '✅' : '❌'}`);

      if (!validation.valid) {
        console.log('\n❌ Validation errors:');
        validation.errors.forEach(error => {
          console.log(`   • ${error}`);
        });
        return;
      }

      console.log(`\n📝 Rules (${schedule.rules.length}):`);
      schedule.rules.forEach((rule, index) => {
        console.log(`\n${index + 1}. ${rule.id || 'Unnamed Rule'}`);
        console.log(`   Type: ${rule.type}`);
        console.log(`   Status: "${rule.status.text}" ${rule.status.emoji}`);

        switch (rule.type) {
          case 'weekly':
            console.log(`   Days: ${rule.days.join(', ')}`);
            break;
          case 'every_n_days':
            console.log(`   Start: ${rule.start_date}`);
            console.log(`   Interval: Every ${rule.interval_days} days`);
            break;
          case 'dates':
            console.log(
              `   Dates: ${rule.dates.slice(0, 3).join(', ')}${rule.dates.length > 3 ? '...' : ''}`,
            );
            break;
        }

        if (rule.time) {
          console.log(`   Time: ${rule.time}`);
        }

        console.log(`   ${getNextExecutionDescription(rule, schedule.timezone)}`);
      });

      if (schedule.options) {
        console.log('\n⚙️  Options:');
        if (schedule.options.clear_when_no_match !== undefined) {
          console.log(`   Clear when no match: ${schedule.options.clear_when_no_match}`);
        }
        if (schedule.options.log_level) {
          console.log(`   Log level: ${schedule.options.log_level}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to read schedule info:', error.message);
      process.exit(1);
    }
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, _promise) => {
  console.error('❌ Unhandled promise rejection:', reason);
  process.exit(1);
});

// Parse arguments
program.parse();
