# Slack Status Scheduler

A native macOS menu bar app and Node.js runner for automatically scheduling Slack status updates based on configurable rules. Set your status to "In a meeting", "Working from home", or any custom message on specific days, times, or intervals.

## Features

- 🍎 **Native macOS Menu Bar App** - Clean, native interface that lives in your menu bar
- 🔒 **Secure Token Storage** - Slack tokens stored safely in macOS Keychain
- 🌍 **Timezone Aware** - Proper handling of timezones and DST transitions
- ⚡ **Export Options** - Deploy to GitHub Actions or Cloudflare Workers for remote execution
- 📅 **Flexible Scheduling** - Support for daily, weekly, interval-based, and date-specific rules
- 🔍 **Preview & Dry Run** - Test your schedule before enabling automatic updates
- 📊 **Logging & Monitoring** - View execution history and troubleshoot issues

## Quick Start

### Prerequisites

- macOS 10.15+ (for the menu bar app)
- Node.js 18+ (for the headless runner and CLI)
- A Slack workspace where you have permission to set your status

### Installation

1. **macOS Menu Bar App** (Recommended)
   ```bash
   git clone https://github.com/thesammykins/slackstatus.git
   cd slackstatus/macos
   npm install
   npm run dev  # For development
   # npm run build:mac  # For distribution
   ```

2. **CLI/Runner Only**
   ```bash
   git clone https://github.com/thesammykins/slackstatus.git
   cd slackstatus
   npm install
   ```

### Get Your Slack Token

1. Go to [Slack API: Your Apps](https://api.slack.com/apps)
2. Create a new app or use an existing one
3. Go to "OAuth & Permissions" 
4. Add the `users.profile:write` scope
5. Install the app to your workspace
6. Copy the "User OAuth Token" (starts with `xoxp-`)

### Create Your Schedule

Create a `schedule.json` file:

```json
{
  "timezone": "America/Los_Angeles",
  "rules": [
    {
      "id": "weekday-focus",
      "type": "weekly",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "time": "09:00",
      "status": {
        "text": "In focus time",
        "emoji": ":focus:",
        "expire_hour": 17
      }
    },
    {
      "id": "friday-wfh",
      "type": "weekly", 
      "days": ["fri"],
      "time": "08:00",
      "status": {
        "text": "Working from home",
        "emoji": ":house:"
      }
    }
  ]
}
```

### Test Your Setup

```bash
# Preview what would happen today (dry run)
npm run cli -- preview schedule.json

# Run once to test (requires SLACK_TOKEN environment variable)
export SLACK_TOKEN="xoxp-your-token-here"
npm run cli -- run schedule.json --dry-run
```

## Scheduling Rules

### Rule Types

#### Weekly Rules
Run on specific days of the week:
```json
{
  "type": "weekly",
  "days": ["mon", "tue", "wed", "thu", "fri"],
  "time": "09:00"
}
```

#### Interval Rules  
Run every N days from a start date:
```json
{
  "type": "every_n_days",
  "start_date": "2024-01-01",
  "interval_days": 3,
  "only_weekdays": true
}
```

#### Date-Specific Rules
Run on exact dates:
```json
{
  "type": "dates",
  "dates": ["2024-12-25", "2024-12-26", "2024-01-01"]
}
```

### Status Configuration

```json
{
  "status": {
    "text": "Your status message",
    "emoji": ":emoji_name:",
    "expire_hour": 17  // Optional: clear at 5 PM local time
  }
}
```

## Export Options

Run your schedule even when your Mac is off by exporting to cloud platforms:

### GitHub Actions (Recommended)
- Free for public repos
- Reliable scheduled execution
- Easy to set up with repository secrets

### Cloudflare Workers
- Generous free tier
- Global edge execution
- Cron-based triggers

Both options are generated automatically by the macOS app with step-by-step instructions.

## Development

### Project Structure

```
slack_status/
├── src/                    # Core scheduling logic
├── cli/                    # Command-line interface
├── macos/                  # macOS app (Electron)
├── docs/                   # Documentation
├── examples/               # Example configs and usage
├── exports/                # Export configurations
└── tests/                  # Test suites
```

### Setup Development Environment

```bash
git clone https://github.com/thesammykins/slackstatus.git
cd slackstatus
npm install

# Run tests
npm test

# Start development with file watching
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint
```

## Documentation

- [GitHub Actions Setup](docs/github-actions.md)
- [Cloudflare Worker Setup](docs/cloudflare-worker.md)
- [macOS App Guide](docs/macos-setup.md)
- [API Reference](docs/api.md)
- [Troubleshooting](docs/troubleshooting.md)

## Security & Privacy

- **Tokens never leave your control** - stored in macOS Keychain or your chosen cloud platform's secrets
- **No third-party servers** - all execution happens locally or on platforms you control
- **Open source** - audit the code yourself
- **Minimal permissions** - only requires `users.profile:write` Slack scope

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 🐛 [Report bugs](https://github.com/thesammykins/slackstatus/issues)
- 💡 [Request features](https://github.com/thesammykins/slackstatus/issues)
- 📖 [Read the docs](docs/)
- 💬 [Discussions](https://github.com/thesammykins/slackstatus/discussions)

---

**Note**: This project is in active development. The macOS app and some advanced features are coming soon. The CLI and headless runner are fully functional now.