# Slack Status Scheduler - macOS Menu Bar App Setup

This guide will help you set up and use the Slack Status Scheduler macOS menu
bar app.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [First-Time Setup](#first-time-setup)
- [Using the App](#using-the-app)
- [Features](#features)
- [Troubleshooting](#troubleshooting)
- [Security & Privacy](#security--privacy)
- [Development](#development)

## Prerequisites

- macOS 10.15 (Catalina) or later
- Valid Slack workspace with permission to modify your status
- Slack user token with `users.profile:write` scope

## Installation

### Option 1: Download Release (Recommended)

1. Download the latest `.dmg` file from the
   [Releases page](https://github.com/thesammykins/slackstatus/releases)
2. Open the downloaded DMG file
3. Drag "Slack Status Scheduler" to your Applications folder
4. Open Applications and launch "Slack Status Scheduler"

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/thesammykins/slackstatus.git
cd slackstatus/macos

# Install dependencies
npm install

# Run in development mode
npm run dev

# Or build for distribution
npm run build:mac
```

## First-Time Setup

### 1. Get Your Slack Token

You need a Slack user token to update your status:

1. Go to [Slack API: Your Apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Give it a name like "Status Scheduler" and select your workspace
4. Go to "OAuth & Permissions" in the sidebar
5. Add the `users.profile:write` scope under "User Token Scopes"
6. Click "Install to Workspace" and authorize the app
7. Copy the "User OAuth Token" (starts with `xoxp-`)

### 2. Configure the App

1. Click the menu bar icon to open the app
2. Go to the "Settings" tab
3. Paste your Slack token and click "Save Token"
4. Test the connection by clicking "Test Connection"

### 3. Create Your Schedule

1. Go to the "Schedule" tab
2. Set your timezone
3. Click "Add Rule" to create scheduling rules
4. Configure when you want your status to change

## Using the App

### Dashboard

The Dashboard tab shows:

- **Current Status**: What your status would be right now
- **Upcoming Changes**: Next scheduled status updates
- **Quick Actions**: Export options and manual execution

### Schedule Editor

Create and manage your scheduling rules:

- **Daily**: Status changes every day at a specific time
- **Weekly**: Status changes on specific days of the week
- **Every N Days**: Status changes every few days
- **Specific Dates**: Status changes on exact dates

#### Example Rules

```json
{
  "version": 1,
  "timezone": "America/Los_Angeles",
  "options": {
    "clear_when_no_match": false
  },
  "rules": [
    {
      "id": "morning-focus",
      "type": "weekly",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "time": "09:00",
      "status": {
        "text": "Deep work time 🧠",
        "emoji": "🧠",
        "expire_hour": 11
      },
      "enabled": true
    },
    {
      "id": "lunch-break",
      "type": "weekly",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "time": "12:00",
      "status": {
        "text": "Lunch break",
        "emoji": "🍽️",
        "expire_hour": 13
      },
      "enabled": true
    }
  ]
}
```

### Preview

Test your schedule without making actual changes:

- Preview what would happen on specific dates
- See upcoming changes for the next week
- Validate your schedule configuration

### Settings

Configure app behavior:

- **Slack Token**: Store your authentication token securely
- **App Settings**: Auto-start, notifications, logging level
- **Export Options**: Generate GitHub Actions or Cloudflare Worker configs

### Logs

Monitor app activity:

- View execution logs
- Filter by log level (Error, Warning, Info, Debug)
- Export logs for troubleshooting

## Features

### 🔐 Secure Token Storage

- Tokens are stored in macOS Keychain
- Never logged or exposed in plain text
- Encrypted at rest

### 🌍 Timezone Support

- Full timezone support with DST handling
- Configure once, works everywhere

### 📱 Menu Bar Integration

- Quick access from menu bar
- Native macOS experience
- Minimal resource usage

### 📤 Export Options

- Generate GitHub Actions workflows
- Create Cloudflare Worker scripts
- Deploy anywhere you want

### 🔄 Background Execution

- Runs silently in the background
- Auto-starts with macOS (optional)
- Low memory footprint

## Troubleshooting

### App Won't Start

1. **Check macOS Version**: Requires macOS 10.15+
2. **Security Settings**: Go to System Preferences → Security & Privacy →
   General
3. **Allow the app**: If blocked, click "Open Anyway"

### Token Issues

1. **Invalid Token Error**:
   - Verify token starts with `xoxp-`
   - Check token hasn't expired
   - Ensure `users.profile:write` scope is granted

2. **Connection Failed**:
   - Check internet connection
   - Verify Slack workspace is accessible
   - Try refreshing the token

### Schedule Not Working

1. **Check Timezone**: Ensure timezone matches your location
2. **Validate Schedule**: Use the "Validate" button in Schedule tab
3. **Check Logs**: Look for errors in the Logs tab

### Performance Issues

1. **High CPU Usage**:
   - Restart the app
   - Check for infinite loops in schedule rules
   - Reduce log level in Settings

2. **Memory Usage**:
   - Restart the app periodically
   - Clear logs if they're very large

### Menu Bar Icon Missing

1. **Custom Icon**: Follow setup in `assets/ICON_SETUP.md`
2. **Default Icon**: App will use system default if custom icon missing
3. **Restart**: Try quitting and restarting the app

## Security & Privacy

### What Data is Stored Locally

- **Slack Token**: Encrypted in macOS Keychain
- **Schedule Configuration**: Stored in app preferences
- **Logs**: Temporary app logs (can be cleared)

### What Data is Sent

- **To Slack**: Only status updates via official API
- **Nowhere Else**: No analytics, tracking, or external services

### Permissions Required

- **Keychain Access**: Store and retrieve Slack token
- **Network Access**: Communicate with Slack API
- **File System**: Read/write schedule files (user-initiated only)

### Privacy Best Practices

1. **Token Security**: Never share your Slack token
2. **Regular Updates**: Keep the app updated
3. **Log Management**: Clear logs periodically
4. **Workspace Permissions**: Only grant necessary Slack scopes

## Development

### Running from Source

```bash
# Development mode with hot reload
npm run dev

# Verbose debugging
npm run dev:verbose

# Test without installing
npm run test-app
```

### Building

```bash
# Build for current platform
npm run build

# Build for distribution
npm run dist

# Build and package for macOS
npm run build:mac
```

### Project Structure

```
macos/
├── src/
│   └── main.js          # Electron main process
├── ui/
│   ├── index.html       # Main UI
│   ├── app.js          # UI logic
│   └── styles.css      # Styles
├── assets/
│   └── icons/          # App icons
├── scripts/
│   ├── create-icon.js  # Icon generation
│   └── notarize.js     # Code signing
└── package.json        # Dependencies and build config
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on macOS
5. Submit a pull request

## Support

### Getting Help

1. **Documentation**: Check this guide and the main README
2. **GitHub Issues**: Report bugs and request features
3. **Discussions**: Ask questions in GitHub Discussions

### Reporting Issues

Please include:

- macOS version
- App version
- Steps to reproduce
- Error messages from Logs tab
- Schedule configuration (without sensitive data)

### Feature Requests

We welcome suggestions for:

- New scheduling rule types
- UI improvements
- Integration options
- Export formats

---

**Version**: 1.0.0  
**Last Updated**: 2024-08-27  
**Compatibility**: macOS 10.15+
