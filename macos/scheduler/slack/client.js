/**
 * Slack API client for updating user status
 * Handles authentication, API calls, and error handling
 */

import { WebClient } from '@slack/web-api';

/**
 * Create a Slack client for status updates
 * @param {string} token - Slack user token (xoxp-)
 * @param {Object} options - Configuration options
 * @returns {Object} Slack client with status methods
 */
export function createSlackClient(token, options = {}) {
  if (!token) {
    throw new Error('Slack token is required');
  }

  if (!token.startsWith('xoxp-')) {
    throw new Error(
      'Token must be a user token (xoxp-). Bot tokens are not supported for profile updates.',
    );
  }

  const client = new WebClient(token, {
    logLevel: options.logLevel || 'info',
    retryConfig: {
      retries: options.retryAttempts || 3,
    },
  });

  const logger = options.logger || console;

  return {
    /**
     * Update user's Slack status
     * @param {string} text - Status text
     * @param {string} emoji - Status emoji (e.g., ':coffee:')
     * @param {DateTime|null} expiration - When to clear the status
     */
    async updateStatus(text, emoji, expiration = null) {
      if (!text || !emoji) {
        throw new Error('Both text and emoji are required for status update');
      }

      const profile = {
        status_text: text,
        status_emoji: emoji,
        status_expiration: expiration ? Math.floor(expiration.toSeconds()) : 0,
      };

      try {
        logger.debug('Updating Slack status', { text, emoji, expiration: expiration?.toISO() });

        const response = await client.users.profile.set({
          profile: JSON.stringify(profile),
        });

        if (!response.ok) {
          throw new Error(`Slack API error: ${response.error}`);
        }

        logger.info('Status updated successfully', { text, emoji });
        return response;
      } catch (error) {
        logger.error('Failed to update status', {
          error: error.message,
          text: text.substring(0, 50), // Log truncated text for debugging
          emoji,
        });
        throw new SlackAPIError('Failed to update status', error);
      }
    },

    /**
     * Clear user's Slack status
     */
    async clearStatus() {
      const profile = {
        status_text: '',
        status_emoji: '',
        status_expiration: 0,
      };

      try {
        logger.debug('Clearing Slack status');

        const response = await client.users.profile.set({
          profile: JSON.stringify(profile),
        });

        if (!response.ok) {
          throw new Error(`Slack API error: ${response.error}`);
        }

        logger.info('Status cleared successfully');
        return response;
      } catch (error) {
        logger.error('Failed to clear status', { error: error.message });
        throw new SlackAPIError('Failed to clear status', error);
      }
    },

    /**
     * Get current user's profile information
     */
    async getCurrentUser() {
      try {
        const response = await client.users.profile.get();

        if (!response.ok) {
          throw new Error(`Slack API error: ${response.error}`);
        }

        return response.profile;
      } catch (error) {
        logger.error('Failed to get user profile', { error: error.message });
        throw new SlackAPIError('Failed to get user profile', error);
      }
    },

    /**
     * Test the connection and token validity
     */
    async testConnection() {
      try {
        logger.debug('Testing Slack connection');

        const response = await client.auth.test();

        if (!response.ok) {
          throw new Error(`Slack API error: ${response.error}`);
        }

        logger.info('Slack connection test successful', {
          user: response.user,
          team: response.team,
        });

        return {
          valid: true,
          user: response.user,
          team: response.team,
          userId: response.user_id,
          teamId: response.team_id,
        };
      } catch (error) {
        logger.error('Slack connection test failed', { error: error.message });
        throw new SlackAPIError('Connection test failed', error);
      }
    },

    /**
     * Check if the token has required permissions
     */
    async checkPermissions() {
      try {
        // Try to get the current profile to test permissions
        await this.getCurrentUser();

        return {
          valid: true,
          hasProfileWrite: true,
        };
      } catch (error) {
        if (error.message.includes('missing_scope')) {
          return {
            valid: false,
            hasProfileWrite: false,
            error: 'Token missing users.profile:write scope',
          };
        }

        throw error;
      }
    },

    /**
     * Get the underlying WebClient for advanced usage
     */
    getWebClient() {
      return client;
    },
  };
}

/**
 * Custom error class for Slack API errors
 */
export class SlackAPIError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'SlackAPIError';
    this.originalError = originalError;

    if (originalError) {
      this.code = originalError.code;
      this.data = originalError.data;
    }
  }
}

/**
 * Validate Slack token format
 * @param {string} token - Token to validate
 * @returns {Object} Validation result
 */
export function validateToken(token) {
  if (!token || typeof token !== 'string') {
    return {
      valid: false,
      error: 'Token must be a non-empty string',
    };
  }

  if (!token.startsWith('xoxp-')) {
    return {
      valid: false,
      error: 'Token must be a user token starting with xoxp-',
    };
  }

  if (token.length < 50) {
    return {
      valid: false,
      error: 'Token appears to be too short',
    };
  }

  return { valid: true };
}

/**
 * Helper to safely test a token without exposing it in logs
 * @param {string} token - Token to test
 * @param {Object} options - Test options
 * @returns {Object} Test result
 */
export async function safeTestToken(token, options = {}) {
  const validation = validateToken(token);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  try {
    const client = createSlackClient(token, {
      ...options,
      logger: {
        debug: () => {}, // Disable debug logs for token testing
        info: () => {},
        error: options.logger?.error || console.error,
      },
    });

    const result = await client.testConnection();
    const permissions = await client.checkPermissions();

    return {
      success: true,
      user: result.user,
      team: result.team,
      hasRequiredPermissions: permissions.valid,
      permissionError: permissions.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create a mock Slack client for testing
 * @param {Object} options - Mock behavior options
 * @returns {Object} Mock client
 */
export function createMockSlackClient(options = {}) {
  const responses = options.responses || {};
  const shouldFail = options.shouldFail || {};

  return {
    async updateStatus(_text, _emoji, _expiration) {
      if (shouldFail.updateStatus) {
        throw new SlackAPIError('Mock update status failure');
      }

      return responses.updateStatus || { ok: true };
    },

    async clearStatus() {
      if (shouldFail.clearStatus) {
        throw new SlackAPIError('Mock clear status failure');
      }

      return responses.clearStatus || { ok: true };
    },

    async getCurrentUser() {
      if (shouldFail.getCurrentUser) {
        throw new SlackAPIError('Mock get user failure');
      }

      return (
        responses.getCurrentUser || {
          status_text: '',
          status_emoji: '',
          real_name: 'Test User',
        }
      );
    },

    async testConnection() {
      if (shouldFail.testConnection) {
        throw new SlackAPIError('Mock connection test failure');
      }

      return (
        responses.testConnection || {
          valid: true,
          user: 'testuser',
          team: 'testteam',
          userId: 'U123456',
          teamId: 'T123456',
        }
      );
    },

    async checkPermissions() {
      if (shouldFail.checkPermissions) {
        return {
          valid: false,
          hasProfileWrite: false,
          error: 'Mock permission error',
        };
      }

      return (
        responses.checkPermissions || {
          valid: true,
          hasProfileWrite: true,
        }
      );
    },

    getWebClient() {
      return null; // Mock doesn't provide real WebClient
    },
  };
}
