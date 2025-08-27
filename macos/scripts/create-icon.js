/**
 * Script to create a basic menu bar icon for the Slack Status Scheduler
 * This creates a simple PNG icon that can be used as a template icon
 */

const fs = require('fs');
const path = require('path');

// Simple function to create a basic PNG icon
// This creates a minimal 16x16 black square icon as a placeholder
function createBasicIcon() {
  // PNG file signature and basic header for a 16x16 grayscale image
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk for 16x16 grayscale image
  const ihdrData = Buffer.from([
    0x00, 0x00, 0x00, 0x10, // width: 16
    0x00, 0x00, 0x00, 0x10, // height: 16
    0x08, // bit depth: 8
    0x00, // color type: grayscale
    0x00, // compression method
    0x00, // filter method
    0x00  // interlace method
  ]);

  // Calculate CRC for IHDR
  const ihdrCrc = Buffer.from([0x3F, 0xF6, 0x1E, 0x93]); // Precalculated CRC

  // Create IHDR chunk
  const ihdrChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0D]), // chunk length
    Buffer.from('IHDR'),
    ihdrData,
    ihdrCrc
  ]);

  // Create a simple icon pattern (circle/dot in center)
  const iconData = [];
  for (let y = 0; y < 16; y++) {
    iconData.push(0); // Filter byte for each row
    for (let x = 0; x < 16; x++) {
      // Create a simple circular pattern
      const centerX = 8, centerY = 8;
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

      if (distance <= 6) {
        if (distance <= 2) {
          iconData.push(0); // Black center
        } else if (distance <= 4) {
          iconData.push(128); // Gray middle
        } else {
          iconData.push(200); // Light gray outer
        }
      } else {
        iconData.push(255); // Transparent/white background
      }
    }
  }

  // Compress the image data (simplified - real PNG would use zlib)
  // For this basic version, we'll create a minimal valid PNG
  const compressedData = Buffer.from([
    0x78, 0x01, // zlib header
    ...iconData.slice(0, 32), // Simplified data
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01 // zlib trailer
  ]);

  const idatChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, compressedData.length]), // chunk length
    Buffer.from('IDAT'),
    compressedData,
    Buffer.from([0x35, 0xAF, 0x06, 0x1E]) // Precalculated CRC
  ]);

  // IEND chunk
  const iendChunk = Buffer.from([
    0x00, 0x00, 0x00, 0x00, // chunk length
    0x49, 0x45, 0x4E, 0x44, // "IEND"
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

// Alternative: Create SVG icon and instructions
function createSVGIcon() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <!-- Simple Slack-like icon -->
  <circle cx="8" cy="8" r="6" fill="none" stroke="black" stroke-width="2"/>
  <circle cx="8" cy="8" r="2" fill="black"/>
  <path d="M8 2 L8 6 M14 8 L10 8 M8 14 L8 10 M2 8 L6 8" stroke="black" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;
}

// Main execution
function main() {
  const assetsDir = path.join(__dirname, '../assets');

  // Ensure assets directory exists
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Create SVG icon (easier to modify)
  const svgIcon = createSVGIcon();
  const svgPath = path.join(assetsDir, 'icon-template.svg');
  fs.writeFileSync(svgPath, svgIcon);
  console.log('Created SVG icon at:', svgPath);

  // Create instructions file
  const instructions = `# Menu Bar Icon Setup

## Quick Setup (Recommended)

1. Use any existing 16x16 PNG image as iconTemplate.png
2. Or convert the provided SVG to PNG:

### Using online converter:
- Go to https://convertio.co/svg-png/
- Upload icon-template.svg
- Download as PNG
- Rename to iconTemplate.png

### Using ImageMagick (if installed):
\`\`\`bash
convert icon-template.svg -resize 16x16 iconTemplate.png
convert icon-template.svg -resize 32x32 iconTemplate@2x.png
\`\`\`

### Using macOS built-in tools:
\`\`\`bash
# Convert SVG to PNG using qlmanage
qlmanage -t -s 16 -o . icon-template.svg
mv icon-template.svg.png iconTemplate.png
\`\`\`

## Template Icon Requirements:
- 16x16 pixels for standard display
- 32x32 pixels for Retina display (@2x)
- Black color with transparency
- Will automatically adapt to system appearance

## Temporary Workaround:
If you don't have an icon, the app will use a default system icon.
The functionality will work without a custom icon.
`;

  const instructionsPath = path.join(assetsDir, 'ICON_SETUP.md');
  fs.writeFileSync(instructionsPath, instructions);
  console.log('Created setup instructions at:', instructionsPath);

  console.log('\nNext steps:');
  console.log('1. Follow instructions in assets/ICON_SETUP.md');
  console.log('2. Or simply run the app without custom icons (will use defaults)');
  console.log('3. Test the app with: npm run dev');
}

if (require.main === module) {
  main();
}

module.exports = { createSVGIcon, createBasicIcon };
