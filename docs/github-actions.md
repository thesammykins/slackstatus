# GitHub Actions Deployment Guide

This guide shows you how to deploy the Slack Status Scheduler using GitHub Actions for automated status updates. With this approach, your status updates run in the cloud on GitHub's infrastructure, so you don't need to keep your computer running.

## Overview

GitHub Actions will:
- Run your schedule automatically based on cron timing
- Update your Slack status according to your rules
- Handle timezone conversions and DST automatically
- Provide logs and error notifications
- Cost nothing for public repositories (free tier limits apply to private repos)

## Prerequisites

1. **GitHub account** with a repository to store your configuration
2. **Slack user token** with `users.profile:write` permission
3. **Schedule configuration** file (`schedule.json`)

## Step 1: Get Your Slack Token

### Option A: Create a Personal Slack App (Recommended)

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Enter app name: `"My Status Scheduler"` and select your workspace
4. Go to **"OAuth & Permissions"** in the sidebar
5. Under **"Scopes"**, add these **User Token Scopes**:
   - `users.profile:write` (required)
   - `users.profile:read` (optional, for current status checking)
6. Click **"Install to Workspace"** at the top
7. Copy the **"User OAuth Token"** (starts with `xoxp-`)

### Option B: Use Existing App Token

If you already have a Slack app with the right permissions, just copy the User OAuth Token.

⚠️ **Important**: Use a **User Token** (`xoxp-`), not a Bot Token (`xoxb-`). Bot tokens cannot update user status.

## Step 2: Create Your Repository

### Option A: Fork the Main Repository

1. Go to the main Slack Status Scheduler repository
2. Click **"Fork"** to create your own copy
3. Clone your fork locally:
   ```bash
   git clone https://github.com/thesammykins/slackstatus.git
   cd slackstatus
   ```

### Option B: Create a New Repository

1. Create a new repository on GitHub
2. Clone it locally and add the workflow file:
   1. **Clone your fork and set up the workflow**:
      ```bash
      git clone https://github.com/YOUR_USERNAME/your-schedule-repo.git
      cd your-schedule-repo
   
      # Create the workflow directory
      mkdir -p .github/workflows
   
      # Copy the workflow file from the exports directory
      curl -o .github/workflows/slack-status-scheduler.yml \
        https://raw.githubusercontent.com/thesammykins/slackstatus/main/exports/github-actions/slack-status-scheduler.yml
      ```

## Step 3: Configure Your Schedule

Create a `schedule.json` file in your repository root. Here's a simple example:

```json
{
  "version": 1,
  "description": "Daily work schedule",
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
    },
    {
      "id": "end-of-day",
      "type": "weekly",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "time": "17:00",
      "tz": "America/Los_Angeles",
      "status": {
        "text": "Done for the day",
        "emoji": ":wave:"
      },
      "duration_minutes": 900
    }
  ]
}
```

For more examples, see the `examples/` directory.

## Step 4: Add Your Slack Token as a Secret

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `SLACK_TOKEN`
5. Value: Your Slack user token (the `xoxp-` token from Step 1)
6. Click **"Add secret"**

⚠️ **Security**: Never put your token directly in code files. Always use GitHub Secrets.

## Step 5: Customize the Workflow Schedule

Edit `.github/workflows/slack-status-scheduler.yml` to adjust when the scheduler runs:

```yaml
on:
  schedule:
    # Run every 15 minutes during work hours (9 AM - 6 PM PST, Mon-Fri)
    - cron: '*/15 9-18 * * 1-5'
    # Weekend checks (every 4 hours)
    - cron: '0 */4 * * 0,6'
```

### Cron Schedule Examples

- `*/15 * * * *` - Every 15 minutes (more responsive, uses more Actions minutes)
- `*/30 9-18 * * 1-5` - Every 30 minutes, 9 AM-6 PM, weekdays only
- `0 */2 * * *` - Every 2 hours
- `0 9,12,17 * * 1-5` - At 9 AM, 12 PM, and 5 PM on weekdays

**Tip**: Use [crontab.guru](https://crontab.guru/) to validate your cron expressions.

## Step 6: Test Your Setup

### Test Locally First

```bash
# Install the scheduler locally
git clone https://github.com/thesammykins/slackstatus.git temp-scheduler
cd temp-scheduler
npm install

# Validate your schedule
node cli/index.js validate --schedule ../schedule.json

# Preview upcoming changes
node cli/index.js preview --schedule ../schedule.json --days 1

# Test with dry-run
SLACK_TOKEN=your-token node cli/index.js run ../schedule.json --dry-run
```

### Test on GitHub Actions

1. Commit and push your files:
   ```bash
   git add .
   git commit -m "Add Slack status scheduler configuration"
   git push origin main
   ```

2. **The workflow file is ready to use** (URLs are already configured for the main repository)
3. Go to your repository → **Actions** tab
4. Click **"Slack Status Scheduler"** workflow
5. Click **"Run workflow"** dropdown
6. Check **"Run in dry-run mode"** 
7. Click **"Run workflow"**

This will test everything without actually changing your status.

## Step 7: Enable Automatic Scheduling

Once your test run succeeds:

1. Go back to **Actions** → **"Slack Status Scheduler"**
2. Run the workflow again without dry-run mode
3. Check the logs to ensure your status was updated

The workflow will now run automatically according to your cron schedule.

## Monitoring and Troubleshooting

### Check Workflow Logs

1. Go to **Actions** tab in your repository
2. Click on any workflow run to see detailed logs
3. Each step shows validation, preview, and execution results

### Common Issues

**❌ "SLACK_TOKEN secret not found"**
- Solution: Add your Slack token as a repository secret (see Step 4)

**❌ "Invalid token"**
- Check that you're using a User Token (`xoxp-`), not a Bot Token (`xoxb-`)
- Ensure the token has `users.profile:write` scope
- Verify the token is still valid (doesn't expire)

**❌ "Schedule file not found"**
- Ensure `schedule.json` is in your repository root
- Check the file name spelling and case sensitivity

**❌ "Rule validation failed"**
- Validate your schedule locally first: `node cli/index.js validate --schedule schedule.json`
- Check JSON syntax with a validator
- Verify timezone names and time formats

**❌ "Network or API errors"**
- Usually temporary Slack API issues
- The workflow will retry on the next scheduled run
- Check [Slack API Status](https://status.slack.com/)

### Adjust Frequency

If you're hitting GitHub Actions usage limits:
- Reduce frequency (e.g., every 30 minutes instead of 15)
- Run only during work hours
- Use fewer weekend checks

### Notifications

Enable GitHub notifications for failed workflows:
1. Go to your GitHub notification settings
2. Enable "Actions" notifications
3. You'll get emails when workflows fail

## Advanced Configuration

### Multiple Schedule Files

You can use different schedules for different contexts:

```yaml
# In the workflow file
env:
  SCHEDULE_FILE: ${{ github.event.inputs.schedule_file || 'work-schedule.json' }}
```

### Environment-Specific Schedules

Create different branches for different environments:
- `main` - Your regular work schedule
- `vacation` - Vacation auto-responder
- `conference` - Conference/travel schedule

### Custom Timezone

The scheduler respects the timezone in your `schedule.json` rules, but you can set a default for logging:

```yaml
env:
  TZ: America/New_York  # Adjust to your timezone
```

## Security Best Practices

1. **Never commit tokens**: Always use GitHub Secrets
2. **Use user tokens**: Bot tokens can't update user status
3. **Minimal permissions**: Only add required Slack scopes
4. **Regular rotation**: Regenerate tokens periodically
5. **Private repositories**: Consider using private repos for sensitive schedules

## Cost Considerations

- **Public repositories**: Free (unlimited GitHub Actions minutes)
- **Private repositories**: 2,000 free minutes/month, then paid
- **Typical usage**: ~50-100 minutes/month depending on frequency

Running every 15 minutes uses roughly:
- ~1 minute per run × 4 runs/hour × 10 hours/day × 22 workdays = ~880 minutes/month

## Migration and Backup

### Export Your Configuration

```bash
# Backup your schedule
cp schedule.json backup-schedule-$(date +%Y%m%d).json

# Export workflow history (manual)
# Go to Actions tab → Download logs for important runs
```

### Switch to Local or macOS App

You can later migrate to the macOS app or local running:
1. Your `schedule.json` file is portable
2. Export/import your token through the macOS Keychain
3. Disable the GitHub Actions workflow when not needed

## Next Steps

Once your GitHub Actions deployment is working:

1. **Fine-tune your schedule** based on how it works in practice
2. **Add more rules** for different scenarios (meetings, vacation, etc.)
3. **Consider the macOS app** for easier editing and local control
4. **Set up multiple schedules** for different work patterns

For more help, see:
- [Troubleshooting Guide](troubleshooting.md)
- [API Documentation](api.md)
- [Example Schedules](../examples/)

## Support

If you run into issues:
1. Check the troubleshooting guide
2. Validate your schedule locally first
3. Test with dry-run mode
4. Check GitHub Actions logs for specific errors
5. Open an issue in the main repository with logs and configuration