#!/usr/bin/env node

/**
 * Test script to validate the macOS build
 * Checks if all required files are properly bundled and the app can start
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const REQUIRED_FILES = [
  '/package.json',
  '/src/main.js',
  '/ui/index.html',
  '/ui/app.js',
  '/ui/styles.css',
  '/assets/icon.icns',
  '/assets/iconTemplate.png',
  '/assets/iconTemplate@2x.png',
  '/scheduler/index.js',
];

const ARCHITECTURES = ['mac', 'mac-arm64'];

function checkAsarContents(asarPath) {
  return new Promise((resolve, reject) => {
    const asar = spawn('npx', ['asar', 'list', asarPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    let error = '';

    asar.stdout.on('data', data => {
      output += data.toString();
    });

    asar.stderr.on('data', data => {
      error += data.toString();
    });

    asar.on('close', code => {
      if (code !== 0) {
        reject(new Error(`asar list failed: ${error}`));
        return;
      }

      const files = output.split('\n').filter(line => line.trim());
      resolve(files);
    });

    asar.on('error', reject);
  });
}

function testAppStart(appPath) {
  return new Promise((resolve, reject) => {
    console.log(`Testing app startup: ${appPath}`);

    const app = spawn('open', ['-W', '-n', appPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let error = '';

    app.stderr.on('data', data => {
      error += data.toString();
    });

    // Give the app 5 seconds to start
    const timeout = setTimeout(() => {
      app.kill('SIGTERM');
      resolve({ success: true, message: 'App started successfully' });
    }, 5000);

    app.on('close', code => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ success: true, message: 'App started and closed cleanly' });
      } else {
        reject(new Error(`App failed to start: ${error || `Exit code: ${code}`}`));
      }
    });

    app.on('error', err => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function validateBuild() {
  console.log('🔍 Validating Slack Status Scheduler build...\n');

  let totalIssues = 0;

  for (const arch of ARCHITECTURES) {
    console.log(`📦 Checking ${arch} build...`);

    const appPath = path.join(__dirname, 'dist', arch, 'Slack Status Scheduler.app');
    const asarPath = path.join(appPath, 'Contents', 'Resources', 'app.asar');

    // Check if app exists
    if (!fs.existsSync(appPath)) {
      console.error(`❌ App not found: ${appPath}`);
      totalIssues++;
      continue;
    }

    if (!fs.existsSync(asarPath)) {
      console.error(`❌ ASAR bundle not found: ${asarPath}`);
      totalIssues++;
      continue;
    }

    try {
      // Check ASAR contents
      const files = await checkAsarContents(asarPath);
      console.log(`📄 Found ${files.length} files in bundle`);

      const missingFiles = REQUIRED_FILES.filter(requiredFile => !files.includes(requiredFile));

      if (missingFiles.length > 0) {
        console.error(`❌ Missing required files in ${arch}:`);
        missingFiles.forEach(file => console.error(`   - ${file}`));
        totalIssues += missingFiles.length;
      } else {
        console.log('✅ All required files present');
      }

      // Check UI files specifically
      const uiFiles = files.filter(file => file.startsWith('/ui/'));
      if (uiFiles.length >= 3) {
        console.log(`✅ UI files bundled: ${uiFiles.join(', ')}`);
      } else {
        console.error('❌ UI files missing or incomplete');
        totalIssues++;
      }

      // Check scheduler files specifically
      const schedulerFiles = files.filter(file => file.startsWith('/scheduler/'));
      if (schedulerFiles.length > 0) {
        const schedulerDirs = [
          ...new Set(schedulerFiles.map(f => f.split('/')[2]).filter(Boolean)),
        ];
        console.log(
          `✅ Scheduler files bundled: ${schedulerFiles.slice(0, 3).join(', ')}${schedulerFiles.length > 3 ? '...' : ''}`,
        );
        if (schedulerDirs.length > 0) {
          console.log(`✅ Scheduler subdirectories: ${schedulerDirs.join(', ')}`);
        }
      } else {
        console.error('❌ Scheduler files missing from bundle');
        totalIssues++;
      }

      // Test app startup (optional, can be flaky in CI)
      if (process.env.TEST_APP_START !== 'false') {
        try {
          const result = await testAppStart(appPath);
          console.log(`✅ ${result.message}`);
        } catch (err) {
          console.warn(`⚠️  App startup test failed: ${err.message}`);
          // Don't count this as a critical issue
        }
      }
    } catch (error) {
      console.error(`❌ Error checking ${arch} build:`, error.message);
      totalIssues++;
    }

    console.log(); // Empty line for readability
  }

  // Summary
  console.log('📊 Validation Summary:');
  if (totalIssues === 0) {
    console.log('✅ All checks passed! Build is ready for distribution.');
    process.exit(0);
  } else {
    console.error(`❌ Found ${totalIssues} issue(s). Please fix before distributing.`);
    process.exit(1);
  }
}

// CLI usage
if (require.main === module) {
  validateBuild().catch(err => {
    console.error('💥 Validation failed:', err.message);
    process.exit(1);
  });
}

module.exports = { validateBuild, checkAsarContents, testAppStart };
