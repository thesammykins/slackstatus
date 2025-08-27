# Troubleshooting Guide

This guide helps you troubleshoot common issues with the Slack Status Scheduler.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Token Issues](#token-issues)
- [Schedule Configuration Issues](#schedule-configuration-issues)
- [Timezone Issues](#timezone-issues)
- [CLI Issues](#cli-issues)
- [macOS App Issues](#macos-app-issues)
- [Export Issues](#export-issues)
- [Performance Issues](#performance-issues)

## Installation Issues

### Node.js Version Error

**Error:** `node: --experimental-vm-modules` **Solution:** Ensure you're using
Node.js 18 or later:

```bash
node --version
# Should show v18.0.0 or higher
```

If you need to upgrade Node.js:

```bash
# Using nvm (recommended)
nvm install 18
nvm use 18

# Or download from nodejs.org
```

### Module Import Errors

**Error:** `SyntaxError: Cannot use import statement outside a module`
**Solution:** Ensure your `package.json` has `"type": "module"`:

```json
{
  "type": "module"
}
```

### Permission Issues

**Error:** `EACCES: permission denied` **Solution:** Don't use `sudo` with npm.
Fix permissions:

```bash
# Fix npm permissions
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## Token Issues

### Invalid Token Format

**Error:** `Token must be a user token starting with xoxp-` **Solution:** Ensure
you're using a user token, not a bot token:

1. Go to [Slack API: Your Apps](https://api.slack.com/apps)
2. Select your app
3. Go to "OAuth & Permissions"
4. Copy the "User OAuth Token" (starts with `xoxp-`)
5. NOT the "Bot User OAuth Token" (starts with `xoxb-`)

### Missing Permissions

**Error:** `Token missing users.profile:write scope` **Solution:** Add the
required scope to your Slack app:

1. Go to [Slack API: Your Apps](https://api.slack.com/apps)
2. Select your app
3. Go to "OAuth & Permissions"
4. Under "Scopes" → "User Token Scopes", add:
   - `users.profile:write`
5. Reinstall the app to your workspace
6. Copy the new token

### Token Not Working

**Error:** `Connection test failed` **Solution:** Test your token:

```bash
# Test token directly
npm run cli test --token xoxp-your-token-here

# Check token with curl
curl -H "Authorization: Bearer xoxp-your-token-here" \
     https://slack.com/api/auth.test
```

## Schedule Configuration Issues

### Validation Errors

**Error:** `Schedule configuration is invalid` **Solution:** Use the validator
to see specific issues:

```bash
npm run cli validate schedule.json --verbose
```

Common validation issues:

1. **Invalid timezone**: Use IANA timezone names

   ```json
   "timezone": "America/Los_Angeles"  // ✓ Correct
   "timezone": "PST"                  // ✗ Incorrect
   ```

2. **Invalid day format**: Use 3-letter abbreviations

   ```json
   "days": ["mon", "tue", "wed"]      // ✓ Correct
   "days": ["Monday", "Tuesday"]      // ✗ Incorrect
   ```

3. **Invalid time format**: Use HH:MM format

   ```json
   "time": "09:00"                    // ✓ Correct
   "time": "9am"                      // ✗ Incorrect
   ```

4. **Emoji format**: Use Unicode emojis or Slack emoji codes

   ```json
   "emoji": "💻"                      // ✓ Correct (Unicode)
   "emoji": ":computer:"              // ✓ Correct (Slack code)
   "emoji": "laptop"                  // ✗ Incorrect (no colons)
   ```

   **Note**: Unicode emojis (like 💻) work in all Slack workspaces, while custom
   Slack emojis (like `:custom_emoji:`) only work if they exist in your specific
   workspace. If you get a `profile_status_set_failed_not_valid_emoji` error,
   the emoji doesn't exist in your workspace - try using a standard Unicode
   emoji instead.

### Rules Not Matching

**Problem:** Rules aren't triggering when expected **Solution:** Use preview to
debug:

```bash
# Preview specific date
npm run cli preview schedule.json --date 2024-01-15

# Preview next week
npm run cli preview schedule.json --next 7 --verbose
```

Check:

1. **Timezone**: Ensure rule time is in schedule timezone
2. **Date format**: Verify dates are YYYY-MM-DD
3. **Rule order**: First matching rule wins
4. **Time constraints**: Rules with `time` only execute at/after that time

### Interval Rules Not Working

**Problem:** `every_n_days` rules not matching expected dates **Solution:**

1. Count days from `start_date`:

   ```bash
   # Day 0: start_date
   # Day 3: start_date + 3 days
   # Day 6: start_date + 6 days
   ```

2. Check if `only_weekdays` is excluding weekends

3. Verify calculation:
   ```bash
   # Use info command to see next execution
   npm run cli info schedule.json
   ```

## Timezone Issues

### Wrong Time Execution

**Problem:** Rules executing at wrong time **Solution:**

1. **Check system timezone**:

   ```bash
   timedatectl status  # Linux
   date                # macOS/Linux
   ```

2. **Verify schedule timezone**:

   ```json
   {
     "timezone": "America/Los_Angeles" // Must match your intended timezone
   }
   ```

3. **Test with specific timezone**:
   ```bash
   TZ=America/Los_Angeles npm run cli preview schedule.json
   ```

### DST Transitions

**Problem:** Rules behaving strangely during DST changes **Solution:** The
scheduler handles DST automatically, but be aware:

1. **Spring Forward**: 2 AM becomes 3 AM (lost hour)
2. **Fall Back**: 2 AM happens twice (gained hour)
3. Rules with specific times may shift by an hour

Test around DST transitions:

```bash
# Test spring forward (March)
npm run cli preview schedule.json --date 2024-03-10

# Test fall back (November)
npm run cli preview schedule.json --date 2024-11-03
```

## CLI Issues

### Command Not Found

**Error:** `command not found: slack-status-cli` **Solution:**

1. **Use npm run cli**:

   ```bash
   npm run cli -- validate schedule.json
   ```

2. **Or install globally** (not recommended):
   ```bash
   npm install -g .
   slack-status-cli validate schedule.json
   ```

### Permission Denied on macOS

**Error:** `Permission denied` when running CLI **Solution:**

```bash
# Make CLI executable
chmod +x cli/index.js

# Or run with node directly
node cli/index.js validate schedule.json
```

### Import Path Errors

**Error:** `Cannot resolve module` **Solution:** Ensure you're running from the
project root:

```bash
cd slack_status
npm run cli -- validate schedule.json
```

## macOS App Issues

### App Won't Start

**Problem:** macOS app doesn't launch **Solution:**

1. **Check macOS version**: Requires macOS 12+
2. **Check security settings**: Allow app in System Preferences → Security
3. **Check logs**: Open Console.app and filter for "SlackStatus"

### Keychain Access Issues

**Problem:** Can't save token to Keychain **Solution:**

1. **Grant Keychain access**: Allow when prompted
2. **Reset Keychain**: Delete existing entries in Keychain Access
3. **Check permissions**: Ensure app has Keychain access in System Preferences

### Menu Bar Icon Missing

**Problem:** App running but no menu bar icon **Solution:**

1. **Check menu bar**: Look in the far right of menu bar
2. **Reset preferences**: Delete app preferences and restart
3. **Check display settings**: Some external monitors hide menu bar icons

## Export Issues

### GitHub Actions Not Running

**Problem:** Exported workflow doesn't execute **Solution:**

1. **Check workflow file**: Must be in `.github/workflows/`
2. **Check syntax**: Validate YAML syntax
3. **Check schedule**: Use UTC time in cron expressions
4. **Check secrets**: Ensure `SLACK_TOKEN` is set in repository secrets
5. **Check permissions**: Repository must allow Actions

Example working workflow:

```yaml
name: Slack Status Update
on:
  schedule:
    - cron: '0 17 * * 1-5' # 5 PM UTC, Mon-Fri
jobs:
  update-status:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install
      - run: npm run cli run schedule.json
        env:
          SLACK_TOKEN: ${{ secrets.SLACK_TOKEN }}
```

### Cloudflare Worker Issues

**Problem:** Worker not executing or failing **Solution:**

1. **Check deployment**: Ensure worker is deployed and enabled
2. **Check triggers**: Verify cron triggers are configured
3. **Check secrets**: Ensure environment variables are set
4. **Check logs**: View worker logs in Cloudflare dashboard
5. **Test worker**: Use worker test interface

### Schedule Not Converting to UTC

**Problem:** Exported schedules running at wrong time **Solution:**

The exporter should convert times to UTC. If not working:

1. **Manual conversion**: Convert your local time to UTC
2. **Use online converter**: Search "cron timezone converter"
3. **Test with different times**: Use a time that's obviously different

## Performance Issues

### Slow Execution

**Problem:** Scheduler takes too long to run **Solution:**

1. **Reduce rules**: Fewer rules = faster evaluation
2. **Optimize rule order**: Put most common rules first
3. **Check network**: Slow Slack API responses
4. **Increase timeout**: In schedule options:
   ```json
   {
     "options": {
       "retry_attempts": 1,
       "retry_delay_ms": 500
     }
   }
   ```

### Memory Issues

**Problem:** High memory usage **Solution:**

1. **Restart application**: Memory leaks in long-running processes
2. **Reduce logging**: Set log level to 'error'
3. **Check for loops**: Infinite retry loops

## Getting Help

### Enable Debug Logging

Add verbose logging to see what's happening:

```bash
# CLI with debug logs
npm run cli -- run schedule.json --verbose

# Set log level in schedule
{
  "options": {
    "log_level": "debug"
  }
}
```

### Check Version Compatibility

Ensure compatible versions:

```bash
node --version    # >= 18.0.0
npm --version     # >= 8.0.0
```

### Test in Isolation

Create minimal test case:

```json
{
  "version": 1,
  "timezone": "UTC",
  "rules": [
    {
      "id": "test",
      "type": "dates",
      "dates": ["2024-01-01"],
      "status": {
        "text": "Test",
        "emoji": ":test_tube:"
      }
    }
  ]
}
```

### Report Issues

When reporting issues, include:

1. **Error messages**: Full error output
2. **Configuration**: Sanitized schedule.json
3. **Environment**: OS, Node version, npm version
4. **Steps to reproduce**: Exact commands run
5. **Expected vs actual**: What should happen vs what happens

### Community Resources

- **GitHub Issues**: Report bugs and feature requests
- **Discussions**: Ask questions and share tips
- **Examples**: Check `examples/` directory for working configurations

## FAQ

**Q: Can I use multiple schedules?** A: No, use one schedule file with multiple
rules.

**Q: Can I test without a Slack token?** A: Yes, use `--dry-run` or `preview`
commands.

**Q: Why isn't my weekend rule working?** A: Check if another rule has
`only_weekdays: true` that's matching first.

**Q: Can I use custom emojis?** A: Yes, use the custom emoji shortcode like
`:custom_emoji:`

**Q: How do I schedule for different timezones?** A: Use one timezone in the
schedule, rules will be evaluated in that timezone.

**Q: Can I run multiple status updates per day?** A: Yes, create multiple rules
with different times.
