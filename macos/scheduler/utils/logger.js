/**
 * Logger utility for structured logging
 * Provides consistent logging across the application
 */

/**
 * Log levels in order of severity
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Create a logger instance
 * @param {string} level - Minimum log level to output
 * @param {Object} options - Logger configuration options
 * @returns {Object} Logger instance
 */
export function createLogger(level = 'info', options = {}) {
  const minLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;
  const includeTimestamp = options.includeTimestamp !== false;
  const includeLevel = options.includeLevel !== false;
  const component = options.component || 'scheduler';

  /**
   * Format log message with metadata
   * @param {string} logLevel - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @returns {string} Formatted log message
   */
  function formatMessage(logLevel, message, meta = {}) {
    const parts = [];

    if (includeTimestamp) {
      parts.push(new Date().toISOString());
    }

    if (includeLevel) {
      parts.push(`[${logLevel.toUpperCase()}]`);
    }

    parts.push(`[${component}]`);
    parts.push(message);

    let formatted = parts.join(' ');

    // Add metadata if provided
    if (meta && Object.keys(meta).length > 0) {
      // Sanitize sensitive data
      const sanitized = sanitizeMetadata(meta);
      formatted += ` ${JSON.stringify(sanitized)}`;
    }

    return formatted;
  }

  /**
   * Remove sensitive information from metadata
   * @param {Object} meta - Metadata object
   * @returns {Object} Sanitized metadata
   */
  function sanitizeMetadata(meta) {
    const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth'];
    const sanitized = { ...meta };

    for (const [key, value] of Object.entries(sanitized)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        if (typeof value === 'string' && value.length > 10) {
          sanitized[key] = `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
        } else {
          sanitized[key] = '[REDACTED]';
        }
      }
    }

    return sanitized;
  }

  /**
   * Log a message at a specific level
   * @param {string} logLevel - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  function log(logLevel, message, meta = {}) {
    if (LOG_LEVELS[logLevel] <= minLevel) {
      const formatted = formatMessage(logLevel, message, meta);

      switch (logLevel) {
        case 'error':
          console.error(formatted);
          break;
        case 'warn':
          console.warn(formatted);
          break;
        case 'info':
          console.info(formatted);
          break;
        case 'debug':
          console.log(formatted);
          break;
        default:
          console.log(formatted);
      }
    }
  }

  return {
    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Object} meta - Additional metadata
     */
    error(message, meta) {
      log('error', message, meta);
    },

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {Object} meta - Additional metadata
     */
    warn(message, meta) {
      log('warn', message, meta);
    },

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {Object} meta - Additional metadata
     */
    info(message, meta) {
      log('info', message, meta);
    },

    /**
     * Log debug message
     * @param {string} message - Debug message
     * @param {Object} meta - Additional metadata
     */
    debug(message, meta) {
      log('debug', message, meta);
    },

    /**
     * Create a child logger with additional context
     * @param {string} childComponent - Child component name
     * @param {Object} contextMeta - Context metadata to include in all logs
     * @returns {Object} Child logger
     */
    child(childComponent, contextMeta = {}) {
      return createLogger(level, {
        ...options,
        component: `${component}:${childComponent}`,
        contextMeta,
      });
    },

    /**
     * Get current log level
     * @returns {string} Current log level
     */
    getLevel() {
      return level;
    },

    /**
     * Set log level
     * @param {string} newLevel - New log level
     */
    setLevel(newLevel) {
      if (LOG_LEVELS[newLevel] !== undefined) {
        // Update function closure variables
        level = newLevel;
        Object.assign(this, createLogger(newLevel, options));
      }
    },

    /**
     * Check if a log level is enabled
     * @param {string} checkLevel - Level to check
     * @returns {boolean} True if level is enabled
     */
    isLevelEnabled(checkLevel) {
      return LOG_LEVELS[checkLevel] <= minLevel;
    },
  };
}

/**
 * Create a logger that outputs to a custom function
 * @param {Function} outputFn - Function to handle log output
 * @param {string} level - Log level
 * @returns {Object} Logger instance
 */
export function createCustomLogger(outputFn, level = 'info') {
  const baseLogger = createLogger(level, { includeTimestamp: false });

  // Override the console methods to use custom output
  const originalConsole = { ...console };

  const logWrapper = message => {
    outputFn(message);
  };

  console.error = logWrapper;
  console.warn = logWrapper;
  console.info = logWrapper;
  console.log = logWrapper;

  return {
    ...baseLogger,
    restore() {
      Object.assign(console, originalConsole);
    },
  };
}

/**
 * Default logger instance
 */
export const logger = createLogger('info');

/**
 * Create a silent logger for testing
 * @returns {Object} Silent logger
 */
export function createSilentLogger() {
  return {
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
    child: () => createSilentLogger(),
    getLevel: () => 'error',
    setLevel: () => {},
    isLevelEnabled: () => false,
  };
}
