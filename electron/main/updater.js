const { app, ipcMain, BrowserWindow } = require('electron');

/**
 * Built-in updates for the Windows app: checks GitHub releases on start and
 * every few hours, downloads a newer version in the background, and installs
 * it on "Restart to update" (or the next time the app quits).
 */

const CHECK_EVERY_MS = 4 * 60 * 60 * 1000;
// Only the Windows installer publishes update metadata (latest.yml)
const supported = app.isPackaged && process.platform === 'win32';

let state = { status: supported ? 'idle' : 'unsupported' };

function publish(next) {
  state = next;
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send('update:state', state);
}

function setupUpdater() {
  ipcMain.handle('update:state', () => state);

  if (!supported) {
    ipcMain.handle('update:check', () => state);
    ipcMain.handle('update:install', () => undefined);
    return;
  }

  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = null;

  autoUpdater.on('checking-for-update', () => {
    if (state.status !== 'downloading' && state.status !== 'ready') publish({ status: 'checking' });
  });
  autoUpdater.on('update-not-available', () => publish({ status: 'latest' }));
  autoUpdater.on('update-available', (info) => publish({ status: 'downloading', version: info.version, percent: 0 }));
  autoUpdater.on('download-progress', (p) =>
    publish({ status: 'downloading', version: state.version, percent: Math.round(p.percent || 0) })
  );
  autoUpdater.on('update-downloaded', (info) => publish({ status: 'ready', version: info.version }));
  autoUpdater.on('error', (err) => {
    // Keep a finished download installable even if a later check fails
    if (state.status !== 'ready') publish({ status: 'error', message: String((err && err.message) || err).slice(0, 200) });
  });

  const check = () => autoUpdater.checkForUpdates().catch(() => undefined);

  ipcMain.handle('update:check', async () => {
    if (state.status !== 'downloading' && state.status !== 'ready') await check();
    return state;
  });
  // Silent install, then start the new version
  ipcMain.handle('update:install', () => {
    if (state.status === 'ready') setImmediate(() => autoUpdater.quitAndInstall(true, true));
  });

  setTimeout(check, 10_000);
  setInterval(check, CHECK_EVERY_MS);
}

module.exports = { setupUpdater };
