#!/usr/bin/env node

/**
 * Script to create a proper package.json for the scheduler directory
 * This ensures ES modules work correctly and dependencies are resolvable
 */

const fs = require('fs');
const path = require('path');

function createSchedulerPackage() {
  const schedulerDir = path.join(__dirname, '..', 'scheduler');
  const packageJsonPath = path.join(schedulerDir, 'package.json');

  // Ensure scheduler directory exists
  if (!fs.existsSync(schedulerDir)) {
    console.error('Scheduler directory does not exist. Run copy-scheduler first.');
    process.exit(1);
  }

  // Create package.json content that enables ES modules
  // and ensures proper dependency resolution
  const packageJson = {
    type: 'module',
    name: 'slack-status-scheduler-core',
    version: '1.0.0',
    description: 'Core scheduler logic for Slack Status Scheduler',
    main: 'index.js',
    dependencies: {
      luxon: '^3.4.4',
      '@slack/web-api': '^7.6.0',
    },
  };

  try {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Created scheduler package.json');
    console.log('ℹ️  Dependencies will be resolved from main app node_modules');
  } catch (error) {
    console.error('❌ Failed to create scheduler package.json:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createSchedulerPackage();
}

module.exports = { createSchedulerPackage };
