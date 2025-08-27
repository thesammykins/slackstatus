# Cloudflare Worker Deployment Guide

This guide shows you how to deploy the Slack Status Scheduler as a Cloudflare Worker for serverless, global status updates. Cloudflare Workers offer excellent performance, generous free tier limits, and automatic scaling.

## Overview

Cloudflare Workers will:
- Run your schedule automatically using cron triggers
- Update your Slack status with sub-second latency worldwide
- Handle timezone conversions and DST automatically
- Provide HTTP endpoints for manual triggering and monitoring
- Cost very little (10,000 free requests per day, 100,000 free cron triggers per month)

## Prerequisites

1. **Cloudflare account** (free tier works fine)
2. **Node.js and npm** installed locally
3. **Slack user token** with `users.profile:write` permission
4. **Schedule configuration** file (`schedule.json`)

## Step 1: Get Your Slack Token

### Create a Personal Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Enter app name: `"My Status Scheduler"` and select your workspace
4. Go to **"OAuth & Permissions"** in the sidebar
5. Under **"Scopes"**, add these **User Token Scopes**:
   - `users.profile:write` (required)
   - `users.profile:read` (optional, for status checking)
6. Click **"Install to Workspace"** at the top
7. Copy the **"User OAuth Token"** (starts with `xoxp-`)

⚠️ **Important**: Use a **User Token** (`xoxp-`), not a Bot Token (`xoxb-`). Bot tokens cannot update user status.

## Step 2: Install Wrangler CLI

Wrangler is Cloudflare's command-line tool for managing Workers.

```bash
# Install Wrangler globally
npm install -g wrangler

# Login to your Cloudflare account
wrangler login
```

This will open a browser window to authenticate with Cloudflare.

## Step 3: Set Up Your Worker Project

### Option A: Start from Template

```bash
# Create a new directory for your worker
mkdir slack-status-worker
cd slack-status-worker

# Copy the worker files from the template
curl -o worker.js https://raw.githubusercontent.com/YOUR_USERNAME/slack-status-scheduler/main/exports/cloudflare-worker/worker.js
curl -o wrangler.toml https://raw.githubusercontent.com/YOUR_USERNAME/slack-status-scheduler/main/exports/cloudflare-worker/wrangler.toml

# Initialize npm package
npm init -y
```

### Option B: Clone the Full Repository

```bash
# Clone the main repository
git clone https://github.com/YOUR_USERNAME/slack-status-scheduler.git
cd slack-status-scheduler/exports/cloudflare-worker

# Copy to a new directory for your deployment
cp -r . ~/slack-status-worker
cd ~/slack-status-worker
```

## Step 4: Configure Your Worker

### Edit wrangler.toml

```toml
name = "slack-status-scheduler"
main = "worker.js"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# Cron triggers - adjust to your timezone and needs
[[triggers]]
crons = [
  # Every 15 minutes during work hours (9 AM - 6 PM UTC)
  # Adjust the hours for your timezone
  "*/15 9-18 * * 1-5",
  # Every 2 hours on weekends
  "0 */2 * * 0,6"
]

# Resource limits
[limits]
cpu_ms = 10000
```

### Cron Schedule Examples

The cron format is: `minute hour day-of-month month day-of-week`

- `*/15 9-18 * * 1-5` - Every 15 minutes, 9 AM-6 PM, weekdays (UTC)
- `*/30 * * * *` - Every 30 minutes (more efficient)
- `0 9,12,17 * * 1-5` - At 9 AM, 12 PM, and 5 PM on weekdays
- `*/10 8-19 * * 1-5` - Every 10 minutes, 8 AM-7 PM, weekdays

**Timezone Note**: Cron triggers run in UTC. Adjust the hours based on your timezone:
- PST (UTC-8): 9 AM PST = 17 UTC, so use `*/15 17-1 * * 1-5`
- EST (UTC-5): 9 AM EST = 14 UTC, so use `*/15 14-22 * * 1-5`

Use [crontab.guru](https://crontab.guru/) to validate your expressions.

## Step 5: Set Environment Variables

### Set Your Slack Token (Secret)

```bash
# Set your Slack token as a secure secret
wrangler secret put SLACK_TOKEN

# When prompted, paste your Slack user token (xoxp-...)
```

### Set Your Schedule Configuration

First, create your `schedule.json` file:

```json
{
  "version": 1,
  "description": "My work schedule",
  "rules": [
    {
      "id": "morning-focus",
      "type": "weekly",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "time": "09:00",
      "tz": "America/Los_Angeles",
      "status": {
        "text": "In focus time",
        "emoji": ":focus:"
      },
      "duration_minutes": 120
    },
    {
      "id": "lunch-break",
      "type": "weekly",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "time": "12:00",
      "tz": "America/Los_Angeles",
      "status": {
        "text": "At lunch",
        "emoji": ":fork_and_knife:"
      },
      "duration_minutes": 60
    }
  ]
}
```

Then set it as an environment variable:

```bash
# Convert your schedule to a single-line JSON string and set it
wrangler secret put SCHEDULE_CONFIG

# When prompted, paste your schedule.json content as a single line:
# {"version":1,"rules":[{"id":"morning-focus",...}]}
```

**Tip**: Use `jq -c . schedule.json` to convert your JSON to a compact single line.

## Step 6: Deploy Your Worker

```bash
# Deploy to Cloudflare
wrangler deploy

# For development/testing, you can deploy to a staging environment
wrangler deploy --env dev
```

After deployment, you'll see output like:
```
Published slack-status-scheduler (1.23 sec)
  https://slack-status-scheduler.your-subdomain.workers.dev
```

## Step 7: Test Your Deployment

### Test the Worker Status

```bash
# Check if the worker is running
curl https://slack-status-scheduler.your-subdomain.workers.dev/

# Check Slack connection and configuration
curl https://slack-status-scheduler.your-subdomain.workers.dev/status
```

### Test with Dry Run

```bash
# Test the scheduler without actually updating your status
curl "https://slack-status-scheduler.your-subdomain.workers.dev/run?dry_run=true"
```

### Preview Upcoming Changes

```bash
# See what status changes would happen in the next 24 hours
curl https://slack-status-scheduler.your-subdomain.workers.dev/preview
```

### Manual Execution

```bash
# Manually trigger the scheduler
curl https://slack-status-scheduler.your-subdomain.workers.dev/run
```

## Step 8: Monitor and Manage

### View Logs

```bash
# Stream real-time logs
wrangler tail

# View logs for specific requests
wrangler tail --format=pretty
```

### Check Cron Trigger Status

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Your Worker**
3. Click **"Triggers"** tab to see cron schedules
4. Click **"Logs"** tab to see execution history

### Update Configuration

```bash
# Update your schedule
wrangler secret put SCHEDULE_CONFIG

# Update your token
wrangler secret put SLACK_TOKEN

# Redeploy after changes
wrangler deploy
```

## Advanced Configuration

### Custom Domain

Add a custom domain to your worker:

```toml
# In wrangler.toml
[route]
pattern = "slack-scheduler.yourcompany.com/*"
zone_name = "yourcompany.com"
```

Then deploy: `wrangler deploy`

### Multiple Environments

Set up separate environments for development and production:

```toml
# Development environment
[env.dev]
name = "slack-status-scheduler-dev"
vars = { ENV = "development" }

# Production environment
[env.production]
name = "slack-status-scheduler-prod"
vars = { ENV = "production" }
```

Deploy to specific environments:
```bash
wrangler deploy --env dev
wrangler deploy --env production
```

### KV Storage for Logs

Store execution logs in Cloudflare KV:

```toml
[[kv_namespaces]]
binding = "SCHEDULER_LOGS"
id = "your-kv-namespace-id"
```

Create a KV namespace:
```bash
wrangler kv:namespace create "SCHEDULER_LOGS"
```

### Analytics and Monitoring

Add analytics to track scheduler performance:

```toml
[[analytics_engine_datasets]]
binding = "SCHEDULER_METRICS"
```

## Security Best Practices

1. **Use Secrets**: Always use `wrangler secret put` for tokens, never put them in code
2. **Minimal Permissions**: Only grant required Slack scopes
3. **Secure Endpoints**: Consider adding authentication for HTTP endpoints
4. **Regular Token Rotation**: Regenerate Slack tokens periodically
5. **Monitor Access**: Review Cloudflare logs for unexpected access

### Optional: Add Basic Authentication

```javascript
// Add to the beginning of the fetch handler in worker.js
const auth = request.headers.get('Authorization');
if (!auth || auth !== `Bearer ${env.API_KEY}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

Then set an API key:
```bash
wrangler secret put API_KEY
```

## Troubleshooting

### Common Issues

**❌ "SLACK_TOKEN not configured"**
- Run `wrangler secret put SLACK_TOKEN` and paste your token
- Ensure you're using a User Token (`xoxp-`), not Bot Token (`xoxb-`)

**❌ "SCHEDULE_CONFIG not configured"**
- Run `wrangler secret put SCHEDULE_CONFIG`
- Paste your schedule as a single-line JSON string
- Validate JSON syntax first

**❌ "Invalid token" or "not_authed"**
- Check that your Slack token is valid and hasn't expired
- Ensure the token has `users.profile:write` scope
- Test the token manually with the Slack API

**❌ "Worker exceeded CPU time limit"**
- Simplify your schedule configuration
- Reduce the number of rules
- Consider optimizing the scheduling logic

**❌ "Cron triggers not firing"**
- Check your cron syntax with [crontab.guru](https://crontab.guru/)
- Verify you're within Cloudflare's free tier limits (100k cron triggers/month)
- Check the Cloudflare dashboard for trigger status

### Debugging

```bash
# Stream logs in real-time
wrangler tail --format=pretty

# Test locally with Wrangler dev server
wrangler dev

# Check worker analytics in Cloudflare dashboard
```

### Validation

```bash
# Validate your worker syntax
wrangler validate

# Check your environment variables
wrangler env list
```

## Cost and Limits

### Cloudflare Free Tier

- **100,000 requests per day** (more than enough for status updates)
- **100,000 cron triggers per month** 
- **10ms CPU time per request**
- **128MB memory**

### Typical Usage

Running every 15 minutes:
- ~2,880 executions per month (well within free limits)
- ~1-2ms CPU time per execution
- Minimal memory usage

### Paid Plan Benefits

If you need more (Workers Paid at $5/month):
- **10 million requests per month**
- **30 seconds CPU time per request**
- **Advanced features like Durable Objects**

## Migration and Backup

### Export Your Configuration

```bash
# Backup your current secrets (you'll need to re-enter them)
wrangler secret list

# Export your wrangler.toml
cp wrangler.toml backup-wrangler-$(date +%Y%m%d).toml
```

### Switch Between Deployment Methods

Your `schedule.json` is portable between:
- Cloudflare Workers
- GitHub Actions
- Local CLI execution
- macOS app

Just copy your configuration to the new deployment method.

## Performance Optimization

### Reduce Cold Starts

```javascript
// Pre-warm the worker by adding a simple warmup endpoint
if (url.pathname === '/warmup') {
  return new Response('Warmed up!');
}
```

### Optimize Schedule Evaluation

- Keep rules simple and specific
- Use fewer overlapping time ranges
- Consider caching schedule evaluation results

### Monitor Performance

```bash
# Check performance metrics
wrangler metrics

# View detailed analytics in Cloudflare dashboard
```

## Next Steps

Once your Cloudflare Worker is running:

1. **Monitor logs** for the first few days to ensure proper operation
2. **Fine-tune cron timing** based on your actual usage patterns
3. **Add custom endpoints** for integration with other tools
4. **Set up alerts** for failed executions
5. **Consider the macOS app** for easier schedule editing

For more help, see:
- [Troubleshooting Guide](troubleshooting.md)
- [API Documentation](api.md)
- [Example Schedules](../examples/)

## Support

If you run into issues:
1. Check the troubleshooting section above
2. Validate your schedule configuration locally first
3. Test with dry-run mode
4. Check Cloudflare Worker logs
5. Open an issue in the main repository with logs and configuration

## Comparison: Cloudflare Workers vs GitHub Actions

| Feature | Cloudflare Workers | GitHub Actions |
|---------|-------------------|----------------|
| **Cost** | Free tier: 100k requests/day | Free tier: 2000 minutes/month |
| **Latency** | <100ms worldwide | 2-5 minutes to start |
| **Reliability** | 99.99% uptime | Depends on GitHub |
| **Setup Complexity** | Medium | Easy |
| **Custom Logic** | Full JavaScript control | Limited to shell commands |
| **Monitoring** | Rich analytics | Basic workflow logs |
| **Geographic** | Global edge deployment | Single region |

**Choose Cloudflare Workers if**: You want the fastest response times, detailed analytics, and advanced customization.

**Choose GitHub Actions if**: You prefer simpler setup, already use GitHub, or want minimal configuration.