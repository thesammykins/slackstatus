# Build Fixes for Slack Status Scheduler macOS App

This document outlines the issues found and fixes applied to resolve the macOS build problems.

## Issues Identified

### 1. White Page Issue (UI Files Not Bundled)

**Problem**: The menubar icon loaded to a white page when clicked.

**Root Cause**: The `ui/` directory containing the HTML, CSS, and JavaScript files was not being included in the electron-builder bundle configuration.

**Evidence**: 
- `npx asar list` showed that `/ui/` files were missing from the app.asar bundle
- Only `src/` and `assets/` directories were being included

**Fix**: Updated `package.json` build configuration to include UI files:

```json
"files": [
  "src/**/*",
  "ui/**/*",        // ← Added this line
  "assets/**/*",
  "node_modules/**/*",
  "package.json",
  "assets/icon.icns"
]
```

### 2. Dual Menu Issue (Left and Right Click Both Show Menus)

**Problem**: Clicking the menubar icon showed both the main app interface and the right-click context menu simultaneously.

**Root Cause**: When `setContextMenu()` is used on a tray, it interferes with click events, causing both left and right clicks to trigger menus. This is a known Electron limitation documented in issue #5058.

**Fix**: Removed `setContextMenu()` and implemented manual context menu handling using `popUpContextMenu()`:

```javascript
mb = menubar({
  index: `file://${path.join(__dirname, '../ui/index.html')}`,
  icon: iconToUse,
  tooltip: 'Slack Status Scheduler',
  preloadWindow: true,
  showDockIcon: false,
  showOnRightClick: false,  // ← Added this line
  browserWindow: {
    // ... existing config
  },
});

// Create context menu but don't set it with setContextMenu()
const contextMenu = Menu.buildFromTemplate([
  { label: 'Open Slack Status Scheduler', click: () => mb.showWindow() },
  { type: 'separator' },
  // ... other menu items
]);

// Handle right-click manually to show context menu
if (mb.tray) {
  mb.tray.on('right-click', () => {
    mb.tray.popUpContextMenu(contextMenu);
  });
}
```

**Key Insight**: Using `setContextMenu()` prevents proper click event handling. The solution is to avoid `setContextMenu()` entirely and use `popUpContextMenu()` with manual event handling.

## Validation

Created a comprehensive test script (`test-build.js`) that validates:

1. **File Presence**: Checks that all required files are included in the bundle
2. **UI Files**: Specifically validates that HTML, CSS, and JS files are present
3. **App Startup**: Tests that the built app can start successfully
4. **Cross-Architecture**: Validates both x64 and ARM64 builds

### Running Validation

```bash
npm run test-build
```

Expected output:
```
🔍 Validating Slack Status Scheduler build...
📦 Checking mac build...
✅ All required files present
✅ UI files bundled: /ui/app.js, /ui/index.html, /ui/styles.css
✅ App started successfully
📊 Validation Summary:
✅ All checks passed! Build is ready for distribution.
```

## Build Process

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run dist
```

### Validation
```bash
npm run test-build
```

## Files Modified

1. `package.json` - Updated electron-builder configuration
2. `src/main.js` - Fixed menubar click handling
3. `test-build.js` - Added (new validation script)

## Verification Steps

1. ✅ UI files are properly bundled in app.asar
2. ✅ Left click shows the main interface only
3. ✅ Right click shows the context menu only
4. ✅ App starts without errors
5. ✅ Both x64 and ARM64 builds work correctly

## Notes

- The validation script can be run in CI/CD pipelines with `TEST_APP_START=false` to skip the app startup test if needed
- Code signing warnings are expected in development builds and don't affect functionality
- The app uses macOS Keychain for secure token storage via the `keytar` dependency