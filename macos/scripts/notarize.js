/**
 * Notarization script for macOS app distribution
 * This script handles the notarization process for the Slack Status Scheduler app
 */

const { notarize } = require('@electron/notarize');
const path = require('path');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize on macOS
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // Check for required environment variables
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_ID_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.warn('Skipping notarization: APPLE_ID, APPLE_ID_PASSWORD, and APPLE_TEAM_ID environment variables are required');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`Notarizing ${appPath}...`);

  try {
    await notarize({
      appBundleId: 'com.slackstatus.scheduler',
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPassword,
      teamId: teamId,
    });

    console.log('Notarization completed successfully');
  } catch (error) {
    console.error('Notarization failed:', error);
    throw error;
  }
};
