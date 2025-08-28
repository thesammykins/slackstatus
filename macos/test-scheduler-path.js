#!/usr/bin/env node

/**
 * Test script to validate scheduler path resolution
 * This script helps debug path issues during development and after building
 */

const path = require('path');
const fs = require('fs');

// Simulate the getSchedulerPath function from main.js
function getSchedulerPath() {
  const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

  if (isDev) {
    // In development, use relative path from macos directory
    const devPath = path.resolve(process.cwd(), '../src/index.js');
    console.log('Development mode - scheduler path:', devPath);
    return devPath;
  } else {
    // In packaged app, try multiple possible locations
    const possiblePaths = [];

    // First try: resources directory (most common for packaged apps)
    if (process.resourcesPath) {
      possiblePaths.push(path.join(process.resourcesPath, 'scheduler', 'index.js'));
    }

    // Second try: alongside app.asar (if we can determine app path)
    const appPath = process.execPath;
    possiblePaths.push(path.join(path.dirname(appPath), 'scheduler', 'index.js'));

    // Third try: local copy in macos directory
    possiblePaths.push(path.join(__dirname, 'scheduler', 'index.js'));

    for (const schedulerPath of possiblePaths) {
      console.log('Checking scheduler path:', schedulerPath);
      if (fs.existsSync(schedulerPath)) {
        console.log('✅ Found scheduler at:', schedulerPath);
        return schedulerPath;
      } else {
        console.log('❌ Not found at:', schedulerPath);
      }
    }

    // If none found, return the most likely path for debugging
    const fallbackPath = possiblePaths[0] || path.join(__dirname, 'scheduler', 'index.js');
    console.warn('⚠️  Scheduler not found at any expected location. Using fallback:', fallbackPath);
    return fallbackPath;
  }
}

function testSchedulerAccess() {
  console.log('🔍 Testing Scheduler Path Resolution');
  console.log('=====================================');

  // Environment info
  console.log('Environment Info:');
  console.log('- __dirname:', __dirname);
  console.log('- process.cwd():', process.cwd());
  console.log('- process.execPath:', process.execPath);
  console.log('- process.resourcesPath:', process.resourcesPath || 'undefined');
  console.log('- NODE_ENV:', process.env.NODE_ENV || 'undefined');
  console.log('- Dev flag:', process.argv.includes('--dev'));
  console.log('');

  // Test path resolution
  const schedulerPath = getSchedulerPath();
  console.log('Resolved scheduler path:', schedulerPath);

  // Check if file exists
  const exists = fs.existsSync(schedulerPath);
  console.log('File exists:', exists ? '✅ YES' : '❌ NO');

  if (exists) {
    // Try to read basic info about the file
    try {
      const stats = fs.statSync(schedulerPath);
      console.log('File size:', stats.size, 'bytes');
      console.log('Last modified:', stats.mtime.toISOString());

      // Try to read first few lines to verify it's the right file
      const content = fs.readFileSync(schedulerPath, 'utf8');
      const firstLine = content.split('\n')[0];
      console.log('First line:', firstLine);

      // Check for expected exports
      if (content.includes('SlackStatusScheduler')) {
        console.log('✅ Contains SlackStatusScheduler export');
      } else {
        console.log('❌ Missing SlackStatusScheduler export');
      }

    } catch (error) {
      console.log('❌ Error reading file:', error.message);
    }
  } else {
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. If in development, ensure you run this from the macos/ directory');
    console.log('2. If testing production build, ensure scheduler files were copied correctly');
    console.log('3. Run "npm run copy-scheduler" to manually copy files');
    console.log('4. Check that ../src/index.js exists relative to macos directory');
  }

  console.log('');
  console.log('📁 Directory listings:');

  // List current directory
  try {
    const currentDir = fs.readdirSync('.');
    console.log('Current directory contents:', currentDir.filter(f => !f.startsWith('.')).join(', '));
  } catch (e) {
    console.log('Cannot read current directory');
  }

  // List parent directory if in dev mode
  if (process.argv.includes('--dev')) {
    try {
      const parentDir = fs.readdirSync('..');
      console.log('Parent directory contents:', parentDir.filter(f => !f.startsWith('.')).join(', '));
    } catch (e) {
      console.log('Cannot read parent directory');
    }

    // Check if ../src exists
    const srcPath = path.resolve(process.cwd(), '../src');
    if (fs.existsSync(srcPath)) {
      try {
        const srcContents = fs.readdirSync(srcPath);
        console.log('Parent src directory contents:', srcContents.join(', '));
      } catch (e) {
        console.log('Cannot read ../src directory');
      }
    } else {
      console.log('❌ ../src directory does not exist');
    }
  }

  // Check local scheduler directory
  const localSchedulerDir = path.join(__dirname, 'scheduler');
  if (fs.existsSync(localSchedulerDir)) {
    try {
      const localContents = fs.readdirSync(localSchedulerDir);
      console.log('Local scheduler directory contents:', localContents.join(', '));
    } catch (e) {
      console.log('Cannot read local scheduler directory');
    }
  } else {
    console.log('Local scheduler directory does not exist at:', localSchedulerDir);
  }
}

// Run the test
if (require.main === module) {
  testSchedulerAccess();
}

module.exports = { getSchedulerPath, testSchedulerAccess };
