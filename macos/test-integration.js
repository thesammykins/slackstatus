#!/usr/bin/env node

/**
 * Integration Test Script for Slack Status Scheduler - Phase 2
 *
 * This script validates that all Phase 2 components are working correctly:
 * - macOS app structure and dependencies
 * - UI files and assets
 * - IPC communication setup
 * - Keychain integration capabilities
 * - Export functionality
 * - Default schedule loading
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test configuration
const CONFIG = {
  verbose: process.argv.includes('--verbose'),
  skipElectron: process.argv.includes('--skip-electron'),
  projectRoot: path.join(__dirname, '..'),
  macosRoot: __dirname,
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

/**
 * Utility functions
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = {
    info: '📋',
    pass: '✅',
    fail: '❌',
    warn: '⚠️ ',
    debug: '🔍',
  };

  console.log(`${prefix[level]} [${timestamp}] ${message}`);

  if (level === 'debug' && !CONFIG.verbose) return;
}

function test(name, fn) {
  try {
    log(`Testing: ${name}`, 'debug');
    const result = fn();
    if (result !== false) {
      testResults.passed++;
      testResults.tests.push({ name, status: 'pass', message: result || 'OK' });
      log(`${name} - PASS`, 'pass');
      return true;
    }
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'fail', message: error.message });
    log(`${name} - FAIL: ${error.message}`, 'fail');
    return false;
  }
}

function warn(message) {
  testResults.warnings++;
  log(message, 'warn');
}

function fileExists(filePath) {
  return fs.existsSync(path.join(CONFIG.macosRoot, filePath));
}

function dirExists(dirPath) {
  const fullPath = path.join(CONFIG.macosRoot, dirPath);
  return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
}

function readJsonFile(filePath) {
  const fullPath = path.join(CONFIG.macosRoot, filePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function checkPackageJson() {
  const pkg = readJsonFile('package.json');

  // Check required fields
  if (!pkg.name || !pkg.version || !pkg.main) {
    throw new Error('Missing required package.json fields');
  }

  // Check required scripts
  const requiredScripts = ['start', 'dev', 'build'];
  for (const script of requiredScripts) {
    if (!pkg.scripts[script]) {
      throw new Error(`Missing required script: ${script}`);
    }
  }

  // Check required dependencies
  const requiredDeps = ['keytar', 'menubar'];
  for (const dep of requiredDeps) {
    if (!pkg.dependencies[dep]) {
      throw new Error(`Missing required dependency: ${dep}`);
    }
  }

  // Check required devDependencies
  const requiredDevDeps = ['electron', 'electron-builder'];
  for (const dep of requiredDevDeps) {
    if (!pkg.devDependencies[dep]) {
      throw new Error(`Missing required devDependency: ${dep}`);
    }
  }

  return 'Package.json is properly configured';
}

function checkNodeModules() {
  if (!dirExists('node_modules')) {
    throw new Error('node_modules directory not found - run npm install');
  }

  const criticalModules = ['electron', 'keytar', 'menubar'];
  for (const module of criticalModules) {
    if (!dirExists(`node_modules/${module}`)) {
      throw new Error(`Critical module missing: ${module}`);
    }
  }

  return 'All critical node modules are installed';
}

function checkElectronMain() {
  if (!fileExists('src/main.js')) {
    throw new Error('Main Electron file not found');
  }

  const mainContent = fs.readFileSync(path.join(CONFIG.macosRoot, 'src/main.js'), 'utf8');

  // Check for required imports
  const requiredImports = ['electron', 'menubar', 'keytar'];
  for (const imp of requiredImports) {
    if (!mainContent.includes(imp)) {
      throw new Error(`Missing required import: ${imp}`);
    }
  }

  // Check for IPC handlers
  const requiredHandlers = ['keychain-get-token', 'scheduler-run', 'scheduler-preview'];
  for (const handler of requiredHandlers) {
    if (!mainContent.includes(handler)) {
      throw new Error(`Missing IPC handler: ${handler}`);
    }
  }

  return 'Electron main process is properly configured';
}

function checkUIFiles() {
  const requiredFiles = ['ui/index.html', 'ui/app.js', 'ui/styles.css'];

  for (const file of requiredFiles) {
    if (!fileExists(file)) {
      throw new Error(`UI file missing: ${file}`);
    }
  }

  // Check HTML structure
  const htmlContent = fs.readFileSync(path.join(CONFIG.macosRoot, 'ui/index.html'), 'utf8');
  const requiredElements = ['nav-tabs', 'dashboard-tab', 'schedule-tab', 'settings-tab'];
  for (const element of requiredElements) {
    if (!htmlContent.includes(element)) {
      throw new Error(`Missing UI element: ${element}`);
    }
  }

  // Check JavaScript functionality
  const jsContent = fs.readFileSync(path.join(CONFIG.macosRoot, 'ui/app.js'), 'utf8');
  const requiredFunctions = ['init', 'setupEventListeners', 'refreshUpcoming', 'saveToken'];
  for (const func of requiredFunctions) {
    if (!jsContent.includes(func)) {
      throw new Error(`Missing JavaScript function: ${func}`);
    }
  }

  return 'All UI files are present with required functionality';
}

function checkAssets() {
  // Check if icon files exist (they're optional but recommended)
  const iconFiles = ['iconTemplate.png', 'iconTemplate@2x.png'];
  let iconCount = 0;

  for (const icon of iconFiles) {
    if (fileExists(`assets/${icon}`)) {
      iconCount++;
    }
  }

  if (iconCount === 0) {
    warn('No custom icons found - app will use default system icon');
  }

  // Check required security files
  if (!fileExists('assets/entitlements.mac.plist')) {
    throw new Error('macOS entitlements file missing');
  }

  return `Assets directory configured (${iconCount}/2 custom icons found)`;
}

function checkDefaultSchedule() {
  if (!fileExists('default-schedule.json')) {
    throw new Error('Default schedule file missing');
  }

  const schedule = readJsonFile('default-schedule.json');

  // Validate schedule structure
  if (!schedule.version || !schedule.timezone || !schedule.rules) {
    throw new Error('Invalid default schedule structure');
  }

  if (!Array.isArray(schedule.rules) || schedule.rules.length === 0) {
    throw new Error('Default schedule has no rules');
  }

  // Validate first rule
  const rule = schedule.rules[0];
  if (!rule.id || !rule.type || !rule.status) {
    throw new Error('Invalid rule structure in default schedule');
  }

  return `Default schedule valid with ${schedule.rules.length} rules`;
}

function checkScripts() {
  const scriptsDir = 'scripts';
  if (!dirExists(scriptsDir)) {
    throw new Error('Scripts directory missing');
  }

  const requiredScripts = ['create-icon.js', 'notarize.js'];
  for (const script of requiredScripts) {
    if (!fileExists(`${scriptsDir}/${script}`)) {
      throw new Error(`Required script missing: ${script}`);
    }
  }

  return 'All required scripts are present';
}

function checkDocumentation() {
  // Check local documentation
  const localDocs = ['assets/ICON_SETUP.md'];
  for (const doc of localDocs) {
    if (!fileExists(doc)) {
      warn(`Documentation file missing: ${doc}`);
    }
  }

  // Check project documentation
  const projectDocs = ['docs/macos-setup.md'];
  for (const doc of projectDocs) {
    if (!fileExists(path.join('..', doc))) {
      warn(`Project documentation missing: ${doc}`);
    }
  }

  return 'Documentation files checked';
}

function checkElectronCompatibility() {
  if (CONFIG.skipElectron) {
    warn('Skipping Electron compatibility check (--skip-electron flag)');
    return 'Skipped';
  }

  try {
    // Try to run electron --version
    const electronPath = path.join(CONFIG.macosRoot, 'node_modules/.bin/electron');
    if (!fs.existsSync(electronPath)) {
      throw new Error('Electron binary not found');
    }

    const version = execSync(`"${electronPath}" --version`, {
      encoding: 'utf8',
      timeout: 5000,
    }).trim();

    if (!version.startsWith('v')) {
      throw new Error('Invalid Electron version format');
    }

    return `Electron ${version} is properly installed`;
  } catch (error) {
    throw new Error(`Electron compatibility issue: ${error.message}`);
  }
}

function checkIntegrationPoints() {
  // Check that Phase 1 scheduler exists
  const schedulerPath = path.join(CONFIG.projectRoot, 'src', 'index.js');
  if (!fs.existsSync(schedulerPath)) {
    throw new Error('Phase 1 scheduler not found - integration will fail');
  }

  // Check export templates exist
  const exportTemplates = [
    'exports/github-actions/slack-status-scheduler.yml',
    'exports/cloudflare-worker/worker.js',
  ];

  for (const template of exportTemplates) {
    if (!fs.existsSync(path.join(CONFIG.projectRoot, template))) {
      throw new Error(`Export template missing: ${template}`);
    }
  }

  return 'Integration points with Phase 1 are properly configured';
}

function checkBuildConfiguration() {
  const pkg = readJsonFile('package.json');

  if (!pkg.build) {
    throw new Error('electron-builder configuration missing');
  }

  const buildConfig = pkg.build;

  // Check required build fields
  if (!buildConfig.appId || !buildConfig.productName) {
    throw new Error('Missing required build configuration fields');
  }

  // Check macOS specific configuration
  if (!buildConfig.mac) {
    throw new Error('macOS build configuration missing');
  }

  return 'Build configuration is properly set up for distribution';
}

/**
 * Main test execution
 */
function runTests() {
  log('🚀 Starting Slack Status Scheduler - Phase 2 Integration Tests');
  log(`📍 Testing directory: ${CONFIG.macosRoot}`);
  log('');

  // Core structure tests
  test('Package.json configuration', checkPackageJson);
  test('Node modules installation', checkNodeModules);
  test('Electron main process', checkElectronMain);
  test('UI files and structure', checkUIFiles);
  test('Assets and icons', checkAssets);
  test('Default schedule', checkDefaultSchedule);
  test('Utility scripts', checkScripts);
  test('Documentation', checkDocumentation);

  // Integration tests
  test('Integration points', checkIntegrationPoints);
  test('Build configuration', checkBuildConfiguration);
  test('Electron compatibility', checkElectronCompatibility);

  // Summary
  log('');
  log('📊 Test Results Summary:');
  log(`✅ Passed: ${testResults.passed}`);
  log(`❌ Failed: ${testResults.failed}`);
  log(`⚠️  Warnings: ${testResults.warnings}`);
  log('');

  if (testResults.failed === 0) {
    log('🎉 All tests passed! Phase 2 macOS app is ready for use.', 'pass');
    log('');
    log('Next steps:');
    log('  1. Run "npm run dev" to start the app in development mode');
    log('  2. Test the UI functionality manually');
    log('  3. Add your Slack token in the Settings tab');
    log('  4. Create and test a schedule');
    log('  5. Proceed to Phase 3 development');
  } else {
    log('💥 Some tests failed. Please fix the issues before proceeding.', 'fail');

    if (CONFIG.verbose) {
      log('');
      log('Failed tests:');
      testResults.tests
        .filter(t => t.status === 'fail')
        .forEach(t => log(`  - ${t.name}: ${t.message}`, 'fail'));
    }
  }

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testResults,
  CONFIG,
};
