/**
 * Main Electron process for Slack Status Scheduler macOS Menu Bar App
 */

const { app, BrowserWindow, Menu, Tray, ipcMain, dialog, shell } = require('electron');
const { menubar } = require('menubar');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const keytar = require('keytar');

// Keep a global reference of the window object
let mb;
let tray;
let mainWindow;

const SERVICE_NAME = 'Slack Status Scheduler';
const ACCOUNT_NAME = 'slack-token';

// Check if running in development
const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

/**
 * Initialize the menu bar app
 */
function createMenuBar() {
  // Create the menu bar app with proper icon handling
  const iconPath = path.join(__dirname, '../assets/iconTemplate.png');
  const iconPath2x = path.join(__dirname, '../assets/iconTemplate@2x.png');

  // Check if custom icons exist, use fallback if not
  let iconToUse = iconPath;
  if (fsSync.existsSync(iconPath)) {
    console.log('Using custom menu bar icons');
  } else {
    console.log('Custom icons not found, using fallback');
    iconToUse = null; // Let menubar use default system icon
  }

  mb = menubar({
    index: `file://${path.join(__dirname, '../ui/index.html')}`,
    icon: iconToUse,
    tooltip: 'Slack Status Scheduler',
    preloadWindow: true,
    showDockIcon: false,
    browserWindow: {
      width: 400,
      height: 600,
      resizable: false,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
      },
    },
  });

  mb.on('ready', () => {
    console.log('Menu bar app is ready');

    // Set up the context menu for the tray icon
    setupTrayMenu();

    // Log the icon paths for debugging
    console.log('Menu bar icon path:', iconPath);
    if (fsSync.existsSync(iconPath2x)) {
      console.log('Retina icon available:', iconPath2x);
    }
  });

  mb.on('after-create-window', () => {
    console.log('Menu bar window created');
  });

  mb.on('show', () => {
    // Position the window correctly
    positionWindow();
  });

  mb.on('hide', () => {
    // Window hidden
  });

  return mb;
}

/**
 * Setup tray context menu
 */
function setupTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Slack Status Scheduler',
      click: () => {
        mb.showWindow();
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        mb.showWindow();
        mb.window.webContents.send('navigate-to', 'settings');
      },
    },
    {
      label: 'Schedule Editor',
      click: () => {
        mb.showWindow();
        mb.window.webContents.send('navigate-to', 'schedule');
      },
    },
    {
      label: 'Preview',
      click: () => {
        mb.showWindow();
        mb.window.webContents.send('navigate-to', 'preview');
      },
    },
    {
      label: 'Logs',
      click: () => {
        mb.showWindow();
        mb.window.webContents.send('navigate-to', 'logs');
      },
    },
    { type: 'separator' },
    {
      label: 'Export to GitHub Actions',
      click: () => {
        exportToGitHubActions();
      },
    },
    {
      label: 'Export to Cloudflare Worker',
      click: () => {
        exportToCloudflareWorker();
      },
    },
    { type: 'separator' },
    {
      label: 'About',
      click: () => {
        showAbout();
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  if (mb.tray) {
    mb.tray.setContextMenu(contextMenu);
  }
}

/**
 * Position the window correctly relative to the tray icon
 */
function positionWindow() {
  if (!mb.window || !mb.tray) return;

  const trayBounds = mb.tray.getBounds();
  const windowBounds = mb.window.getBounds();

  // Position window below tray icon
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
  const y = Math.round(trayBounds.y + trayBounds.height);

  mb.window.setPosition(x, y, false);
}

/**
 * Setup IPC communication handlers
 */
function setupIPC() {
  // Keychain operations
  ipcMain.handle('keychain-set-token', async (event, token) => {
    try {
      await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, token);
      return { success: true };
    } catch (error) {
      console.error('Failed to set token in keychain:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('keychain-get-token', async () => {
    try {
      const token = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      return { success: true, token };
    } catch (error) {
      console.error('Failed to get token from keychain:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('keychain-delete-token', async () => {
    try {
      await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete token from keychain:', error);
      return { success: false, error: error.message };
    }
  });

  // File operations
  ipcMain.handle('file-read', async (event, filePath) => {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file-write', async (event, filePath, content) => {
    try {
      await fs.writeFile(filePath, content, 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file-dialog-open', async () => {
    try {
      const result = await dialog.showOpenDialog(mb.window, {
        title: 'Open Schedule File',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });
      return result;
    } catch (error) {
      return { canceled: true, error: error.message };
    }
  });

  ipcMain.handle('file-dialog-save', async (event, defaultName = 'schedule.json') => {
    try {
      const result = await dialog.showSaveDialog(mb.window, {
        title: 'Save Schedule File',
        defaultPath: defaultName,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      return result;
    } catch (error) {
      return { canceled: true, error: error.message };
    }
  });

  // Scheduler operations
  ipcMain.handle('scheduler-run', async (event, scheduleData, dryRun = false) => {
    try {
      // For now, return a mock result since we need to integrate the ES module
      // TODO: Properly integrate with the parent project's scheduler
      console.log('Scheduler run requested:', { dryRun, scheduleData });

      if (dryRun) {
        return {
          success: true,
          result: {
            action: 'update_status',
            status: { text: 'Focus time', emoji: '🧠' },
            dryRun: true,
          },
        };
      }

      // Get token from keychain for real runs
      const tokenResult = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      if (!tokenResult) {
        return { success: false, error: 'No Slack token found. Please set token in settings.' };
      }

      return {
        success: true,
        result: {
          action: 'update_status',
          status: { text: 'Focus time', emoji: '🧠' },
        },
      };
    } catch (error) {
      console.error('Scheduler run failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scheduler-preview', async (event, scheduleData, targetDate = null) => {
    try {
      // Mock preview result
      console.log('Scheduler preview requested:', { scheduleData, targetDate });

      return {
        success: true,
        result: {
          action: 'update_status',
          status: { text: 'Focus time', emoji: '🧠' },
          preview: true,
        },
      };
    } catch (error) {
      console.error('Scheduler preview failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scheduler-upcoming', async (event, scheduleData, days = 7) => {
    try {
      // Mock upcoming changes
      console.log('Upcoming changes requested:', { scheduleData, days });

      const upcoming = [];
      const today = new Date();

      for (let i = 0; i < Math.min(days, 5); i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);

        upcoming.push({
          date: date.toISOString().split('T')[0],
          time: '09:00',
          executeAt: date.toISOString(),
          status: { text: 'Focus time', emoji: '🧠' },
        });
      }

      return { success: true, upcoming };
    } catch (error) {
      console.error('Get upcoming changes failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Export operations
  ipcMain.handle('export-github-actions', async (event, scheduleData) => {
    try {
      const result = await exportToGitHubActions(scheduleData);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('export-cloudflare-worker', async (event, scheduleData) => {
    try {
      const result = await exportToCloudflareWorker(scheduleData);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Window controls
  ipcMain.handle('window-hide', () => {
    mb.hideWindow();
  });

  ipcMain.handle('app-quit', () => {
    app.quit();
  });

  // Open external links
  ipcMain.handle('open-external', (event, url) => {
    shell.openExternal(url);
  });
}

/**
 * Export schedule to GitHub Actions
 */
async function exportToGitHubActions(scheduleData = null) {
  try {
    const templatePath = path.join(
      __dirname,
      '../../exports/github-actions/slack-status-scheduler.yml'
    );
    const template = await fs.readFile(templatePath, 'utf8');

    let workflowContent = template;

    if (scheduleData) {
      // Replace placeholder with actual schedule data
      workflowContent = workflowContent.replace(
        '# SCHEDULE_PLACEHOLDER',
        `# Schedule: ${JSON.stringify(scheduleData, null, 2)}`
      );
    }

    const result = await dialog.showSaveDialog(mb.window, {
      title: 'Export GitHub Actions Workflow',
      defaultPath: 'slack-status-scheduler.yml',
      filters: [
        { name: 'YAML Files', extensions: ['yml', 'yaml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!result.canceled) {
      await fs.writeFile(result.filePath, workflowContent, 'utf8');
      return { success: true, filePath: result.filePath };
    }

    return { success: false, canceled: true };
  } catch (error) {
    console.error('GitHub Actions export failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Export schedule to Cloudflare Worker
 */
async function exportToCloudflareWorker(scheduleData = null) {
  try {
    const templatePath = path.join(__dirname, '../../exports/cloudflare-worker/worker.js');
    const template = await fs.readFile(templatePath, 'utf8');

    let workerContent = template;

    if (scheduleData) {
      // Replace placeholder with actual schedule data
      workerContent = workerContent.replace(
        '// SCHEDULE_PLACEHOLDER',
        `const SCHEDULE = ${JSON.stringify(scheduleData, null, 2)};`
      );
    }

    const result = await dialog.showSaveDialog(mb.window, {
      title: 'Export Cloudflare Worker',
      defaultPath: 'worker.js',
      filters: [
        { name: 'JavaScript Files', extensions: ['js'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!result.canceled) {
      await fs.writeFile(result.filePath, workerContent, 'utf8');
      return { success: true, filePath: result.filePath };
    }

    return { success: false, canceled: true };
  } catch (error) {
    console.error('Cloudflare Worker export failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Show about dialog
 */
function showAbout() {
  const aboutWindow = mb.window || null;
  dialog.showMessageBox(aboutWindow, {
    type: 'info',
    title: 'About Slack Status Scheduler',
    message: 'Slack Status Scheduler',
    detail: `Version 1.0.0\n\nA macOS menu bar app for scheduling Slack status updates.\n\nBuilt with Electron and Node.js.`,
    buttons: ['OK'],
  });
}

// Set up IPC handlers first
setupIPC();

// App event handlers
app.whenReady().then(() => {
  createMenuBar();
});

app.on('window-all-closed', () => {
  // On macOS, keep the app running even when all windows are closed
  // The menu bar icon should remain active
  console.log('All windows closed, but keeping app running for menu bar');
});

app.on('before-quit', () => {
  console.log('App is quitting');
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createMenuBar();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mb && mb.window) {
      mb.showWindow();
    }
  });
}

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
