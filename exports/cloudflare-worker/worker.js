/**
 * Slack Status Scheduler - Cloudflare Worker
 *
 * This worker runs the Slack Status Scheduler in a Cloudflare Worker environment.
 * It can be triggered by cron triggers or HTTP requests to update Slack status
 * based on your schedule configuration.
 *
 * Setup:
 * 1. Deploy this worker to Cloudflare
 * 2. Set environment variables: SLACK_TOKEN, SCHEDULE_CONFIG
 * 3. Configure cron triggers for automatic execution
 * 4. Optionally set up HTTP triggers for manual execution
 */

// Core scheduler logic - minimal implementation for Worker environment
class SlackStatusScheduler {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://slack.com/api';
  }

  async setStatus(text, emoji, expirationUnixTimestamp = 0) {
    const profile = {
      status_text: text,
      status_emoji: emoji,
      status_expiration: expirationUnixTimestamp
    };

    const response = await fetch(`${this.baseURL}/users.profile.set`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ profile: JSON.stringify(profile) })
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    return result;
  }

  async clearStatus() {
    return await this.setStatus('', '', 0);
  }

  evaluateSchedule(schedule, currentTime = new Date()) {
    if (!schedule || !schedule.rules) {
      throw new Error('Invalid schedule configuration');
    }

    // Convert current time to timestamp for easier comparison
    const now = currentTime.getTime();

    // Find the first matching rule (first-match-wins)
    for (const rule of schedule.rules) {
      if (this.matchesRule(rule, currentTime)) {
        return {
          shouldUpdate: true,
          rule: rule,
          status: rule.status,
          expirationTime: this.calculateExpiration(rule, currentTime)
        };
      }
    }

    return { shouldUpdate: false };
  }

  matchesRule(rule, currentTime) {
    const now = new Date(currentTime);

    // Convert rule time to today's datetime in the rule's timezone
    const ruleTime = this.parseTimeInTimezone(rule.time, rule.tz, now);
    const ruleEndTime = new Date(ruleTime.getTime() + (rule.duration_minutes || 0) * 60000);

    // Check if current time is within the rule's active period
    if (now < ruleTime || now > ruleEndTime) {
      return false;
    }

    switch (rule.type) {
      case 'weekly':
        return this.matchesWeeklyRule(rule, now);
      case 'every_n_days':
        return this.matchesEveryNDaysRule(rule, now);
      case 'dates':
        return this.matchesDateRule(rule, now);
      default:
        return false;
    }
  }

  matchesWeeklyRule(rule, date) {
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDay = dayNames[date.getDay()];
    return rule.days && rule.days.includes(currentDay);
  }

  matchesEveryNDaysRule(rule, date) {
    const startDate = new Date(rule.start_date + 'T00:00:00');
    const daysDiff = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
    return daysDiff >= 0 && daysDiff % rule.interval_days === 0;
  }

  matchesDateRule(rule, date) {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    return rule.dates && rule.dates.includes(dateStr);
  }

  parseTimeInTimezone(timeStr, timezone, referenceDate) {
    // Simple time parsing - in a full implementation, you'd use a proper timezone library
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(referenceDate);
    date.setHours(hours, minutes, 0, 0);

    // Basic timezone offset handling (this is simplified)
    // In production, you'd want to use a proper timezone library
    const timezoneOffsets = {
      'America/Los_Angeles': -8,
      'America/New_York': -5,
      'Europe/London': 0,
      'UTC': 0
    };

    const offset = timezoneOffsets[timezone] || 0;
    date.setHours(date.getHours() - offset);

    return date;
  }

  calculateExpiration(rule, currentTime) {
    if (!rule.duration_minutes) {
      return 0; // Never expire
    }

    const ruleTime = this.parseTimeInTimezone(rule.time, rule.tz, currentTime);
    return Math.floor((ruleTime.getTime() + rule.duration_minutes * 60000) / 1000);
  }
}

// Cloudflare Worker event handlers
export default {
  async scheduled(event, env, ctx) {
    console.log('Cron trigger executed at:', new Date().toISOString());
    return await handleSchedulerExecution(env, { trigger: 'cron', scheduledTime: event.scheduledTime });
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle different endpoints
    switch (url.pathname) {
      case '/':
        return new Response('Slack Status Scheduler Worker is running!', {
          headers: { 'Content-Type': 'text/plain' }
        });

      case '/run':
        return await handleSchedulerExecution(env, {
          trigger: 'http',
          dryRun: url.searchParams.get('dry_run') === 'true'
        });

      case '/status':
        return await handleStatusCheck(env);

      case '/preview':
        return await handlePreview(env);

      default:
        return new Response('Not Found', { status: 404 });
    }
  }
};

async function handleSchedulerExecution(env, options = {}) {
  const startTime = Date.now();
  const logs = [];

  try {
    // Validate environment variables
    if (!env.SLACK_TOKEN) {
      throw new Error('SLACK_TOKEN environment variable is required');
    }

    if (!env.SCHEDULE_CONFIG) {
      throw new Error('SCHEDULE_CONFIG environment variable is required');
    }

    // Parse schedule configuration
    let schedule;
    try {
      schedule = JSON.parse(env.SCHEDULE_CONFIG);
    } catch (error) {
      throw new Error(`Invalid schedule configuration JSON: ${error.message}`);
    }

    // Initialize scheduler
    const scheduler = new SlackStatusScheduler(env.SLACK_TOKEN);
    const currentTime = new Date();

    logs.push(`Scheduler execution started at ${currentTime.toISOString()}`);
    logs.push(`Trigger: ${options.trigger || 'unknown'}`);
    logs.push(`Dry run: ${options.dryRun || false}`);

    // Evaluate schedule
    const evaluation = scheduler.evaluateSchedule(schedule, currentTime);

    if (evaluation.shouldUpdate) {
      logs.push(`Found matching rule: ${evaluation.rule.id}`);
      logs.push(`Status: "${evaluation.status.text}" ${evaluation.status.emoji}`);

      if (options.dryRun) {
        logs.push('DRY RUN: Would update status but skipping actual API call');
      } else {
        // Update Slack status
        await scheduler.setStatus(
          evaluation.status.text,
          evaluation.status.emoji,
          evaluation.expirationTime
        );
        logs.push('✅ Status updated successfully');
      }
    } else {
      logs.push('No matching rules found - no status update needed');
    }

    const duration = Date.now() - startTime;
    logs.push(`Execution completed in ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      timestamp: currentTime.toISOString(),
      trigger: options.trigger,
      dryRun: options.dryRun || false,
      evaluation: {
        shouldUpdate: evaluation.shouldUpdate,
        ruleId: evaluation.rule?.id,
        status: evaluation.status
      },
      duration: duration,
      logs: logs
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logs.push(`❌ Error: ${error.message}`);

    console.error('Scheduler execution failed:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      trigger: options.trigger,
      duration: duration,
      logs: logs
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleStatusCheck(env) {
  try {
    if (!env.SLACK_TOKEN) {
      return new Response(JSON.stringify({ error: 'SLACK_TOKEN not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Test Slack API connection
    const response = await fetch('https://slack.com/api/auth.test', {
      headers: {
        'Authorization': `Bearer ${env.SLACK_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    return new Response(JSON.stringify({
      worker_status: 'healthy',
      slack_connection: result.ok ? 'connected' : 'failed',
      slack_user: result.user || 'unknown',
      slack_team: result.team || 'unknown',
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      worker_status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handlePreview(env) {
  try {
    if (!env.SCHEDULE_CONFIG) {
      throw new Error('SCHEDULE_CONFIG environment variable is required');
    }

    const schedule = JSON.parse(env.SCHEDULE_CONFIG);
    const scheduler = new SlackStatusScheduler('dummy-token');
    const currentTime = new Date();

    // Generate preview for next 24 hours
    const preview = [];
    for (let hour = 0; hour < 24; hour++) {
      const testTime = new Date(currentTime.getTime() + hour * 60 * 60 * 1000);
      const evaluation = scheduler.evaluateSchedule(schedule, testTime);

      if (evaluation.shouldUpdate) {
        preview.push({
          time: testTime.toISOString(),
          rule_id: evaluation.rule.id,
          status_text: evaluation.status.text,
          status_emoji: evaluation.status.emoji,
          expires_at: evaluation.expirationTime ? new Date(evaluation.expirationTime * 1000).toISOString() : null
        });
      }
    }

    return new Response(JSON.stringify({
      current_time: currentTime.toISOString(),
      preview_period: '24 hours',
      upcoming_changes: preview
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
