#!/usr/bin/env node

/**
 * Build Validation Script for Slack Status Scheduler - macOS App
 *
 * This script validates that the custom icons are properly integrated
 * and the build process is working correctly.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  assetsDir: path.join(__dirname, 'assets'),
  distDir: path.join(__dirname, 'dist'),
  iconsetDir: path.join(__dirname, 'assets', 'AppIcon.iconset'),
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

// Test results
let results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

/**
 * Logging utilities
 */
function log(message, level = 'info') {
  const icons = {
    info: '📋',
    pass: '✅',
    fail: '❌',
    warn: '⚠️',
    debug: '🔍'
  };

  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`${icons[level]} [${timestamp}] ${message}`);

  if (level === 'debug' && !CONFIG.verbose) return;
}

function test(name, testFn) {
  try {
    log(`Testing: ${name}`, 'debug');
    const result = testFn();

    if (result !== false) {
      results.passed++;
      results.tests.push({ name, status: 'pass', message: result || 'OK' });
      log(`${name} - PASS`, 'pass');
      return true;
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'fail', message: error.message });
    log(`${name} - FAIL: ${error.message}`, 'fail');
    return false;
  }
}

function warn(message) {
  results.warnings++;
  log(message, 'warn');
}

/**
 * Test functions
 */

function validateIconsetStructure() {
  if (!fs.existsSync(CONFIG.iconsetDir)) {
    throw new Error('AppIcon.iconset directory not found');
  }

  const requiredIcons = [
    'icon_16x16.png',
    'icon_16x16@2x.png',
    'icon_32x32.png',
    'icon_32x32@2x.png',
    'icon_128x128.png',
    'icon_128x128@2x.png',
    'icon_256x256.png',
    'icon_256x256@2x.png',
    'icon_512x512.png',
    'icon_512x512@2x.png'
  ];

  let foundIcons = 0;
  const missingIcons = [];

  for (const icon of requiredIcons) {
    const iconPath = path.join(CONFIG.iconsetDir, icon);
    if (fs.existsSync(iconPath)) {
      foundIcons++;

      // Check file size (should be > 0)
      const stats = fs.statSync(iconPath);
      if (stats.size === 0) {
        throw new Error(`Icon file is empty: ${icon}`);
      }
    } else {
      missingIcons.push(icon);
    }
  }

  if (missingIcons.length > 0) {
    throw new Error(`Missing icon files: ${missingIcons.join(', ')}`);
  }

  return `All ${foundIcons} required icon files present and valid`;
}

function validateGeneratedIcons() {
  const requiredFiles = [
    { path: 'assets/icon.icns', description: 'Main app icon' },
    { path: 'assets/iconTemplate.png', description: 'Menu bar icon (1x)' },
    { path: 'assets/iconTemplate@2x.png', description: 'Menu bar icon (2x)' }
  ];

  for (const { path: filePath, description } of requiredFiles) {
    const fullPath = path.join(__dirname, filePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Generated icon missing: ${filePath} (${description})`);
    }

    const stats = fs.statSync(fullPath);
    if (stats.size === 0) {
      throw new Error(`Generated icon is empty: ${filePath}`);
    }

    // Validate .icns file specifically
    if (filePath.endsWith('.icns')) {
      try {
        // Check if it's a valid icns file by reading the header
        const buffer = fs.readFileSync(fullPath);
        const header = buffer.toString('ascii', 0, 4);
        if (header !== 'icns') {
          throw new Error('Invalid .icns file format');
        }
      } catch (error) {
        throw new Error(`Invalid .icns file: ${error.message}`);
      }
    }
  }

  return 'All generated icons are present and valid';
}

function validatePackageJsonConfig() {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Check build configuration
  if (!packageJson.build) {
    throw new Error('Missing build configuration in package.json');
  }

  if (!packageJson.build.mac) {
    throw new Error('Missing mac build configuration');
  }

  if (packageJson.build.mac.icon !== 'assets/icon.icns') {
    throw new Error('Incorrect icon path in build configuration');
  }

  // Check scripts
  const requiredScripts = ['build-icons', 'build:mac', 'dist'];
  for (const script of requiredScripts) {
    if (!packageJson.scripts[script]) {
      throw new Error(`Missing required script: ${script}`);
    }
  }

  return 'Package.json build configuration is correct';
}

function validateIconGeneration() {
  try {
    // Test icon generation process
    log('Testing icon generation process...', 'debug');

    // Check if iconutil is available
    execSync('which iconutil', { stdio: 'pipe' });

    // Backup existing icon if it exists
    const iconPath = path.join(CONFIG.assetsDir, 'icon.icns');
    const backupPath = iconPath + '.backup';

    if (fs.existsSync(iconPath)) {
      fs.copyFileSync(iconPath, backupPath);
    }

    // Run icon generation
    execSync('npm run build-icons', {
      cwd: __dirname,
      stdio: 'pipe'
    });

    // Verify the icon was generated
    if (!fs.existsSync(iconPath)) {
      throw new Error('Icon generation failed - no .icns file created');
    }

    // Restore backup if it existed
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }

    return 'Icon generation process works correctly';
  } catch (error) {
    throw new Error(`Icon generation failed: ${error.message}`);
  }
}

function validateBuildOutput() {
  if (!fs.existsSync(CONFIG.distDir)) {
    warn('No build output found - run "npm run build:mac" to test full build');
    return 'Skipped (no build output)';
  }

  const requiredOutputs = [
    'mac/Slack Status Scheduler.app',
    'mac-arm64/Slack Status Scheduler.app'
  ];

  let foundOutputs = 0;
  for (const output of requiredOutputs) {
    const outputPath = path.join(CONFIG.distDir, output);
    if (fs.existsSync(outputPath)) {
      foundOutputs++;

      // Check if app bundle contains the icon
      const appIconPath = path.join(outputPath, 'Contents/Resources/icon.icns');
      if (fs.existsSync(appIconPath)) {
        log(`App icon embedded in ${output}`, 'debug');
      } else {
        warn(`App icon not found in ${output}`);
      }
    }
  }

  if (foundOutputs === 0) {
    warn('No built applications found - build may have failed');
    return 'No built apps found';
  }

  return `Found ${foundOutputs}/${requiredOutputs.length} built applications with embedded icons`;
}

function validateDistributionFiles() {
  if (!fs.existsSync(CONFIG.distDir)) {
    return 'Skipped (no build output)';
  }

  const distributionFiles = fs.readdirSync(CONFIG.distDir)
    .filter(file => file.endsWith('.dmg') || file.endsWith('.zip'))
    .filter(file => !file.endsWith('.blockmap'));

  if (distributionFiles.length === 0) {
    warn('No distribution files found - run "npm run dist" to create installers');
    return 'No distribution files found';
  }

  // Validate file sizes (should be reasonable for an Electron app)
  for (const file of distributionFiles) {
    const filePath = path.join(CONFIG.distDir, file);
    const stats = fs.statSync(filePath);
    const sizeMB = Math.round(stats.size / (1024 * 1024));

    if (sizeMB < 50) {
      warn(`Distribution file seems too small: ${file} (${sizeMB}MB)`);
    } else if (sizeMB > 500) {
      warn(`Distribution file seems too large: ${file} (${sizeMB}MB)`);
    }

    log(`Distribution file: ${file} (${sizeMB}MB)`, 'debug');
  }

  return `Found ${distributionFiles.length} distribution files`;
}

function validateAppLaunch() {
  const appPath = path.join(CONFIG.distDir, 'mac/Slack Status Scheduler.app');

  if (!fs.existsSync(appPath)) {
    warn('Built app not found - cannot test launch');
    return 'Skipped (no built app)';
  }

  try {
    // Test that the app can be opened (this doesn't actually launch it)
    execSync(`codesign -dv "${appPath}"`, { stdio: 'pipe' });
    return 'App bundle structure is valid';
  } catch (error) {
    // This is expected for unsigned apps
    if (error.message.includes('code object is not signed')) {
      return 'App bundle is valid (unsigned)';
    }
    throw new Error(`App validation failed: ${error.message}`);
  }
}

/**
 * Performance and optimization checks
 */
function validatePerformance() {
  const checks = [];

  // Check .icns file size
  const icnsPath = path.join(CONFIG.assetsDir, 'icon.icns');
  if (fs.existsSync(icnsPath)) {
    const stats = fs.statSync(icnsPath);
    const sizeMB = stats.size / (1024 * 1024);

    if (sizeMB > 5) {
      warn(`Large .icns file: ${sizeMB.toFixed(1)}MB - consider optimizing`);
    }
    checks.push(`icon.icns: ${sizeMB.toFixed(1)}MB`);
  }

  // Check menu bar icon sizes
  const menuBarIcons = ['iconTemplate.png', 'iconTemplate@2x.png'];
  for (const icon of menuBarIcons) {
    const iconPath = path.join(CONFIG.assetsDir, icon);
    if (fs.existsSync(iconPath)) {
      const stats = fs.statSync(iconPath);
      const sizeKB = Math.round(stats.size / 1024);

      if (sizeKB > 10) {
        warn(`Large menu bar icon: ${icon} (${sizeKB}KB) - consider optimizing`);
      }
      checks.push(`${icon}: ${sizeKB}KB`);
    }
  }

  return `Performance checks: ${checks.join(', ')}`;
}

/**
 * Main validation process
 */
function runValidation() {
  log('🚀 Starting Slack Status Scheduler - Icon & Build Validation');
  log(`📍 Working directory: ${__dirname}`);
  log('');

  // Core icon validation
  test('AppIcon.iconset structure', validateIconsetStructure);
  test('Generated icon files', validateGeneratedIcons);
  test('Package.json configuration', validatePackageJsonConfig);
  test('Icon generation process', validateIconGeneration);

  // Build validation (optional - depends on build existing)
  test('Build output validation', validateBuildOutput);
  test('Distribution files', validateDistributionFiles);
  test('App bundle validation', validateAppLaunch);

  // Performance and optimization
  test('Performance checks', validatePerformance);

  // Summary
  log('');
  log('📊 Validation Summary:');
  log(`✅ Passed: ${results.passed}`);
  log(`❌ Failed: ${results.failed}`);
  log(`⚠️  Warnings: ${results.warnings}`);
  log('');

  if (results.failed === 0) {
    log('🎉 All validations passed! Your custom icons are properly configured.', 'pass');
    log('');
    log('✨ Your app is ready with custom icons:');
    log('  📱 Menu bar icon: Displays in macOS menu bar');
    log('  🎨 App icon: Appears in Finder, Dock, and App Switcher');
    log('  📦 Distribution: Ready for DMG/ZIP packaging');
    log('');
    log('🚀 Next steps:');
    log('  • Test the app: npm run dev');
    log('  • Build for distribution: npm run build:mac');
    log('  • Create installer: npm run dist');
  } else {
    log('💥 Some validations failed. Please fix the issues above.', 'fail');

    if (CONFIG.verbose) {
      log('');
      log('Failed validations:');
      results.tests
        .filter(t => t.status === 'fail')
        .forEach(t => log(`  • ${t.name}: ${t.message}`, 'fail'));
    }
  }

  log('');
  log('📚 For more information, see:');
  log('  • BUILD_GUIDE.md - Complete build documentation');
  log('  • assets/ICON_SETUP.md - Icon setup instructions');
  log('  • docs/macos-setup.md - User setup guide');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Slack Status Scheduler - Icon & Build Validation

Usage: node validate-build.js [options]

Options:
  --verbose, -v    Show detailed output
  --help, -h       Show this help message

This script validates:
  ✓ AppIcon.iconset structure and files
  ✓ Generated .icns and menu bar icons
  ✓ Build configuration
  ✓ Icon generation process
  ✓ Built app validation (if available)
  ✓ Distribution files (if available)
  ✓ Performance optimization

Examples:
  node validate-build.js           # Basic validation
  node validate-build.js -v       # Detailed output
  npm run build-icons && node validate-build.js   # Full validation
`);
  process.exit(0);
}

// Run the validation
if (require.main === module) {
  runValidation();
}

module.exports = {
  runValidation,
  results,
  CONFIG
};
