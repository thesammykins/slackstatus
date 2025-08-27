/**
 * Slack Status Scheduler - macOS Menu Bar App UI Controller
 * Handles all UI interactions and communication with Electron main process
 */

const { ipcRenderer } = require('electron');

// Application state
let currentSchedule = {
  version: 1,
  timezone: 'America/Los_Angeles',
  options: {
    clear_when_no_match: false,
  },
  rules: [],
};

// Default schedule for first-time users
const defaultSchedule = {
  version: 1,
  timezone: 'America/Los_Angeles',
  options: {
    clear_when_no_match: false,
  },
  rules: [
    {
      id: 'morning-focus',
      type: 'weekly',
      days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      time: '09:00',
      status: {
        text: 'Deep work time',
        emoji: '🧠',
        expire_hour: 11,
      },
      enabled: true,
    },
    {
      id: 'lunch-break',
      type: 'weekly',
      days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      time: '12:00',
      status: {
        text: 'Lunch break',
        emoji: '🍽️',
        expire_hour: 13,
      },
      enabled: true,
    },
  ],
};

let editingRuleIndex = -1;
let isLoading = false;

// DOM elements (will be populated on DOMContentLoaded)
let elements = {};

/**
 * Initialize the application
 */
function init() {
  // Get all DOM elements
  elements = {
    // Navigation
    navTabs: document.querySelectorAll('.nav-tab'),
    tabContents: document.querySelectorAll('.tab-content'),

    // Dashboard
    currentStatus: document.getElementById('current-status'),
    runNowBtn: document.getElementById('run-now-btn'),
    previewNowBtn: document.getElementById('preview-now-btn'),
    upcomingList: document.getElementById('upcoming-list'),
    exportGithubBtn: document.getElementById('export-github-btn'),
    exportCloudflareBtn: document.getElementById('export-cloudflare-btn'),

    // Schedule Editor
    loadScheduleBtn: document.getElementById('load-schedule-btn'),
    saveScheduleBtn: document.getElementById('save-schedule-btn'),
    validateScheduleBtn: document.getElementById('validate-schedule-btn'),
    addRuleBtn: document.getElementById('add-rule-btn'),
    scheduleTimezone: document.getElementById('schedule-timezone'),
    clearWhenNoMatch: document.getElementById('clear-when-no-match'),
    rulesList: document.getElementById('rules-list'),
    scheduleJsonEditor: document.getElementById('schedule-json-editor'),

    // Preview
    previewDate: document.getElementById('preview-date'),
    previewBtn: document.getElementById('preview-btn'),
    previewOutput: document.getElementById('preview-output'),
    previewDays: document.getElementById('preview-days'),
    upcomingPreviewBtn: document.getElementById('upcoming-preview-btn'),
    upcomingPreviewOutput: document.getElementById('upcoming-preview-output'),

    // Settings
    slackToken: document.getElementById('slack-token'),
    toggleTokenVisibility: document.getElementById('toggle-token-visibility'),
    tokenHelpLink: document.getElementById('token-help-link'),
    saveTokenBtn: document.getElementById('save-token-btn'),
    testTokenBtn: document.getElementById('test-token-btn'),
    clearTokenBtn: document.getElementById('clear-token-btn'),
    startAtLogin: document.getElementById('start-at-login'),
    enableNotifications: document.getElementById('enable-notifications'),
    logLevel: document.getElementById('log-level'),
    settingsExportGithubBtn: document.getElementById('settings-export-github-btn'),
    settingsExportCloudflareBtn: document.getElementById('settings-export-cloudflare-btn'),
    documentationLink: document.getElementById('documentation-link'),
    githubLink: document.getElementById('github-link'),
    reportIssueLink: document.getElementById('report-issue-link'),

    // Logs
    clearLogsBtn: document.getElementById('clear-logs-btn'),
    exportLogsBtn: document.getElementById('export-logs-btn'),
    refreshLogsBtn: document.getElementById('refresh-logs-btn'),
    logsFilter: document.getElementById('logs-filter'),
    logsOutput: document.getElementById('logs-output'),

    // Status bar
    statusText: document.getElementById('status-text'),
    connectionStatus: document.getElementById('connection-status'),

    // Rule modal
    ruleModal: document.getElementById('rule-modal'),
    ruleModalTitle: document.getElementById('rule-modal-title'),
    ruleForm: document.getElementById('rule-form'),
    ruleId: document.getElementById('rule-id'),
    ruleType: document.getElementById('rule-type'),
    ruleDaysGroup: document.getElementById('rule-days-group'),
    ruleIntervalGroup: document.getElementById('rule-interval-group'),
    ruleDatesGroup: document.getElementById('rule-dates-group'),
    ruleTime: document.getElementById('rule-time'),
    ruleStatusText: document.getElementById('rule-status-text'),
    ruleStatusEmoji: document.getElementById('rule-status-emoji'),
    ruleExpireHour: document.getElementById('rule-expire-hour'),
    ruleEnabled: document.getElementById('rule-enabled'),
    ruleCancelBtn: document.getElementById('rule-cancel-btn'),
    ruleSaveBtn: document.getElementById('rule-save-btn'),
    modalClose: document.querySelector('.modal-close'),

    // Loading overlay
    loadingOverlay: document.getElementById('loading-overlay'),
  };

  // Set up event listeners
  setupEventListeners();

  // Initialize UI
  loadDefaultScheduleIfEmpty();
  updateScheduleDisplay();
  loadToken();
  refreshUpcoming();
  setStatus('Ready');

  // Set default preview date to today
  elements.previewDate.value = new Date().toISOString().split('T')[0];
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  // Navigation
  elements.navTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Dashboard
  elements.runNowBtn.addEventListener('click', runScheduleNow);
  elements.previewNowBtn.addEventListener('click', previewScheduleNow);
  elements.exportGithubBtn.addEventListener('click', () => exportSchedule('github'));
  elements.exportCloudflareBtn.addEventListener('click', () => exportSchedule('cloudflare'));

  // Schedule Editor
  elements.loadScheduleBtn.addEventListener('click', loadScheduleFile);
  elements.saveScheduleBtn.addEventListener('click', saveScheduleFile);
  elements.validateScheduleBtn.addEventListener('click', validateSchedule);
  elements.addRuleBtn.addEventListener('click', () => openRuleModal());
  elements.scheduleTimezone.addEventListener('change', updateScheduleFromForm);
  elements.clearWhenNoMatch.addEventListener('change', updateScheduleFromForm);
  elements.scheduleJsonEditor.addEventListener('input', updateScheduleFromJson);

  // Preview
  elements.previewBtn.addEventListener('click', generatePreview);
  elements.upcomingPreviewBtn.addEventListener('click', generateUpcomingPreview);

  // Settings
  elements.toggleTokenVisibility.addEventListener('click', toggleTokenVisibility);
  elements.saveTokenBtn.addEventListener('click', saveToken);
  elements.testTokenBtn.addEventListener('click', testToken);
  elements.clearTokenBtn.addEventListener('click', clearToken);
  elements.tokenHelpLink.addEventListener('click', e => {
    e.preventDefault();
    openExternal('https://api.slack.com/authentication/token-types#user');
  });
  elements.settingsExportGithubBtn.addEventListener('click', () => exportSchedule('github'));
  elements.settingsExportCloudflareBtn.addEventListener('click', () =>
    exportSchedule('cloudflare')
  );
  elements.documentationLink.addEventListener('click', e => {
    e.preventDefault();
    openExternal('https://github.com/thesammykins/slackstatus#readme');
  });
  elements.githubLink.addEventListener('click', e => {
    e.preventDefault();
    openExternal('https://github.com/thesammykins/slackstatus');
  });
  elements.reportIssueLink.addEventListener('click', e => {
    e.preventDefault();
    openExternal('https://github.com/thesammykins/slackstatus/issues');
  });

  // Logs
  elements.clearLogsBtn.addEventListener('click', clearLogs);
  elements.exportLogsBtn.addEventListener('click', exportLogs);
  elements.refreshLogsBtn.addEventListener('click', refreshLogs);
  elements.logsFilter.addEventListener('change', filterLogs);

  // Rule modal
  elements.ruleType.addEventListener('change', updateRuleFormVisibility);
  elements.ruleForm.addEventListener('submit', saveRule);
  elements.ruleCancelBtn.addEventListener('click', closeRuleModal);
  elements.modalClose.addEventListener('click', closeRuleModal);
  elements.ruleModal.addEventListener('click', e => {
    if (e.target === elements.ruleModal) {
      closeRuleModal();
    }
  });

  // IPC listeners
  ipcRenderer.on('navigate-to', (event, tab) => {
    switchTab(tab);
  });

  // Global keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (elements.ruleModal.classList.contains('show')) {
        closeRuleModal();
      }
    }
  });
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  // Update nav tabs
  elements.navTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Update tab content
  elements.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });

  // Load tab-specific data
  switch (tabName) {
    case 'dashboard':
      refreshUpcoming();
      break;
    case 'preview':
      // Set today's date if not already set
      if (!elements.previewDate.value) {
        elements.previewDate.value = new Date().toISOString().split('T')[0];
      }
      break;
    case 'logs':
      refreshLogs();
      break;
  }
}

/**
 * Set loading state
 */
function setLoading(loading, message = 'Loading...') {
  isLoading = loading;
  if (loading) {
    elements.loadingOverlay.querySelector('.loading-text').textContent = message;
    elements.loadingOverlay.classList.add('show');
  } else {
    elements.loadingOverlay.classList.remove('show');
  }
}

/**
 * Set status message
 */
function setStatus(message, isError = false) {
  elements.statusText.textContent = message;
  if (isError) {
    elements.statusText.style.color = '#dc3545';
  } else {
    elements.statusText.style.color = '#6c757d';
  }
}

/**
 * Update connection status
 */
function setConnectionStatus(connected) {
  elements.connectionStatus.classList.toggle('connected', connected);
  elements.connectionStatus.classList.toggle('disconnected', !connected);
}

/**
 * Open external URL
 */
async function openExternal(url) {
  await ipcRenderer.invoke('open-external', url);
}

/**
 * Dashboard functions
 */
async function runScheduleNow() {
  if (isLoading) return;

  try {
    setLoading(true, 'Running schedule...');
    setStatus('Running schedule...');

    const result = await ipcRenderer.invoke('scheduler-run', currentSchedule, false);

    if (result.success) {
      setStatus('Schedule executed successfully');
      updateCurrentStatusDisplay(result.result);
      setConnectionStatus(true);
    } else {
      setStatus(`Error: ${result.error}`, true);
      setConnectionStatus(false);
    }
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
    setConnectionStatus(false);
  } finally {
    setLoading(false);
  }
}

async function previewScheduleNow() {
  if (isLoading) return;

  try {
    setLoading(true, 'Generating preview...');
    setStatus('Generating preview...');

    const result = await ipcRenderer.invoke('scheduler-preview', currentSchedule);

    if (result.success) {
      setStatus('Preview generated');
      updateCurrentStatusDisplay(result.result);
    } else {
      setStatus(`Error: ${result.error}`, true);
    }
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
  } finally {
    setLoading(false);
  }
}

function updateCurrentStatusDisplay(result) {
  const emoji = elements.currentStatus.querySelector('.status-emoji');
  const text = elements.currentStatus.querySelector('.status-text');

  if (result.action === 'update_status') {
    emoji.textContent = result.status.emoji || '📝';
    text.textContent = result.status.text || 'Status updated';
  } else if (result.action === 'clear_status') {
    emoji.textContent = '🚫';
    text.textContent = 'Status cleared';
  } else {
    emoji.textContent = '😴';
    text.textContent = 'No change';
  }
}

async function refreshUpcoming() {
  try {
    const result = await ipcRenderer.invoke('scheduler-upcoming', currentSchedule, 7);

    if (result && result.success) {
      displayUpcoming(result.upcoming);
    } else {
      const errorMsg = result ? result.error : 'Unknown error';
      elements.upcomingList.innerHTML = `<div class="text-muted">Error loading upcoming changes: ${errorMsg}</div>`;
      addLogEntry('warn', `Failed to load upcoming changes: ${errorMsg}`);
    }
  } catch (error) {
    elements.upcomingList.innerHTML = `<div class="text-muted">Error: ${error.message}</div>`;
    addLogEntry('error', `Exception in refreshUpcoming: ${error.message}`);
  }
}

function displayUpcoming(upcoming) {
  if (!upcoming || upcoming.length === 0) {
    elements.upcomingList.innerHTML = '<div class="text-muted">No upcoming changes</div>';
    return;
  }

  const html = upcoming
    .map(
      item => `
        <div class="upcoming-item">
            <div class="upcoming-status">
                ${item.status.emoji || '📝'} ${item.status.text}
            </div>
            <div class="upcoming-time">
                ${item.date} ${item.time}
            </div>
        </div>
    `
    )
    .join('');

  elements.upcomingList.innerHTML = html;
}

async function exportSchedule(type) {
  if (isLoading) return;

  try {
    setLoading(true, `Exporting to ${type}...`);
    setStatus(`Exporting to ${type}...`);

    let result;
    if (type === 'github') {
      result = await ipcRenderer.invoke('export-github-actions', currentSchedule);
    } else if (type === 'cloudflare') {
      result = await ipcRenderer.invoke('export-cloudflare-worker', currentSchedule);
    }

    if (result.success && !result.canceled) {
      setStatus(`Exported to ${result.filePath}`);
    } else if (result.canceled) {
      setStatus('Export canceled');
    } else {
      setStatus(`Export failed: ${result.error}`, true);
    }
  } catch (error) {
    setStatus(`Export error: ${error.message}`, true);
  } finally {
    setLoading(false);
  }
}

/**
 * Schedule Editor functions
 */
async function loadScheduleFile() {
  try {
    const result = await ipcRenderer.invoke('file-dialog-open');

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const fileResult = await ipcRenderer.invoke('file-read', filePath);

      if (fileResult.success) {
        try {
          currentSchedule = JSON.parse(fileResult.content);
          updateScheduleDisplay();
          setStatus(`Loaded schedule from ${filePath}`);
        } catch (parseError) {
          setStatus(`Invalid JSON: ${parseError.message}`, true);
        }
      } else {
        setStatus(`Failed to read file: ${fileResult.error}`, true);
      }
    }
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
  }
}

async function saveScheduleFile() {
  try {
    const result = await ipcRenderer.invoke('file-dialog-save', 'schedule.json');

    if (!result.canceled) {
      const content = JSON.stringify(currentSchedule, null, 2);
      const fileResult = await ipcRenderer.invoke('file-write', result.filePath, content);

      if (fileResult.success) {
        setStatus(`Saved schedule to ${result.filePath}`);
      } else {
        setStatus(`Failed to save file: ${fileResult.error}`, true);
      }
    }
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
  }
}

async function validateSchedule() {
  try {
    // Try to run a preview to validate
    const result = await ipcRenderer.invoke('scheduler-preview', currentSchedule);

    if (result.success) {
      setStatus('Schedule is valid ✓');
    } else {
      setStatus(`Validation failed: ${result.error}`, true);
    }
  } catch (error) {
    setStatus(`Validation error: ${error.message}`, true);
  }
}

function updateScheduleDisplay() {
  // Update form controls
  elements.scheduleTimezone.value = currentSchedule.timezone || 'America/Los_Angeles';
  elements.clearWhenNoMatch.checked = currentSchedule.options?.clear_when_no_match || false;

  // Update JSON editor
  elements.scheduleJsonEditor.value = JSON.stringify(currentSchedule, null, 2);

  // Update rules list
  displayRules();

  // Refresh upcoming changes
  refreshUpcoming();
}

function updateScheduleFromForm() {
  currentSchedule.timezone = elements.scheduleTimezone.value;
  currentSchedule.options = {
    ...currentSchedule.options,
    clear_when_no_match: elements.clearWhenNoMatch.checked,
  };

  // Update JSON editor
  elements.scheduleJsonEditor.value = JSON.stringify(currentSchedule, null, 2);
}

function updateScheduleFromJson() {
  try {
    const newSchedule = JSON.parse(elements.scheduleJsonEditor.value);
    currentSchedule = newSchedule;

    // Update form controls
    elements.scheduleTimezone.value = currentSchedule.timezone || 'America/Los_Angeles';
    elements.clearWhenNoMatch.checked = currentSchedule.options?.clear_when_no_match || false;

    // Update rules display
    displayRules();

    setStatus('Schedule updated from JSON');
  } catch (error) {
    // Don't update if JSON is invalid, just show error briefly
    setStatus(`Invalid JSON: ${error.message}`, true);
    setTimeout(() => setStatus('Ready'), 3000);
  }
}

function displayRules() {
  if (!currentSchedule.rules || currentSchedule.rules.length === 0) {
    elements.rulesList.innerHTML = '<div class="text-muted">No rules defined</div>';
    return;
  }

  const html = currentSchedule.rules
    .map((rule, index) => {
      let typeDescription = '';
      switch (rule.type) {
        case 'daily':
          typeDescription = 'Daily';
          break;
        case 'weekly':
          typeDescription = `Weekly: ${rule.days?.join(', ') || 'No days'}`;
          break;
        case 'every-n-days':
          typeDescription = `Every ${rule.interval || '?'} days`;
          break;
        case 'dates':
          typeDescription = `Dates: ${rule.dates?.join(', ') || 'No dates'}`;
          break;
      }

      const statusText = rule.status?.text || 'No status';
      const statusEmoji = rule.status?.emoji || '';

      return `
            <div class="rule-item">
                <div class="rule-info">
                    <div class="rule-id">${rule.id || `Rule ${index + 1}`}</div>
                    <div class="rule-details">
                        ${typeDescription} at ${rule.time || '??:??'} → ${statusEmoji} ${statusText}
                    </div>
                </div>
                <div class="rule-actions">
                    <button class="btn btn-outline" onclick="editRule(${index})">Edit</button>
                    <button class="btn btn-danger" onclick="deleteRule(${index})">Delete</button>
                </div>
            </div>
        `;
    })
    .join('');

  elements.rulesList.innerHTML = html;
}

function openRuleModal(ruleIndex = -1) {
  editingRuleIndex = ruleIndex;

  if (ruleIndex >= 0) {
    // Editing existing rule
    const rule = currentSchedule.rules[ruleIndex];
    elements.ruleModalTitle.textContent = 'Edit Rule';
    populateRuleForm(rule);
  } else {
    // Adding new rule
    elements.ruleModalTitle.textContent = 'Add New Rule';
    elements.ruleForm.reset();
    elements.ruleEnabled.checked = true;
  }

  updateRuleFormVisibility();
  elements.ruleModal.classList.add('show');
}

function closeRuleModal() {
  elements.ruleModal.classList.remove('show');
  editingRuleIndex = -1;
}

function populateRuleForm(rule) {
  elements.ruleId.value = rule.id || '';
  elements.ruleType.value = rule.type || 'daily';
  elements.ruleTime.value = rule.time || '';
  elements.ruleStatusText.value = rule.status?.text || '';
  elements.ruleStatusEmoji.value = rule.status?.emoji || '';
  elements.ruleExpireHour.value = rule.status?.expire_hour || '';
  elements.ruleEnabled.checked = rule.enabled !== false;

  // Type-specific fields
  if (rule.type === 'weekly' && rule.days) {
    const checkboxes = elements.ruleDaysGroup.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = rule.days.includes(cb.value);
    });
  }

  if (rule.type === 'every-n-days' && rule.interval) {
    document.getElementById('rule-interval').value = rule.interval;
  }

  if (rule.type === 'dates' && rule.dates) {
    document.getElementById('rule-dates').value = rule.dates.join(', ');
  }
}

function updateRuleFormVisibility() {
  const type = elements.ruleType.value;

  // Hide all optional groups
  elements.ruleDaysGroup.style.display = 'none';
  elements.ruleIntervalGroup.style.display = 'none';
  elements.ruleDatesGroup.style.display = 'none';

  // Show relevant groups
  switch (type) {
    case 'weekly':
      elements.ruleDaysGroup.style.display = 'block';
      break;
    case 'every-n-days':
      elements.ruleIntervalGroup.style.display = 'block';
      break;
    case 'dates':
      elements.ruleDatesGroup.style.display = 'block';
      break;
  }
}

function saveRule(e) {
  e.preventDefault();

  const rule = {
    id: elements.ruleId.value,
    type: elements.ruleType.value,
    time: elements.ruleTime.value,
    status: {
      text: elements.ruleStatusText.value,
      emoji: elements.ruleStatusEmoji.value,
    },
    enabled: elements.ruleEnabled.checked,
  };

  // Add expire hour if specified
  if (elements.ruleExpireHour.value) {
    rule.status.expire_hour = parseInt(elements.ruleExpireHour.value);
  }

  // Add type-specific fields
  switch (rule.type) {
    case 'weekly':
      const checkedDays = Array.from(
        elements.ruleDaysGroup.querySelectorAll('input[type="checkbox"]:checked')
      ).map(cb => cb.value);
      rule.days = checkedDays;
      break;
    case 'every-n-days':
      rule.interval = parseInt(document.getElementById('rule-interval').value);
      break;
    case 'dates':
      const datesStr = document.getElementById('rule-dates').value;
      rule.dates = datesStr
        .split(',')
        .map(d => d.trim())
        .filter(d => d);
      break;
  }

  // Update schedule
  if (editingRuleIndex >= 0) {
    currentSchedule.rules[editingRuleIndex] = rule;
  } else {
    if (!currentSchedule.rules) {
      currentSchedule.rules = [];
    }
    currentSchedule.rules.push(rule);
  }

  updateScheduleDisplay();
  closeRuleModal();
  setStatus(editingRuleIndex >= 0 ? 'Rule updated' : 'Rule added');
}

// Global functions for rule actions (called from HTML)
window.editRule = function (index) {
  openRuleModal(index);
};

window.deleteRule = function (index) {
  if (confirm('Are you sure you want to delete this rule?')) {
    currentSchedule.rules.splice(index, 1);
    updateScheduleDisplay();
    setStatus('Rule deleted');
  }
};

/**
 * Preview functions
 */
async function generatePreview() {
  if (isLoading) return;

  try {
    setLoading(true, 'Generating preview...');

    const targetDate = elements.previewDate.value;
    const result = await ipcRenderer.invoke('scheduler-preview', currentSchedule, targetDate);

    if (result.success) {
      elements.previewOutput.textContent = JSON.stringify(result.result, null, 2);
      setStatus('Preview generated');
    } else {
      elements.previewOutput.textContent = `Error: ${result.error}`;
      setStatus(`Preview failed: ${result.error}`, true);
    }
  } catch (error) {
    elements.previewOutput.textContent = `Error: ${error.message}`;
    setStatus(`Preview error: ${error.message}`, true);
  } finally {
    setLoading(false);
  }
}

async function generateUpcomingPreview() {
  if (isLoading) return;

  try {
    setLoading(true, 'Generating upcoming preview...');

    const days = parseInt(elements.previewDays.value) || 7;
    const result = await ipcRenderer.invoke('scheduler-upcoming', currentSchedule, days);

    if (result.success) {
      elements.upcomingPreviewOutput.textContent = JSON.stringify(result.upcoming, null, 2);
      setStatus('Upcoming preview generated');
    } else {
      elements.upcomingPreviewOutput.textContent = `Error: ${result.error}`;
      setStatus(`Preview failed: ${result.error}`, true);
    }
  } catch (error) {
    elements.upcomingPreviewOutput.textContent = `Error: ${error.message}`;
    setStatus(`Preview error: ${error.message}`, true);
  } finally {
    setLoading(false);
  }
}

/**
 * Settings functions
 */
async function loadToken() {
  try {
    const result = await ipcRenderer.invoke('keychain-get-token');
    if (result && result.success && result.token) {
      elements.slackToken.value = result.token;
      setConnectionStatus(true);
      addLogEntry('info', 'Token loaded from Keychain');
    } else {
      setConnectionStatus(false);
      addLogEntry('info', 'No token found in Keychain');
    }
  } catch (error) {
    console.error('Failed to load token:', error);
    addLogEntry('error', `Failed to load token: ${error.message}`);
    setConnectionStatus(false);
  }
}

function toggleTokenVisibility() {
  const isPassword = elements.slackToken.type === 'password';
  elements.slackToken.type = isPassword ? 'text' : 'password';
  elements.toggleTokenVisibility.textContent = isPassword ? '🙈' : '👁️';
}

async function saveToken() {
  if (isLoading) return;

  const token = elements.slackToken.value.trim();
  if (!token) {
    setStatus('Please enter a token', true);
    return;
  }

  try {
    setLoading(true, 'Saving token...');
    setStatus('Saving token...');

    const result = await ipcRenderer.invoke('keychain-set-token', token);

    if (result.success) {
      setStatus('Token saved to Keychain');
      setConnectionStatus(true);
    } else {
      setStatus(`Failed to save token: ${result.error}`, true);
      setConnectionStatus(false);
    }
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
    setConnectionStatus(false);
  } finally {
    setLoading(false);
  }
}

async function testToken() {
  if (isLoading) return;

  try {
    setLoading(true, 'Testing connection...');
    setStatus('Testing Slack connection...');

    // Try to run a preview to test the token
    const result = await ipcRenderer.invoke('scheduler-preview', currentSchedule);

    if (result.success) {
      setStatus('Token is valid ✓');
      setConnectionStatus(true);
    } else {
      setStatus(`Token test failed: ${result.error}`, true);
      setConnectionStatus(false);
    }
  } catch (error) {
    setStatus(`Test error: ${error.message}`, true);
    setConnectionStatus(false);
  } finally {
    setLoading(false);
  }
}

async function clearToken() {
  if (!confirm('Are you sure you want to clear the saved token?')) {
    return;
  }

  try {
    setLoading(true, 'Clearing token...');
    setStatus('Clearing token...');

    const result = await ipcRenderer.invoke('keychain-delete-token');

    if (result.success) {
      elements.slackToken.value = '';
      setStatus('Token cleared');
      setConnectionStatus(false);
    } else {
      setStatus(`Failed to clear token: ${result.error}`, true);
    }
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
  } finally {
    setLoading(false);
  }
}

/**
 * Logs functions
 */
function clearLogs() {
  elements.logsOutput.innerHTML = '';
  setStatus('Logs cleared');
}

async function exportLogs() {
  try {
    const logs = elements.logsOutput.textContent;
    const result = await ipcRenderer.invoke('file-dialog-save', 'logs.txt');

    if (!result.canceled) {
      const fileResult = await ipcRenderer.invoke('file-write', result.filePath, logs);

      if (fileResult.success) {
        setStatus(`Logs exported to ${result.filePath}`);
      } else {
        setStatus(`Failed to export logs: ${fileResult.error}`, true);
      }
    }
  } catch (error) {
    setStatus(`Export error: ${error.message}`, true);
  }
}

function refreshLogs() {
  // In a real implementation, this would fetch logs from the main process
  // For now, we'll just add a timestamp
  addLogEntry('info', `Logs refreshed at ${new Date().toLocaleTimeString()}`);
}

function filterLogs() {
  const filter = elements.logsFilter.value;
  const entries = elements.logsOutput.querySelectorAll('.log-entry');

  entries.forEach(entry => {
    if (filter === 'all' || entry.classList.contains(filter)) {
      entry.style.display = 'block';
    } else {
      entry.style.display = 'none';
    }
  });
}

function addLogEntry(level, message) {
  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry ${level}`;
  entry.textContent = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

  elements.logsOutput.appendChild(entry);
  elements.logsOutput.scrollTop = elements.logsOutput.scrollHeight;
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export functions for debugging
/**
 * Load default schedule if current schedule is empty
 */
function loadDefaultScheduleIfEmpty() {
  if (!currentSchedule.rules || currentSchedule.rules.length === 0) {
    currentSchedule = { ...defaultSchedule };
    setStatus('Loaded default schedule');
    addLogEntry('info', 'Loaded default schedule for first-time setup');
  }
}

if (process.env.NODE_ENV === 'development') {
  window.debug = {
    getCurrentSchedule: () => currentSchedule,
    setCurrentSchedule: schedule => {
      currentSchedule = schedule;
      updateScheduleDisplay();
    },
    addLog: addLogEntry,
    loadDefault: loadDefaultScheduleIfEmpty,
  };
}
