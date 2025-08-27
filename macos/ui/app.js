/**
 * Slack Status Scheduler - macOS Menu Bar App UI Controller
 * Handles all UI interactions and communication with Electron main process
 */

// Check if we're in Electron environment
const ipcRenderer = (typeof window !== 'undefined' && window.require) ?
  window.require('electron').ipcRenderer : null;

// Application state
let currentSchedule = {
  version: 1,
  timezone: 'UTC', // Will be updated to user's timezone during initialization
  options: {
    clear_when_no_match: false,
  },
  rules: [],
};

// Default schedule for first-time users
const defaultSchedule = {
  version: 1,
  timezone: 'UTC', // Will be updated after timezone utils are available
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

// Timezone data and utilities
const timezoneUtils = {
  // Get all available timezones
  getAllTimezones() {
    try {
      // Modern browsers support this
      if (Intl.supportedValuesOf) {
        return Intl.supportedValuesOf('timeZone');
      }
    } catch (error) {
      console.warn('Intl.supportedValuesOf not available, using fallback list');
    }

    // Fallback comprehensive list of IANA timezones
    return [
      'UTC',
      'Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Algiers', 'Africa/Asmara',
      'Africa/Bamako', 'Africa/Bangui', 'Africa/Banjul', 'Africa/Bissau', 'Africa/Blantyre',
      'Africa/Brazzaville', 'Africa/Bujumbura', 'Africa/Cairo', 'Africa/Casablanca', 'Africa/Ceuta',
      'Africa/Conakry', 'Africa/Dakar', 'Africa/Dar_es_Salaam', 'Africa/Djibouti', 'Africa/Douala',
      'Africa/El_Aaiun', 'Africa/Freetown', 'Africa/Gaborone', 'Africa/Harare', 'Africa/Johannesburg',
      'Africa/Juba', 'Africa/Kampala', 'Africa/Khartoum', 'Africa/Kigali', 'Africa/Kinshasa',
      'Africa/Lagos', 'Africa/Libreville', 'Africa/Lome', 'Africa/Luanda', 'Africa/Lubumbashi',
      'Africa/Lusaka', 'Africa/Malabo', 'Africa/Maputo', 'Africa/Maseru', 'Africa/Mbabane',
      'Africa/Mogadishu', 'Africa/Monrovia', 'Africa/Nairobi', 'Africa/Ndjamena', 'Africa/Niamey',
      'Africa/Nouakchott', 'Africa/Ouagadougou', 'Africa/Porto-Novo', 'Africa/Sao_Tome', 'Africa/Tripoli',
      'Africa/Tunis', 'Africa/Windhoek',
      'America/Adak', 'America/Anchorage', 'America/Anguilla', 'America/Antigua', 'America/Araguaina',
      'America/Argentina/Buenos_Aires', 'America/Argentina/Catamarca', 'America/Argentina/Cordoba',
      'America/Argentina/Jujuy', 'America/Argentina/La_Rioja', 'America/Argentina/Mendoza',
      'America/Argentina/Rio_Gallegos', 'America/Argentina/Salta', 'America/Argentina/San_Juan',
      'America/Argentina/San_Luis', 'America/Argentina/Tucuman', 'America/Argentina/Ushuaia',
      'America/Aruba', 'America/Asuncion', 'America/Atikokan', 'America/Bahia', 'America/Bahia_Banderas',
      'America/Barbados', 'America/Belem', 'America/Belize', 'America/Blanc-Sablon', 'America/Boa_Vista',
      'America/Bogota', 'America/Boise', 'America/Cambridge_Bay', 'America/Campo_Grande', 'America/Cancun',
      'America/Caracas', 'America/Cayenne', 'America/Cayman', 'America/Chicago', 'America/Chihuahua',
      'America/Costa_Rica', 'America/Creston', 'America/Cuiaba', 'America/Curacao', 'America/Danmarkshavn',
      'America/Dawson', 'America/Dawson_Creek', 'America/Denver', 'America/Detroit', 'America/Dominica',
      'America/Edmonton', 'America/Eirunepe', 'America/El_Salvador', 'America/Fort_Nelson', 'America/Fortaleza',
      'America/Glace_Bay', 'America/Godthab', 'America/Goose_Bay', 'America/Grand_Turk', 'America/Grenada',
      'America/Guadeloupe', 'America/Guatemala', 'America/Guayaquil', 'America/Guyana', 'America/Halifax',
      'America/Havana', 'America/Hermosillo', 'America/Indiana/Indianapolis', 'America/Indiana/Knox',
      'America/Indiana/Marengo', 'America/Indiana/Petersburg', 'America/Indiana/Tell_City',
      'America/Indiana/Vevay', 'America/Indiana/Vincennes', 'America/Indiana/Winamac', 'America/Inuvik',
      'America/Iqaluit', 'America/Jamaica', 'America/Juneau', 'America/Kentucky/Louisville',
      'America/Kentucky/Monticello', 'America/Kralendijk', 'America/La_Paz', 'America/Lima',
      'America/Los_Angeles', 'America/Lower_Princes', 'America/Maceio', 'America/Managua',
      'America/Manaus', 'America/Marigot', 'America/Martinique', 'America/Matamoros', 'America/Mazatlan',
      'America/Menominee', 'America/Merida', 'America/Metlakatla', 'America/Mexico_City', 'America/Miquelon',
      'America/Moncton', 'America/Monterrey', 'America/Montevideo', 'America/Montserrat', 'America/Nassau',
      'America/New_York', 'America/Nipigon', 'America/Nome', 'America/Noronha', 'America/North_Dakota/Beulah',
      'America/North_Dakota/Center', 'America/North_Dakota/New_Salem', 'America/Ojinaga', 'America/Panama',
      'America/Pangnirtung', 'America/Paramaribo', 'America/Phoenix', 'America/Port-au-Prince',
      'America/Port_of_Spain', 'America/Porto_Velho', 'America/Puerto_Rico', 'America/Punta_Arenas',
      'America/Rainy_River', 'America/Rankin_Inlet', 'America/Recife', 'America/Regina', 'America/Resolute',
      'America/Rio_Branco', 'America/Santarem', 'America/Santiago', 'America/Santo_Domingo',
      'America/Sao_Paulo', 'America/Scoresbysund', 'America/Sitka', 'America/St_Barthelemy',
      'America/St_Johns', 'America/St_Kitts', 'America/St_Lucia', 'America/St_Thomas',
      'America/St_Vincent', 'America/Swift_Current', 'America/Tegucigalpa', 'America/Thule',
      'America/Thunder_Bay', 'America/Tijuana', 'America/Toronto', 'America/Tortola', 'America/Vancouver',
      'America/Whitehorse', 'America/Winnipeg', 'America/Yakutat', 'America/Yellowknife',
      'Antarctica/Casey', 'Antarctica/Davis', 'Antarctica/DumontDUrville', 'Antarctica/Macquarie',
      'Antarctica/Mawson', 'Antarctica/McMurdo', 'Antarctica/Palmer', 'Antarctica/Rothera',
      'Antarctica/Syowa', 'Antarctica/Troll', 'Antarctica/Vostok',
      'Arctic/Longyearbyen',
      'Asia/Aden', 'Asia/Almaty', 'Asia/Amman', 'Asia/Anadyr', 'Asia/Aqtau', 'Asia/Aqtobe',
      'Asia/Ashgabat', 'Asia/Atyrau', 'Asia/Baghdad', 'Asia/Bahrain', 'Asia/Baku', 'Asia/Bangkok',
      'Asia/Barnaul', 'Asia/Beirut', 'Asia/Bishkek', 'Asia/Brunei', 'Asia/Chita', 'Asia/Choibalsan',
      'Asia/Colombo', 'Asia/Damascus', 'Asia/Dhaka', 'Asia/Dili', 'Asia/Dubai', 'Asia/Dushanbe',
      'Asia/Famagusta', 'Asia/Gaza', 'Asia/Hebron', 'Asia/Ho_Chi_Minh', 'Asia/Hong_Kong',
      'Asia/Hovd', 'Asia/Irkutsk', 'Asia/Jakarta', 'Asia/Jayapura', 'Asia/Jerusalem', 'Asia/Kabul',
      'Asia/Kamchatka', 'Asia/Karachi', 'Asia/Kathmandu', 'Asia/Khandyga', 'Asia/Kolkata',
      'Asia/Krasnoyarsk', 'Asia/Kuala_Lumpur', 'Asia/Kuching', 'Asia/Kuwait', 'Asia/Macau',
      'Asia/Magadan', 'Asia/Makassar', 'Asia/Manila', 'Asia/Muscat', 'Asia/Nicosia', 'Asia/Novokuznetsk',
      'Asia/Novosibirsk', 'Asia/Omsk', 'Asia/Oral', 'Asia/Phnom_Penh', 'Asia/Pontianak',
      'Asia/Pyongyang', 'Asia/Qatar', 'Asia/Qostanay', 'Asia/Qyzylorda', 'Asia/Riyadh',
      'Asia/Sakhalin', 'Asia/Samarkand', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore',
      'Asia/Srednekolymsk', 'Asia/Taipei', 'Asia/Tashkent', 'Asia/Tbilisi', 'Asia/Tehran',
      'Asia/Thimphu', 'Asia/Tokyo', 'Asia/Tomsk', 'Asia/Ulaanbaatar', 'Asia/Urumqi',
      'Asia/Ust-Nera', 'Asia/Vientiane', 'Asia/Vladivostok', 'Asia/Yakutsk', 'Asia/Yangon',
      'Asia/Yekaterinburg', 'Asia/Yerevan',
      'Atlantic/Azores', 'Atlantic/Bermuda', 'Atlantic/Canary', 'Atlantic/Cape_Verde',
      'Atlantic/Faroe', 'Atlantic/Madeira', 'Atlantic/Reykjavik', 'Atlantic/South_Georgia',
      'Atlantic/St_Helena', 'Atlantic/Stanley',
      'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Broken_Hill', 'Australia/Currie',
      'Australia/Darwin', 'Australia/Eucla', 'Australia/Hobart', 'Australia/Lindeman',
      'Australia/Lord_Howe', 'Australia/Melbourne', 'Australia/Perth', 'Australia/Sydney',
      'Europe/Amsterdam', 'Europe/Andorra', 'Europe/Astrakhan', 'Europe/Athens', 'Europe/Belgrade',
      'Europe/Berlin', 'Europe/Bratislava', 'Europe/Brussels', 'Europe/Bucharest', 'Europe/Budapest',
      'Europe/Busingen', 'Europe/Chisinau', 'Europe/Copenhagen', 'Europe/Dublin', 'Europe/Gibraltar',
      'Europe/Guernsey', 'Europe/Helsinki', 'Europe/Isle_of_Man', 'Europe/Istanbul', 'Europe/Jersey',
      'Europe/Kaliningrad', 'Europe/Kiev', 'Europe/Kirov', 'Europe/Lisbon', 'Europe/Ljubljana',
      'Europe/London', 'Europe/Luxembourg', 'Europe/Madrid', 'Europe/Malta', 'Europe/Mariehamn',
      'Europe/Minsk', 'Europe/Monaco', 'Europe/Moscow', 'Europe/Oslo', 'Europe/Paris',
      'Europe/Podgorica', 'Europe/Prague', 'Europe/Riga', 'Europe/Rome', 'Europe/Samara',
      'Europe/San_Marino', 'Europe/Sarajevo', 'Europe/Saratov', 'Europe/Simferopol', 'Europe/Skopje',
      'Europe/Sofia', 'Europe/Stockholm', 'Europe/Tallinn', 'Europe/Tirane', 'Europe/Ulyanovsk',
      'Europe/Uzhgorod', 'Europe/Vaduz', 'Europe/Vatican', 'Europe/Vienna', 'Europe/Vilnius',
      'Europe/Volgograd', 'Europe/Warsaw', 'Europe/Zagreb', 'Europe/Zaporozhye', 'Europe/Zurich',
      'Indian/Antananarivo', 'Indian/Chagos', 'Indian/Christmas', 'Indian/Cocos', 'Indian/Comoro',
      'Indian/Kerguelen', 'Indian/Mahe', 'Indian/Maldives', 'Indian/Mauritius', 'Indian/Mayotte',
      'Indian/Reunion',
      'Pacific/Apia', 'Pacific/Auckland', 'Pacific/Bougainville', 'Pacific/Chatham', 'Pacific/Chuuk',
      'Pacific/Easter', 'Pacific/Efate', 'Pacific/Enderbury', 'Pacific/Fakaofo', 'Pacific/Fiji',
      'Pacific/Funafuti', 'Pacific/Galapagos', 'Pacific/Gambier', 'Pacific/Guadalcanal', 'Pacific/Guam',
      'Pacific/Honolulu', 'Pacific/Kiritimati', 'Pacific/Kosrae', 'Pacific/Kwajalein', 'Pacific/Majuro',
      'Pacific/Marquesas', 'Pacific/Midway', 'Pacific/Nauru', 'Pacific/Niue', 'Pacific/Norfolk',
      'Pacific/Noumea', 'Pacific/Pago_Pago', 'Pacific/Palau', 'Pacific/Pitcairn', 'Pacific/Pohnpei',
      'Pacific/Port_Moresby', 'Pacific/Rarotonga', 'Pacific/Saipan', 'Pacific/Tahiti', 'Pacific/Tarawa',
      'Pacific/Tongatapu', 'Pacific/Wake', 'Pacific/Wallis'
    ];
  },

  // Group timezones by continent/region
  groupTimezones(timezones) {
    const groups = {
      'UTC': ['UTC'],
      'Africa': [],
      'America': [],
      'Antarctica': [],
      'Arctic': [],
      'Asia': [],
      'Atlantic': [],
      'Australia': [],
      'Europe': [],
      'Indian': [],
      'Pacific': []
    };

    timezones.forEach(tz => {
      if (tz === 'UTC') return; // Already handled

      const parts = tz.split('/');
      const continent = parts[0];

      if (groups[continent]) {
        groups[continent].push(tz);
      }
    });

    // Sort each group
    Object.keys(groups).forEach(key => {
      groups[key].sort();
    });

    return groups;
  },

  // Get user's current timezone
  getUserTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('Could not detect user timezone, falling back to UTC');
      return 'UTC';
    }
  },

  // Format timezone for display (e.g., "America/New_York" -> "America/New York")
  formatTimezoneDisplay(timezone) {
    return timezone.replace(/_/g, ' ');
  },

  // Get timezone offset display (e.g., "UTC-5")
  getTimezoneOffset(timezone) {
    try {
      const now = new Date();

      // Get the offset in minutes for the target timezone
      const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
      const targetTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

      // Calculate offset in minutes
      const offsetMinutes = (targetTime.getTime() - utcTime.getTime()) / (1000 * 60);
      const offsetHours = offsetMinutes / 60;

      if (offsetHours === 0) return 'UTC';

      const sign = offsetHours > 0 ? '+' : '-';
      const hours = Math.abs(Math.floor(offsetHours));
      const minutes = Math.abs(offsetMinutes % 60);

      if (minutes === 0) {
        return `UTC${sign}${hours}`;
      } else {
        return `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
      }
    } catch (error) {
      return '';
    }
  }
};

/**
 * Initialize the application
 */
async function init() {
  console.log('=== App Initialization Started ===');

  // Initialize timezones first
  initializeTimezones();

  // Get all DOM elements
  console.log('Querying DOM elements...');
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
    ruleStartDate: document.getElementById('rule-start-date'),
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

  console.log('DOM Elements found:');
  console.log('- Nav tabs:', elements.navTabs.length);
  console.log('- Tab contents:', elements.tabContents.length);
  console.log('- Navigation tabs details:');
  elements.navTabs.forEach((tab, i) => {
    console.log(`  Tab ${i}: data-tab="${tab.dataset.tab}", active=${tab.classList.contains('active')}`);
  });
  console.log('- Tab contents details:');
  elements.tabContents.forEach((content, i) => {
    console.log(`  Content ${i}: id="${content.id}", active=${content.classList.contains('active')}`);
  });

  // Set up event listeners
  console.log('Setting up event listeners...');
  setupEventListeners();

  // Initialize UI with user's timezone
  initializeUserTimezone();
  loadDefaultScheduleIfEmpty();

  // Only update schedule display if elements are available
  if (elements.scheduleTimezone && elements.clearWhenNoMatch && elements.scheduleJsonEditor) {
    updateScheduleDisplay();
  }

  // Only load token if elements are available
  if (elements.slackToken) {
    loadToken();
  }

  // Only refresh upcoming if elements are available
  if (elements.upcomingList) {
    refreshUpcoming();
  }

  setStatus('Ready');

  // Set default preview date to today
  if (elements.previewDate) {
    elements.previewDate.value = new Date().toISOString().split('T')[0];
  }

  // Load the default schedule if it exists
  await loadDefaultSchedule();
}

/**
 * Initialize timezone selector with all available timezones
 */
function initializeTimezones() {
  // Get timezone select element
  const timezoneSelect = document.getElementById('schedule-timezone');
  if (!timezoneSelect) {
    console.error('Timezone select element not found');
    return;
  }

  // Clear existing options
  timezoneSelect.innerHTML = '';

  // Get all timezones and group them
  const allTimezones = timezoneUtils.getAllTimezones();
  const groupedTimezones = timezoneUtils.groupTimezones(allTimezones);
  const userTimezone = timezoneUtils.getUserTimezone();

  // Add user's current timezone at the top if it's not UTC
  if (userTimezone && userTimezone !== 'UTC') {
    const userOption = document.createElement('option');
    userOption.value = userTimezone;
    userOption.textContent = `${timezoneUtils.formatTimezoneDisplay(userTimezone)} (${timezoneUtils.getTimezoneOffset(userTimezone)}) - Current`;
    userOption.selected = true;
    timezoneSelect.appendChild(userOption);

    // Add separator
    const separator = document.createElement('option');
    separator.disabled = true;
    separator.textContent = '────────────────────────────────';
    timezoneSelect.appendChild(separator);
  }

  // Add grouped timezones
  Object.entries(groupedTimezones).forEach(([continent, timezones]) => {
    if (timezones.length === 0) return;

    // Create optgroup for continent
    const optgroup = document.createElement('optgroup');
    optgroup.label = continent;

    timezones.forEach(timezone => {
      const option = document.createElement('option');
      option.value = timezone;

      // Format display text
      let displayText = timezoneUtils.formatTimezoneDisplay(timezone);
      const offset = timezoneUtils.getTimezoneOffset(timezone);
      if (offset) {
        displayText += ` (${offset})`;
      }

      option.textContent = displayText;

      // Select user's timezone or default to UTC
      if (timezone === userTimezone || (timezone === 'UTC' && !userTimezone)) {
        option.selected = true;
      }

      optgroup.appendChild(option);
    });

    timezoneSelect.appendChild(optgroup);
  });

  // Update current schedule timezone if it wasn't already set or is still default
  if ((currentSchedule.timezone === 'America/Los_Angeles' || currentSchedule.timezone === 'UTC' || !currentSchedule.timezone) && userTimezone) {
    currentSchedule.timezone = userTimezone;
    updateScheduleDisplay();
  }
}

/**
 * Initialize current schedule with user's detected timezone
 */
function initializeUserTimezone() {
  const userTimezone = timezoneUtils.getUserTimezone();

  // Update current schedule if it's still using default timezone
  if (currentSchedule.timezone === 'UTC' || currentSchedule.timezone === 'America/Los_Angeles') {
    currentSchedule.timezone = userTimezone;
  }
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  console.log('Setting up navigation event listeners...');
  console.log('Nav tabs to process:', elements.navTabs ? elements.navTabs.length : 0);

  // Navigation - only if elements exist
  if (elements.navTabs && elements.navTabs.length > 0) {
    elements.navTabs.forEach((tab, index) => {
      console.log(`Adding click listener to tab ${index}: ${tab.dataset.tab}`);
      tab.addEventListener('click', (event) => {
        console.log('Tab clicked:', tab.dataset.tab, event);
        switchTab(tab.dataset.tab);
      });

      // Test if click events work
      tab.addEventListener('mousedown', () => {
        console.log('Mouse down on tab:', tab.dataset.tab);
      });
    });
  } else {
    console.warn('No navigation tabs found!');
  }

  // Dashboard - only if elements exist
  if (elements.runNowBtn) elements.runNowBtn.addEventListener('click', runScheduleNow);
  if (elements.previewNowBtn) elements.previewNowBtn.addEventListener('click', previewScheduleNow);
  if (elements.exportGithubBtn) elements.exportGithubBtn.addEventListener('click', () => exportSchedule('github'));
  if (elements.exportCloudflareBtn) elements.exportCloudflareBtn.addEventListener('click', () => exportSchedule('cloudflare'));

  // Schedule Editor - only if elements exist
  if (elements.loadScheduleBtn) elements.loadScheduleBtn.addEventListener('click', loadScheduleFile);
  if (elements.saveScheduleBtn) elements.saveScheduleBtn.addEventListener('click', saveScheduleFile);
  if (elements.validateScheduleBtn) elements.validateScheduleBtn.addEventListener('click', validateSchedule);
  if (elements.addRuleBtn) elements.addRuleBtn.addEventListener('click', () => openRuleModal());
  if (elements.scheduleTimezone) elements.scheduleTimezone.addEventListener('change', updateScheduleFromForm);
  if (elements.clearWhenNoMatch) elements.clearWhenNoMatch.addEventListener('change', updateScheduleFromForm);
  if (elements.scheduleJsonEditor) elements.scheduleJsonEditor.addEventListener('input', updateScheduleFromJson);

  // Preview - only if elements exist
  if (elements.previewBtn) elements.previewBtn.addEventListener('click', generatePreview);
  if (elements.upcomingPreviewBtn) elements.upcomingPreviewBtn.addEventListener('click', generateUpcomingPreview);

  // Settings - only if elements exist
  if (elements.toggleTokenVisibility) elements.toggleTokenVisibility.addEventListener('click', toggleTokenVisibility);
  if (elements.saveTokenBtn) elements.saveTokenBtn.addEventListener('click', saveToken);
  if (elements.testTokenBtn) elements.testTokenBtn.addEventListener('click', testToken);
  if (elements.clearTokenBtn) elements.clearTokenBtn.addEventListener('click', clearToken);
  if (elements.tokenHelpLink) {
    elements.tokenHelpLink.addEventListener('click', e => {
      e.preventDefault();
      openExternal('https://api.slack.com/authentication/token-types#user');
    });
  }
  if (elements.settingsExportGithubBtn) elements.settingsExportGithubBtn.addEventListener('click', () => exportSchedule('github'));
  if (elements.settingsExportCloudflareBtn) {
    elements.settingsExportCloudflareBtn.addEventListener('click', () =>
      exportSchedule('cloudflare')
    );
  }
  if (elements.documentationLink) {
    elements.documentationLink.addEventListener('click', e => {
      e.preventDefault();
      openExternal('https://github.com/thesammykins/slackstatus#readme');
    });
  }
  if (elements.githubLink) {
    elements.githubLink.addEventListener('click', e => {
      e.preventDefault();
      openExternal('https://github.com/thesammykins/slackstatus');
    });
  }
  if (elements.reportIssueLink) {
    elements.reportIssueLink.addEventListener('click', e => {
      e.preventDefault();
      openExternal('https://github.com/thesammykins/slackstatus/issues');
    });
  }

  // Logs - only if elements exist
  if (elements.clearLogsBtn) elements.clearLogsBtn.addEventListener('click', clearLogs);
  if (elements.exportLogsBtn) elements.exportLogsBtn.addEventListener('click', exportLogs);
  if (elements.refreshLogsBtn) elements.refreshLogsBtn.addEventListener('click', refreshLogs);
  if (elements.logsFilter) elements.logsFilter.addEventListener('change', filterLogs);

  // Rule modal - only if elements exist
  if (elements.ruleType) elements.ruleType.addEventListener('change', updateRuleFormVisibility);
  if (elements.ruleForm) elements.ruleForm.addEventListener('submit', saveRule);
  if (elements.ruleCancelBtn) elements.ruleCancelBtn.addEventListener('click', closeRuleModal);
  if (elements.modalClose) elements.modalClose.addEventListener('click', closeRuleModal);
  if (elements.ruleModal) {
    elements.ruleModal.addEventListener('click', e => {
      if (e.target === elements.ruleModal) {
        closeRuleModal();
      }
    });
  }

  // IPC listeners (only in Electron environment)
  if (ipcRenderer) {
    ipcRenderer.on('navigate-to', (event, tab) => {
      switchTab(tab);
    });
  }

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
  console.log('=== switchTab called ===');
  console.log('Target tab:', tabName);
  console.log('Available navTabs:', elements.navTabs ? elements.navTabs.length : 'undefined');
  console.log('Available tabContents:', elements.tabContents ? elements.tabContents.length : 'undefined');

  if (!elements.navTabs || !elements.tabContents) {
    console.error('Elements not initialized!');
    return;
  }

  // Update nav tabs
  console.log('Updating nav tab classes...');
  elements.navTabs.forEach(tab => {
    const shouldBeActive = tab.dataset.tab === tabName;
    console.log(`Tab "${tab.dataset.tab}": active=${shouldBeActive}`);
    tab.classList.toggle('active', shouldBeActive);
  });

  // Update tab content
  console.log('Updating tab content classes...');
  elements.tabContents.forEach(content => {
    const expectedId = `${tabName}-tab`;
    const shouldBeActive = content.id === expectedId;
    console.log(`Content "${content.id}": expected="${expectedId}", active=${shouldBeActive}`);
    content.classList.toggle('active', shouldBeActive);
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
  if (ipcRenderer) {
    await ipcRenderer.invoke('open-external', url);
  } else {
    window.open(url, '_blank');
  }
}

/**
 * Dashboard functions
 */
async function runScheduleNow() {
  if (isLoading) return;

  try {
    setLoading(true, 'Running schedule...');
    setStatus('Running schedule...');

    if (!ipcRenderer) {
      setStatus('Not available in browser mode', true);
      setLoading(false);
      return;
    }

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

    if (!ipcRenderer) {
      setStatus('Not available in browser mode', true);
      setLoading(false);
      return;
    }

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
  if (!elements.upcomingList) return;

  try {
    if (!ipcRenderer) {
      elements.upcomingList.innerHTML = '<div class="text-muted">Not available in browser mode</div>';
      return;
    }

    const result = await ipcRenderer.invoke('scheduler-upcoming', currentSchedule, 7);

    if (result && result.success) {
      displayUpcoming(result.upcoming);
    } else {
      const errorMsg = result ? result.error : 'Unknown error';
      elements.upcomingList.innerHTML = `<div class="text-muted">Error loading upcoming changes: ${errorMsg}</div>`;
      addLogEntry('warn', `Failed to load upcoming changes: ${errorMsg}`);
    }
  } catch (error) {
    console.error('Refresh upcoming failed:', error);
    elements.upcomingList.innerHTML = `<div class="text-muted">Error: ${error.message}</div>`;
    addLogEntry('error', `Failed to refresh upcoming: ${error.message}`);
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

    if (!ipcRenderer) {
      setStatus('Export not available in browser mode', true);
      setLoading(false);
      return;
    }

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
    if (!ipcRenderer) {
      setStatus('File operations not available in browser mode', true);
      return;
    }

    const result = await ipcRenderer.invoke('file-dialog-open');

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const fileResult = await ipcRenderer.invoke('file-read', filePath);

      if (fileResult.success) {
        try {
          currentSchedule = JSON.parse(fileResult.content);
          if (elements.scheduleTimezone && elements.clearWhenNoMatch) {
            updateScheduleDisplay();
          }
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
    if (!ipcRenderer) {
      setStatus('File operations not available in browser mode', true);
      return;
    }

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

/**
 * Auto-save the current schedule to a default location
 */
async function autoSaveSchedule() {
  try {
    if (!ipcRenderer) {
      console.warn('Auto-save not available in browser mode');
      return;
    }

    // Get app data directory and save schedule there
    const appDataPath = await ipcRenderer.invoke('get-app-data-path');
    const defaultPath = appDataPath + '/schedule.json';
    const content = JSON.stringify(currentSchedule, null, 2);
    const result = await ipcRenderer.invoke('file-write', defaultPath, content);

    if (result.success) {
      console.log('Schedule auto-saved successfully to:', defaultPath);
    } else {
      console.error('Failed to auto-save schedule:', result.error);
    }
  } catch (error) {
    console.error('Auto-save error:', error);
  }
}

/**
 * Load the default schedule on app startup
 */
async function loadDefaultSchedule() {
  try {
    if (!ipcRenderer) {
      console.warn('Auto-load not available in browser mode');
      return;
    }

    // Get app data directory and load schedule from there
    const appDataPath = await ipcRenderer.invoke('get-app-data-path');
    const defaultPath = appDataPath + '/schedule.json';
    const result = await ipcRenderer.invoke('file-read', defaultPath);

    if (result.success) {
      try {
        const loadedSchedule = JSON.parse(result.content);
        currentSchedule = loadedSchedule;
        updateScheduleDisplay();
        console.log('Default schedule loaded successfully from:', defaultPath);
      } catch (parseError) {
        console.error('Failed to parse auto-saved schedule:', parseError);
      }
    } else {
      console.log('No auto-saved schedule found, using defaults');
    }
  } catch (error) {
    console.error('Auto-load error:', error);
  }
}

async function validateSchedule() {
  try {
    if (!ipcRenderer) {
      setStatus('Validation not available in browser mode', true);
      return;
    }

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
  // Update form controls (with null checks)
  if (elements.scheduleTimezone) {
    elements.scheduleTimezone.value = currentSchedule.timezone || timezoneUtils.getUserTimezone();
  }
  if (elements.clearWhenNoMatch) {
    elements.clearWhenNoMatch.checked = currentSchedule.options?.clear_when_no_match || false;
  }

  // Update JSON editor
  if (elements.scheduleJsonEditor) {
    elements.scheduleJsonEditor.value = JSON.stringify(currentSchedule, null, 2);
  }

  // Update rules list
  displayRules();

  // Refresh upcoming changes
  refreshUpcoming();
}

function updateScheduleFromForm() {
  if (!elements.scheduleTimezone || !elements.clearWhenNoMatch || !elements.scheduleJsonEditor) {
    return;
  }

  currentSchedule.timezone = elements.scheduleTimezone.value;
  currentSchedule.options = {
    ...currentSchedule.options,
    clear_when_no_match: elements.clearWhenNoMatch.checked,
  };

  // Update JSON editor
  elements.scheduleJsonEditor.value = JSON.stringify(currentSchedule, null, 2);

  // Auto-save when form changes
  autoSaveSchedule();
}

function updateScheduleFromJson() {
  if (!elements.scheduleJsonEditor || !elements.scheduleTimezone || !elements.clearWhenNoMatch) {
    return;
  }

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
  if (!elements.rulesList) return;

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
  // Convert backend rule types to UI rule types for display
  let displayType = rule.type;
  if (rule.type === 'weekly' && rule.days && rule.days.length === 7) {
    // If it's weekly with all 7 days, show as daily
    const allDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    if (allDays.every(day => rule.days.includes(day))) {
      displayType = 'daily';
    }
  }

  elements.ruleId.value = rule.id || '';
  elements.ruleType.value = displayType;
  elements.ruleTime.value = rule.time || '';
  elements.ruleStatusText.value = rule.status?.text || '';
  elements.ruleStatusEmoji.value = rule.status?.emoji || '';
  elements.ruleExpireHour.value = rule.status?.expire_hour || '';
  elements.ruleEnabled.checked = rule.enabled !== false;

  // Populate type-specific fields
  if (rule.type === 'weekly' && rule.days && displayType !== 'daily') {
    const checkboxes = elements.ruleDaysGroup.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = rule.days.includes(cb.value);
    });
  }

  if (rule.type === 'every_n_days') {
    if (rule.start_date) {
      elements.ruleStartDate.value = rule.start_date;
    }
    if (rule.interval_days) {
      document.getElementById('rule-interval').value = rule.interval_days;
    }
  }

  if (rule.type === 'dates' && rule.dates) {
    document.getElementById('rule-dates').value = rule.dates.join(', ');
  }

  updateRuleFormVisibility();
}

function updateRuleFormVisibility() {
  const type = elements.ruleType.value;

  // Hide all optional groups
  elements.ruleDaysGroup.style.display = 'none';
  elements.ruleIntervalGroup.style.display = 'none';
  elements.ruleDatesGroup.style.display = 'none';

  // Show relevant groups
  switch (type) {
    case 'daily':
      // Daily doesn't need day selection - applies to all days
      break;
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
    case 'daily':
      // Convert daily to weekly with all days selected
      rule.type = 'weekly';
      rule.days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      break;
    case 'weekly':
      const checkedDays = Array.from(
        elements.ruleDaysGroup.querySelectorAll('input[type="checkbox"]:checked')
      ).map(cb => cb.value);
      rule.days = checkedDays;
      break;
    case 'every-n-days':
      rule.type = 'every_n_days';
      rule.start_date = elements.ruleStartDate.value || new Date().toISOString().split('T')[0];
      rule.interval_days = parseInt(document.getElementById('rule-interval').value);
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

  // Auto-save the schedule
  autoSaveSchedule();
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

    // Auto-save the schedule
    autoSaveSchedule();
  }
};

/**
 * Preview functions
 */
async function generatePreview() {
  if (isLoading) return;

  try {
    setLoading(true, 'Generating preview...');

    if (!ipcRenderer) {
      elements.previewOutput.textContent = 'Preview not available in browser mode';
      setLoading(false);
      return;
    }

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

    if (!ipcRenderer) {
      elements.upcomingPreviewOutput.textContent = 'Preview not available in browser mode';
      setLoading(false);
      return;
    }

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
    if (!ipcRenderer) {
      setConnectionStatus(false);
      addLogEntry('info', 'Token management not available in browser mode');
      return;
    }

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

    if (!ipcRenderer) {
      setStatus('Token saving not available in browser mode', true);
      setLoading(false);
      return;
    }

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

    if (!ipcRenderer) {
      setStatus('Token testing not available in browser mode', true);
      setLoading(false);
      return;
    }

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

    if (!ipcRenderer) {
      elements.slackToken.value = '';
      setStatus('Token cleared (browser mode)', false);
      setConnectionStatus(false);
      setLoading(false);
      return;
    }

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
    if (!ipcRenderer) {
      setStatus('Log export not available in browser mode', true);
      return;
    }

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
  if (!elements.logsOutput) return;

  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry ${level}`;
  entry.textContent = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

  elements.logsOutput.appendChild(entry);
  elements.logsOutput.scrollTop = elements.logsOutput.scrollHeight;
}

// Simple test function to verify JavaScript is working
function testTabSwitching() {
  console.log('Testing tab switching...');
  console.log('Nav tabs found:', document.querySelectorAll('.nav-tab').length);
  console.log('Tab contents found:', document.querySelectorAll('.tab-content').length);

  // Try to switch to schedule tab
  const scheduleTab = document.querySelector('[data-tab="schedule"]');
  if (scheduleTab) {
    console.log('Schedule tab found, simulating click...');
    scheduleTab.click();
  } else {
    console.log('Schedule tab not found!');
  }
}

// Make test function available globally for debugging
window.testTabSwitching = testTabSwitching;

// Initialize the app when DOM is loaded
console.log('Adding DOMContentLoaded listener...');
document.addEventListener('DOMContentLoaded', async function() {
  console.log('DOM Content Loaded - calling init()');
  await init();
});

// Export functions for debugging
/**
 * Load default schedule if current schedule is empty
 */
function loadDefaultScheduleIfEmpty() {
  if (!currentSchedule.rules || currentSchedule.rules.length === 0) {
    // Create a fresh default schedule with current timezone
    const userTz = timezoneUtils.getUserTimezone();
    currentSchedule = {
      ...defaultSchedule,
      timezone: userTz
    };
    setStatus('Loaded default schedule');
    addLogEntry('info', 'Loaded default schedule for first-time setup');
  }
}

// Minimal test to debug tab switching
window.debugTabSwitch = function() {
  console.log('=== Tab Switch Debug ===');
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  console.log('Found nav tabs:', navTabs.length);
  console.log('Found tab contents:', tabContents.length);

  navTabs.forEach((tab, i) => {
    console.log(`Tab ${i}:`, tab.dataset.tab, tab.classList.contains('active'));
  });

  tabContents.forEach((content, i) => {
    console.log(`Content ${i}:`, content.id, content.classList.contains('active'));
  });

  // Try manual switch to schedule
  console.log('Attempting manual switch to schedule...');
  navTabs.forEach(tab => tab.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));

  const scheduleTab = document.querySelector('[data-tab="schedule"]');
  const scheduleContent = document.querySelector('#schedule-tab');

  if (scheduleTab && scheduleContent) {
    scheduleTab.classList.add('active');
    scheduleContent.classList.add('active');
    console.log('Manual switch completed');
  } else {
    console.log('Elements not found:', !!scheduleTab, !!scheduleContent);
  }
};

if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
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
