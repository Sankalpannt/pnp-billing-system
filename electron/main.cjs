const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Ensure client database and storage resides in %APPDATA%\PNP Tech Traders Billing instead of installation folder
app.name = 'PNP Tech Traders Billing Software';
try {
  const appDataDir = app.getPath('appData');
  const customUserData = path.join(appDataDir, 'PNP Tech Traders Billing');
  app.setPath('userData', customUserData);
} catch (e) {
  console.warn('Could not customize userData path:', e);
}

let mainWindow;

// Determine default Google Drive sync folder or documents folder
function getDefaultBackupFolder() {
  // 1. Primary priority: User's Google Drive for Desktop virtual drive
  const primaryGDrive = 'G:\\My Drive\\PNP Tech Traders Backups';
  try {
    if (fs.existsSync('G:\\My Drive')) {
      if (!fs.existsSync(primaryGDrive)) {
        fs.mkdirSync(primaryGDrive, { recursive: true });
      }
      return primaryGDrive;
    }
    if (fs.existsSync('G:\\')) {
      if (!fs.existsSync(primaryGDrive)) {
        fs.mkdirSync(primaryGDrive, { recursive: true });
      }
      return primaryGDrive;
    }
  } catch (e) {}

  const userHome = app.getPath('home');
  const possiblePaths = [
    primaryGDrive,
    'G:\\PNP Tech Traders Backups',
    'H:\\My Drive\\PNP Tech Traders Backups',
    'D:\\My Drive\\PNP Tech Traders Backups',
    path.join(userHome, 'Google Drive', 'PNP Tech Traders Backups'),
    path.join(userHome, 'My Drive', 'PNP Tech Traders Backups'),
    path.join(userHome, 'Documents', 'Google Drive', 'PNP Tech Traders Backups'),
    path.join(userHome, 'Documents', 'PNP Tech Traders Backups')
  ];

  for (const p of possiblePaths) {
    try {
      const parent = path.dirname(p);
      if (fs.existsSync(parent)) {
        if (!fs.existsSync(p)) {
          fs.mkdirSync(p, { recursive: true });
        }
        return p;
      }
    } catch (e) {}
  }

  const fallback = path.join(app.getPath('userData'), 'Backups');
  try {
    if (!fs.existsSync(fallback)) {
      fs.mkdirSync(fallback, { recursive: true });
    }
  } catch (e) {}
  return fallback;
}

// Check if a path is located inside Google Drive
function isGoogleDrivePath(folderPath) {
  if (!folderPath) return false;
  const lower = folderPath.toLowerCase();
  return lower.includes('google drive') || lower.includes('my drive') || lower.startsWith('g:\\') || lower.startsWith('h:\\') || lower.startsWith('i:\\');
}

// Configure silent background updates from GitHub Releases
function setupAutoUpdater() {
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('check-app-update', async () => {
    if (!app.isPackaged) {
      return { 
        status: 'dev-mode', 
        version: app.getVersion(), 
        message: `Running in development mode (v${app.getVersion()}). Auto-updater is active in packaged installer builds.` 
      };
    }
    try {
      const result = await autoUpdater.checkForUpdates();
      return { 
        success: true, 
        version: app.getVersion(), 
        updateInfo: result?.updateInfo 
      };
    } catch (err) {
      return { 
        success: false, 
        version: app.getVersion(), 
        error: err.message 
      };
    }
  });

  ipcMain.handle('install-app-update', () => {
    if (app.isPackaged) {
      autoUpdater.quitAndInstall(false, true);
    }
  });

  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-event', { status: 'checking', message: 'Checking for updates...' });
    }
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-event', {
        status: 'available',
        version: info.version,
        message: `New version v${info.version} is downloading silently in background...`
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-event', {
        status: 'latest',
        version: app.getVersion(),
        message: `Your software is completely up to date (v${app.getVersion()}).`
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-event', {
        status: 'downloading',
        percent: Math.round(progressObj.percent)
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded; will install on quit');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-event', {
        status: 'downloaded',
        version: info.version,
        message: `Update v${info.version} is downloaded! It will install automatically when you close the app.`
      });
    }
  });

  autoUpdater.on('error', (err) => {
    console.warn('[AutoUpdater] Error checking for updates:', err?.message || err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-event', {
        status: 'error',
        message: err?.message || 'Update check failed.'
      });
    }
  });

  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.warn('[AutoUpdater] Check failed:', err?.message || err);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'PNP TECH TRADERS - Billing & Invoice Management Software',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  // Remove default menu bar for clean software look
  Menu.setApplicationMenu(null);

  // In production load built dist/index.html, in dev load localhost:3000
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000/').catch(() => {
      mainWindow.loadURL('http://localhost:3001/');
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle direct printing request from web page
  ipcMain.on('trigger-native-print', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.print({
        silent: false,
        printBackground: true
      }, (success, failureReason) => {
        if (!success && failureReason !== 'cancelled') {
          console.warn('Native print dialog result:', failureReason);
        }
      });
    }
  });

  // IPC: Save local backup file (to Google Drive synced folder or custom directory)
  ipcMain.handle('backup-save-local', async (event, { fileName, content, customFolder }) => {
    try {
      const folder = customFolder && fs.existsSync(customFolder) ? customFolder : getDefaultBackupFolder();
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
      const filePath = path.join(folder, fileName);
      fs.writeFileSync(filePath, content, 'utf-8');
      return { 
        success: true, 
        filePath,
        folder,
        isGoogleDrive: isGoogleDrivePath(folder)
      };
    } catch (err) {
      console.error('Error saving local backup:', err);
      return { success: false, error: err.message };
    }
  });

  // IPC: Folder selector dialog for Google Drive directory
  ipcMain.handle('backup-select-folder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Google Drive for Desktop Backup Folder',
      properties: ['openDirectory', 'createDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const selected = result.filePaths[0];
      return {
        path: selected,
        isGoogleDrive: isGoogleDrivePath(selected)
      };
    }
    return null;
  });

  // IPC: Detect default Google Drive path
  ipcMain.handle('backup-detect-gdrive', async () => {
    const folder = getDefaultBackupFolder();
    return {
      path: folder,
      isGoogleDrive: isGoogleDrivePath(folder)
    };
  });

  // IPC: Open backup folder in Windows File Explorer
  ipcMain.handle('backup-open-folder', async (event, customFolder) => {
    try {
      const folder = customFolder && fs.existsSync(customFolder) ? customFolder : getDefaultBackupFolder();
      if (fs.existsSync(folder)) {
        await shell.openPath(folder);
        return { success: true, folder };
      }
      return { success: false, error: 'Directory does not exist yet.' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // IPC: List local backup files
  ipcMain.handle('backup-list-local', async (event, customFolder) => {
    try {
      const folder = customFolder && fs.existsSync(customFolder) ? customFolder : getDefaultBackupFolder();
      if (!fs.existsSync(folder)) return [];
      const files = fs.readdirSync(folder)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const fullPath = path.join(folder, f);
          const stat = fs.statSync(fullPath);
          return {
            name: f,
            path: fullPath,
            size: stat.size,
            mtime: stat.mtime
          };
        })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      return files;
    } catch (err) {
      return [];
    }
  });

  // IPC: Read Payment QR image file from "payment qr" folder
  ipcMain.handle('get-payment-qr-file', async () => {
    try {
      const qrDirCandidates = [
        'E:\\parichiya system\\payment qr',
        path.join(process.cwd(), 'payment qr'),
        path.join(__dirname, '../payment qr'),
        path.join(app.getAppPath(), 'payment qr'),
        path.join(process.resourcesPath, 'payment qr'),
        path.join(app.getPath('userData'), 'Payment QR'),
        path.join(app.getPath('userData'), 'payment qr')
      ];
      for (const dir of qrDirCandidates) {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          const imageFile = files.find(f => /\.(png|jpe?g|webp|svg)$/i.test(f));
          if (imageFile) {
            const filePath = path.join(dir, imageFile);
            const ext = path.extname(imageFile).slice(1).toLowerCase();
            const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`);
            const buf = fs.readFileSync(filePath);
            return {
              success: true,
              dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
              fileName: imageFile,
              folder: dir
            };
          }
        }
      }
      return { success: false, error: 'No QR image found in payment qr directory' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // IPC: Open "payment qr" folder in Windows File Explorer
  ipcMain.handle('open-payment-qr-folder', async () => {
    try {
      const qrDirCandidates = [
        'E:\\parichiya system\\payment qr',
        path.join(process.cwd(), 'payment qr'),
        path.join(__dirname, '../payment qr'),
        path.join(app.getPath('userData'), 'Payment QR')
      ];
      let targetDir = null;
      for (const dir of qrDirCandidates) {
        if (fs.existsSync(dir)) {
          targetDir = dir;
          break;
        }
      }
      if (!targetDir) {
        targetDir = fs.existsSync('E:\\') ? 'E:\\parichiya system\\payment qr' : path.join(app.getPath('userData'), 'Payment QR');
        fs.mkdirSync(targetDir, { recursive: true });
      }
      await shell.openPath(targetDir);
      return { success: true, folder: targetDir };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Start Wireless Scanner Relay Server on port 8090
  try {
    const { startScannerServer } = require('../server/scannerServer.cjs');
    startScannerServer(8090);
  } catch (e) {
    console.error('Failed to start scanner relay in electron main:', e);
  }

  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
