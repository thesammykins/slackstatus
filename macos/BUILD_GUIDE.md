# Build and Distribution Guide - Slack Status Scheduler macOS App

This guide covers building, signing, and distributing the Slack Status Scheduler macOS application.

## Prerequisites

### System Requirements
- macOS 10.15+ (for building)
- Xcode Command Line Tools installed
- Node.js 18+ and npm
- Valid Apple Developer account (for distribution)

### Setup Verification
```bash
# Verify required tools
xcode-select --version
node --version
npm --version
iconutil --version
```

## Quick Start

### 1. Install Dependencies
```bash
cd slack_status/macos
npm install
```

### 2. Build Icons
```bash
# Generate .icns and menu bar icons from AppIcon.iconset
npm run build-icons
```

### 3. Development Build
```bash
# Run in development mode
npm run dev
```

### 4. Production Build
```bash
# Build for current platform
npm run build:mac

# Or create distribution packages
npm run dist
```

## Icon Setup

### AppIcon.iconset Structure
Your `assets/AppIcon.iconset/` should contain:
```
icon_16x16.png      (16×16)
icon_16x16@2x.png   (32×32)
icon_32x32.png      (32×32)
icon_32x32@2x.png   (64×64)
icon_128x128.png    (128×128)
icon_128x128@2x.png (256×256)
icon_256x256.png    (256×256)
icon_256x256@2x.png (512×512)
icon_512x512.png    (512×512)
icon_512x512@2x.png (1024×1024)
```

### Icon Generation Process
The `npm run build-icons` script:
1. Validates all required icon sizes exist
2. Generates `icon.icns` using macOS `iconutil`
3. Copies appropriate sizes for menu bar icons
4. Updates build configuration

### Manual Icon Generation
```bash
# If the script fails, generate manually:
iconutil -c icns assets/AppIcon.iconset -o assets/icon.icns
```

## Build Configuration

### Electron Builder Settings
The app is configured with:
- **App ID**: `com.slackstatus.scheduler`
- **Product Name**: Slack Status Scheduler
- **Target Architectures**: Intel (x64) + Apple Silicon (arm64)
- **Output Formats**: DMG installer + ZIP archive

### Build Scripts
```json
{
  "build-icons": "Generate icons from iconset",
  "prebuild": "Automatically run icon generation before builds",
  "build": "Build for current platform",
  "build:mac": "Build specifically for macOS",
  "dist": "Create distribution packages",
  "clean": "Remove build artifacts"
}
```

## Development Workflow

### 1. Making Changes
```bash
# Start development server
npm run dev

# The app will reload automatically for main process changes
# Renderer process changes require manual reload (Cmd+R)
```

### 2. Testing Icons
```bash
# Rebuild icons after changes
npm run build-icons

# Test in development
npm run dev
```

### 3. Pre-build Validation
```bash
# Run integration tests
node test-integration.js

# Clean previous builds
npm run clean

# Fresh build
npm run build:mac
```

## Distribution Building

### 1. Local Distribution
```bash
# Create unsigned packages for local testing
npm run dist

# Output will be in dist/ directory:
# - Slack Status Scheduler-1.0.0.dmg
# - Slack Status Scheduler-1.0.0-mac.zip
```

### 2. Code Signing Setup
For distribution outside the App Store, you need:

#### Apple Developer Account
1. Join Apple Developer Program ($99/year)
2. Create Developer ID certificates
3. Configure signing in package.json

#### Environment Variables
```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="your-team-id"
```

#### Certificate Installation
```bash
# Install Developer ID certificates in Keychain
# Download from Apple Developer portal
```

### 3. Notarization
```bash
# For public distribution, enable notarization
npm run dist

# The notarize.js script handles:
# - Uploading to Apple for notarization
# - Waiting for approval
# - Stapling the notarization ticket
```

## Build Outputs

### Development Build
```
macos/dist/mac/
└── Slack Status Scheduler.app/
    ├── Contents/
    │   ├── Info.plist
    │   ├── MacOS/Slack Status Scheduler
    │   └── Resources/
    │       └── app.asar
    └── ...
```

### Distribution Build
```
macos/dist/
├── Slack Status Scheduler-1.0.0.dmg      # DMG installer
├── Slack Status Scheduler-1.0.0-mac.zip  # ZIP archive
└── mac/                                   # Unpacked app
```

## Troubleshooting

### Icon Issues
```bash
# Problem: Icons not appearing
# Solution: Rebuild icons and clear cache
npm run clean
npm run build-icons
npm run dev

# Problem: iconutil command not found
# Solution: Install Xcode Command Line Tools
xcode-select --install
```

### Build Failures
```bash
# Problem: Missing dependencies
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Problem: Permission errors
# Solution: Fix permissions
chmod +x scripts/*.js
```

### Code Signing Issues
```bash
# Problem: Certificate not found
# Solution: Verify certificate installation
security find-identity -v -p codesigning

# Problem: Notarization fails
# Solution: Check Apple ID credentials
echo $APPLE_ID
echo $APPLE_TEAM_ID
```

### Performance Issues
```bash
# Problem: Slow builds
# Solution: Use local cache
export ELECTRON_CACHE="~/.cache/electron"
export ELECTRON_BUILDER_CACHE="~/.cache/electron-builder"
```

## Advanced Configuration

### Custom DMG Background
```bash
# Add custom DMG background image
cp your-background.png assets/dmg-background.png

# Update package.json build.dmg.background
```

### Entitlements Customization
Edit `assets/entitlements.mac.plist` for:
- Network access permissions
- Keychain access groups
- Hardened runtime settings

### Auto-Updater Setup
```bash
# Add electron-updater for automatic updates
npm install electron-updater

# Configure update server in main.js
# Add update check logic
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Build macOS App
on: [push, pull_request]

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd macos
          npm install
      
      - name: Build icons
        run: |
          cd macos
          npm run build-icons
      
      - name: Build app
        run: |
          cd macos
          npm run build:mac
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

## Quality Assurance

### Pre-Release Checklist
- [ ] Icons generated successfully
- [ ] App launches without errors
- [ ] All UI tabs functional
- [ ] Keychain integration working
- [ ] Export functionality tested
- [ ] Build artifacts created
- [ ] DMG installer tested
- [ ] App signature verified

### Testing Commands
```bash
# Validate build
npm run test-integration

# Check app signature
codesign -dv --verbose=4 "dist/mac/Slack Status Scheduler.app"

# Verify notarization
spctl -a -vvv "dist/mac/Slack Status Scheduler.app"
```

## Release Process

### Version Management
1. Update version in `package.json`
2. Update version in main `package.json`
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`

### Distribution Channels
- **Direct Download**: Host DMG/ZIP files
- **GitHub Releases**: Attach build artifacts
- **Mac App Store**: Requires separate MAS build
- **Homebrew Cask**: Submit formula after release

## Security Considerations

### Code Signing Best Practices
- Never commit certificates to repository
- Use environment variables for credentials
- Rotate certificates before expiration
- Validate signatures in CI/CD

### User Privacy
- Request minimal permissions
- Explain Keychain access clearly
- Provide opt-out for analytics
- Follow Apple privacy guidelines

## Support and Maintenance

### Log Collection
```bash
# User logs location
~/Library/Logs/Slack Status Scheduler/

# Console.app search filter
process:Electron AND sender:Slack Status Scheduler
```

### Update Strategy
- Semantic versioning (semver)
- Automated update checks
- Graceful fallback for failed updates
- User notification for major changes

---

## Quick Reference

### Essential Commands
```bash
npm install              # Install dependencies
npm run build-icons      # Generate icons
npm run dev             # Development mode
npm run build:mac       # Production build
npm run dist            # Create installer
npm run clean           # Clean build cache
```

### Important Paths
```
assets/AppIcon.iconset/  # Source icons
assets/icon.icns        # Generated app icon
assets/iconTemplate.png # Menu bar icon
dist/                   # Build outputs
scripts/build-icons.js  # Icon generation
```

### Support Resources
- [Electron Builder Docs](https://www.electron.build/)
- [Apple Code Signing Guide](https://developer.apple.com/documentation/xcode/notarizing_macos_software_before_distribution)
- [macOS App Distribution](https://developer.apple.com/distribute/)

---

**Last Updated**: 2024-08-27  
**Version**: 1.0.0  
**Compatibility**: macOS 10.15+, Node.js 18+