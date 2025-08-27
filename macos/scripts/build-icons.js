#!/usr/bin/env node

/**
 * Icon Build Script for Slack Status Scheduler
 * Generates .icns file from AppIcon.iconset and prepares menu bar icons
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ASSETS_DIR = path.join(__dirname, '../assets');
const ICONSET_DIR = path.join(ASSETS_DIR, 'AppIcon.iconset');
const ICNS_OUTPUT = path.join(ASSETS_DIR, 'icon.icns');

console.log('🎨 Building icons for Slack Status Scheduler...');

/**
 * Check if iconset directory exists and has required files
 */
function validateIconset() {
  if (!fs.existsSync(ICONSET_DIR)) {
    throw new Error('AppIcon.iconset directory not found');
  }

  const requiredSizes = [
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

  const missingFiles = requiredSizes.filter(file => {
    return !fs.existsSync(path.join(ICONSET_DIR, file));
  });

  if (missingFiles.length > 0) {
    console.warn('⚠️  Missing icon files:', missingFiles);
    console.warn('   App will still build but may have missing icon sizes');
  } else {
    console.log('✅ All required icon sizes found');
  }

  return missingFiles.length === 0;
}

/**
 * Generate .icns file using macOS iconutil
 */
function generateIcns() {
  try {
    console.log('🔨 Generating icon.icns from AppIcon.iconset...');

    // Remove existing .icns file if it exists
    if (fs.existsSync(ICNS_OUTPUT)) {
      fs.unlinkSync(ICNS_OUTPUT);
    }

    // Use macOS iconutil to convert iconset to icns
    execSync(`iconutil -c icns "${ICONSET_DIR}" -o "${ICNS_OUTPUT}"`, {
      stdio: 'inherit'
    });

    if (fs.existsSync(ICNS_OUTPUT)) {
      console.log('✅ Successfully generated icon.icns');
      return true;
    } else {
      throw new Error('icon.icns was not created');
    }
  } catch (error) {
    console.error('❌ Failed to generate .icns file:', error.message);

    // Try alternative method using sips (if iconutil fails)
    console.log('🔄 Trying alternative icon generation method...');
    try {
      return generateIcnsAlternative();
    } catch (altError) {
      console.error('❌ Alternative method also failed:', altError.message);
      return false;
    }
  }
}

/**
 * Alternative icon generation using sips (fallback method)
 */
function generateIcnsAlternative() {
  // Use the largest available icon as source
  const sourceIcon = path.join(ICONSET_DIR, 'icon_512x512@2x.png');

  if (!fs.existsSync(sourceIcon)) {
    throw new Error('No suitable source icon found for alternative generation');
  }

  execSync(`sips -s format icns "${sourceIcon}" --out "${ICNS_OUTPUT}"`, {
    stdio: 'inherit'
  });

  if (fs.existsSync(ICNS_OUTPUT)) {
    console.log('✅ Generated icon.icns using alternative method');
    return true;
  }

  return false;
}

/**
 * Setup menu bar icons from the iconset
 */
function setupMenuBarIcons() {
  console.log('🔧 Setting up menu bar icons...');

  const menuBarIcons = [
    { source: 'icon_16x16.png', dest: 'iconTemplate.png' },
    { source: 'icon_16x16@2x.png', dest: 'iconTemplate@2x.png' }
  ];

  for (const { source, dest } of menuBarIcons) {
    const sourcePath = path.join(ICONSET_DIR, source);
    const destPath = path.join(ASSETS_DIR, dest);

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied ${source} → ${dest}`);
    } else {
      console.warn(`⚠️  Source icon missing: ${source}`);
    }
  }
}

/**
 * Validate the generated icons
 */
function validateGeneratedIcons() {
  console.log('🔍 Validating generated icons...');

  const expectedFiles = [
    'icon.icns',
    'iconTemplate.png',
    'iconTemplate@2x.png'
  ];

  let allValid = true;

  for (const file of expectedFiles) {
    const filePath = path.join(ASSETS_DIR, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`✅ ${file} (${Math.round(stats.size / 1024)}KB)`);
    } else {
      console.error(`❌ Missing: ${file}`);
      allValid = false;
    }
  }

  return allValid;
}

/**
 * Update package.json build configuration
 */
function updateBuildConfig() {
  console.log('📝 Checking build configuration...');

  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  let updated = false;

  // Ensure icon path is set correctly
  if (!packageJson.build) {
    packageJson.build = {};
  }

  if (!packageJson.build.mac) {
    packageJson.build.mac = {};
  }

  if (packageJson.build.mac.icon !== 'assets/icon.icns') {
    packageJson.build.mac.icon = 'assets/icon.icns';
    updated = true;
  }

  // Add icon to files array if not present
  if (!packageJson.build.files) {
    packageJson.build.files = [];
  }

  if (!packageJson.build.files.includes('assets/icon.icns')) {
    packageJson.build.files.push('assets/icon.icns');
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Updated package.json build configuration');
  } else {
    console.log('✅ Build configuration already correct');
  }
}

/**
 * Print build instructions
 */
function printInstructions() {
  console.log('\n📋 Icon setup complete! Next steps:');
  console.log('');
  console.log('  Development:');
  console.log('    npm run dev');
  console.log('');
  console.log('  Build for distribution:');
  console.log('    npm run build:mac');
  console.log('');
  console.log('  Create installer:');
  console.log('    npm run dist');
  console.log('');
  console.log('💡 Tips:');
  console.log('  - The app icon will appear in Finder, Dock, and Application switcher');
  console.log('  - The menu bar icon is optimized for the system menu bar');
  console.log('  - Icons automatically adapt to light/dark mode on macOS');
}

/**
 * Main execution
 */
function main() {
  try {
    // Validate inputs
    const hasAllIcons = validateIconset();

    // Generate main app icon
    const icnsGenerated = generateIcns();

    // Setup menu bar icons
    setupMenuBarIcons();

    // Validate outputs
    const allValid = validateGeneratedIcons();

    // Update build configuration
    updateBuildConfig();

    if (allValid && icnsGenerated) {
      console.log('\n🎉 Icon generation completed successfully!');
      printInstructions();
    } else {
      console.log('\n⚠️  Icon generation completed with warnings');
      console.log('   The app will still work but may have missing icons');
      printInstructions();
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Icon generation failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Ensure you are running on macOS (iconutil required)');
    console.error('  2. Check that AppIcon.iconset contains all required sizes');
    console.error('  3. Verify file permissions in assets directory');
    console.error('  4. Try running with sudo if permission issues persist');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  validateIconset,
  generateIcns,
  setupMenuBarIcons,
  validateGeneratedIcons,
  updateBuildConfig
};
