#!/usr/bin/env node

/**
 * Slack Status Demo - Example usage of the Slack Web API for status management
 *
 * This file demonstrates how to programmatically set and clear Slack status
 * using the @slack/web-api package. This is the same approach used internally
 * by the Slack Status Scheduler.
 *
 * Prerequisites:
 * 1. Install dependencies: npm install @slack/web-api
 * 2. Create a Slack app and get a user token with users.profile:write scope
 * 3. Set SLACK_TOKEN environment variable
 *
 * Usage:
 *   node examples/set_status_demo.js
 *   SLACK_TOKEN=xoxp-your-token node examples/set_status_demo.js
 */

import { WebClient } from '@slack/web-api';

// Configuration
const token = process.env.SLACK_TOKEN;
const web = new WebClient(token);

/**
 * Set Slack status with text, emoji, and optional expiration
 * @param {string} text - Status text (e.g., "In a meeting")
 * @param {string} emoji - Status emoji (e.g., ":spiral_calendar_pad:")
 * @param {number} expirationUnixTimestamp - Unix timestamp when status expires (0 = never)
 * @returns {Promise<object>} Slack API response
 */
async function setStatus(text, emoji, expirationUnixTimestamp = 0) {
  console.log(`Setting status: "${text}" ${emoji}`);
  if (expirationUnixTimestamp > 0) {
    const expireDate = new Date(expirationUnixTimestamp * 1000);
    console.log(`Expires: ${expireDate.toLocaleString()}`);
  }

  const profile = {
    status_text: text,
    status_emoji: emoji,
    status_expiration: expirationUnixTimestamp,
  };

  try {
    const result = await web.users.profile.set({
      profile: JSON.stringify(profile),
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    console.log('✅ Status updated successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to update status:', error.message);
    throw error;
  }
}

/**
 * Clear the current Slack status
 * @returns {Promise<object>} Slack API response
 */
async function clearStatus() {
  console.log('Clearing status...');
  return await setStatus('', '', 0);
}

/**
 * Get current user profile information
 * @returns {Promise<object>} User profile data
 */
async function getCurrentStatus() {
  try {
    const result = await web.users.profile.get();
    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    const profile = result.profile;
    console.log('Current status:');
    console.log(`  Text: "${profile.status_text || '(none)'}"`);
    console.log(`  Emoji: ${profile.status_emoji || '(none)'}`);

    if (profile.status_expiration && profile.status_expiration > 0) {
      const expireDate = new Date(profile.status_expiration * 1000);
      console.log(`  Expires: ${expireDate.toLocaleString()}`);
    } else {
      console.log('  Expires: Never');
    }

    return profile;
  } catch (error) {
    console.error('❌ Failed to get current status:', error.message);
    throw error;
  }
}

/**
 * Validate the Slack token and connection
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
async function validateToken() {
  try {
    const result = await web.auth.test();
    if (!result.ok) {
      console.error('❌ Token validation failed:', result.error);
      return false;
    }

    console.log('✅ Token is valid');
    console.log(`  User: ${result.user}`);
    console.log(`  Team: ${result.team}`);
    console.log(`  URL: ${result.url}`);
    return true;
  } catch (error) {
    console.error('❌ Token validation error:', error.message);
    return false;
  }
}

/**
 * Demo function showing various status operations
 */
async function runDemo() {
  console.log('🤖 Slack Status Demo\n');

  // Check token
  if (!token) {
    console.error('❌ No SLACK_TOKEN environment variable found');
    console.log('Please set your Slack user token:');
    console.log('  export SLACK_TOKEN=xoxp-your-user-token');
    console.log('\nTo get a token:');
    console.log('1. Create a Slack app at https://api.slack.com/apps');
    console.log('2. Add users.profile:write scope under OAuth & Permissions');
    console.log('3. Install the app to your workspace');
    console.log('4. Copy the "User OAuth Token" (starts with xoxp-)');
    process.exit(1);
  }

  try {
    // Validate token
    console.log('1. Validating token...');
    const isValid = await validateToken();
    if (!isValid) {
      process.exit(1);
    }
    console.log();

    // Get current status
    console.log('2. Getting current status...');
    await getCurrentStatus();
    console.log();

    // Set a temporary status (expires in 5 minutes)
    console.log('3. Setting temporary status...');
    const expireTime = Math.floor(Date.now() / 1000) + 5 * 60; // 5 minutes from now
    await setStatus('Testing status scheduler', '🧪', expireTime);
    console.log();

    // Wait a moment
    console.log('4. Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check status again
    console.log('5. Verifying status was set...');
    await getCurrentStatus();
    console.log();

    // Set a permanent status
    console.log('6. Setting permanent status...');
    await setStatus('Available for questions', '👋', 0);
    console.log();

    // Wait a moment
    console.log('7. Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Clear status
    console.log('8. Clearing status...');
    await clearStatus();
    console.log();

    // Final check
    console.log('9. Final status check...');
    await getCurrentStatus();

    console.log('\n✅ Demo completed successfully!');
    console.log('\nThis demonstrates the same API calls used by the Slack Status Scheduler.');
    console.log('Your status has been cleared and returned to its original state.');
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Example status presets (like what the scheduler might use)
const STATUS_PRESETS = {
  focus: {
    text: 'In focus time',
    emoji: '🧠',
    description: 'Deep work session',
  },
  meeting: {
    text: 'In a meeting',
    emoji: '📅',
    description: 'Unavailable for chat',
  },
  lunch: {
    text: 'At lunch',
    emoji: '🍽️',
    description: 'Taking a break',
  },
  commuting: {
    text: 'Commuting',
    emoji: '🚌',
    description: 'Traveling to/from work',
  },
  wfh: {
    text: 'Working from home',
    emoji: '🏠',
    description: 'Remote work day',
  },
  vacation: {
    text: 'On vacation',
    emoji: '🌴',
    description: 'Out of office',
  },
};

/**
 * Show available status presets
 */
function showPresets() {
  console.log('Available status presets:');
  Object.entries(STATUS_PRESETS).forEach(([key, preset]) => {
    console.log(`  ${key}: "${preset.text}" ${preset.emoji} - ${preset.description}`);
  });
}

// CLI handling
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  switch (command) {
    case 'presets':
      showPresets();
      break;
    case 'validate':
      validateToken().then(valid => process.exit(valid ? 0 : 1));
      break;
    case 'status':
      getCurrentStatus().catch(() => process.exit(1));
      break;
    case 'clear':
      clearStatus().catch(() => process.exit(1));
      break;
    case 'set':
      if (process.argv.length < 5) {
        console.error('Usage: node set_status_demo.js set "status text" ":emoji:"');
        process.exit(1);
      }
      setStatus(process.argv[3], process.argv[4]).catch(() => process.exit(1));
      break;
    default:
      if (command && command !== 'demo') {
        console.error(`Unknown command: ${command}`);
        console.log('Available commands: demo, presets, validate, status, clear, set');
        process.exit(1);
      }
      runDemo();
  }
}

// Export functions for use in other modules
export { setStatus, clearStatus, getCurrentStatus, validateToken, STATUS_PRESETS };
