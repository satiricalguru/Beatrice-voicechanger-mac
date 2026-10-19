'use strict';

const { app, BrowserWindow, nativeImage, ipcMain, globalShortcut, session, dialog, clipboard, shell } = require('electron');
const { spawn, execFileSync } = require('child_process');
const path                   = require('path');
const fs                     = require('fs');

const ICON_PATH = path.join(__dirname, 'icon.png');

let mainWindow    = null;
let pythonProcess = null;
let appQuitting   = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:    1160,
    height:   800,
    minWidth: 860,
    minHeight: 620,
    icon: ICON_PATH,
    title: 'Project Beatrice – AI Voice Changer',
    // macOS: hide the default titlebar, show traffic lights at correct coords
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 13 },
    backgroundColor: '#05050b',
    show: false,           // avoid white flash on load
    webPreferences: {
      nodeIntegration:  true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');

  // Uncomment to open DevTools for debugging:
  // mainWindow.webContents.openDevTools();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  // When packaged, __dirname points inside the .asar virtual filesystem which
  // Python cannot access. Use the unpacked path instead so the script exists
  // as a real file on disk.
  const appDir = app.isPackaged
    ? app.getAppPath().replace('app.asar', 'app.asar.unpacked')
    : __dirname;
  const scriptPath = path.join(appDir, 'beatrice_audio.py');
  console.log('[Beatrice] Spawning Python audio backend:', scriptPath);

  // Writable user data folder setup
  const userDataPath = app.getPath('userData');
  const customModelsPath = path.join(userDataPath, 'custom_models');
  if (!fs.existsSync(customModelsPath)) {
    try {
      fs.mkdirSync(customModelsPath, { recursive: true });
    } catch (e) {
      console.error('[Beatrice] Failed to create custom_models directory:', e);
    }
  }

  // Migrate legacy custom models from project root to userData during development/startup
  const legacyCustomModelsPath = path.join(__dirname, 'custom_models');
  if (fs.existsSync(legacyCustomModelsPath) && legacyCustomModelsPath !== customModelsPath) {
    try {
      const folders = fs.readdirSync(legacyCustomModelsPath);
      for (const folder of folders) {
        const srcFolder = path.join(legacyCustomModelsPath, folder);
        const destFolder = path.join(customModelsPath, folder);
        if (fs.statSync(srcFolder).isDirectory()) {
          if (!fs.existsSync(destFolder)) {
            console.log(`[Beatrice] Migrating custom model: ${folder}`);
            fs.cpSync(srcFolder, destFolder, { recursive: true });
          }
        }
      }
    } catch (err) {
      console.error('[Beatrice] Migration of legacy custom models failed:', err);
    }
  }

  // Pass writable custom models base path to Python backend. The bundled
  // runtime must not pick up packages or settings from a Python the user
  // installed themselves.
  const env = Object.assign({}, process.env, {
    BEATRICE_CUSTOM_MODELS_DIR: customModelsPath,
    PYTHONNOUSERSITE: '1',
    PYTHONDONTWRITEBYTECODE: '1',
  });
  delete env.PYTHONHOME;
  delete env.PYTHONPATH;

  const { cmd: spawnCmd, args: pythonArgs } = resolvePython();
  const spawnArgs = [...pythonArgs, '-u', scriptPath];
  console.log('[Beatrice] Using Python:', spawnCmd, pythonArgs.join(' '));

  pythonProcess = spawn(spawnCmd, spawnArgs, {
    cwd: appDir,
    env: env
  });

  // Keep the tail of the backend's error output so a crash can be shown to
  // the user instead of the UI sitting on "Connecting…" forever.
  let stderrTail = '';

  pythonProcess.stdout.on('data', data =>
    console.log('[Python]', data.toString().trimEnd()));

  pythonProcess.stderr.on('data', data => {
    const text = data.toString();
    stderrTail = (stderrTail + text).slice(-4000);
    console.error('[Python ERR]', text.trimEnd());
  });

  pythonProcess.on('error', err => {
    console.error('[Beatrice] Failed to start Python backend:', err.message);
    stderrTail += `\n${err.message}`;
  });

  pythonProcess.on('close', code => {
    console.log('[Beatrice] Python backend exited with code', code);
    pythonProcess = null;
    if (!appQuitting && code !== 0) showBackendError(stderrTail);
  });
}

function resolvePython() {
  // Packaged builds ship their own Python runtime with the audio packages
  // preinstalled (see scripts/bundle-python.sh), so users need nothing else.
  const bundled = path.join(process.resourcesPath, 'python', 'bin', 'python3');
  if (app.isPackaged && fs.existsSync(bundled)) {
    clearQuarantine(path.join(process.resourcesPath, 'python'));
    clearQuarantine(path.join(process.resourcesPath, 'app.asar.unpacked'));
    return { cmd: bundled, args: [] };
  }

  // Development (`npm run dev`): use a system Python. Apps launched from
  // Finder get a minimal PATH, so add the usual install locations too.
  const extraPaths = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/Library/Frameworks/Python.framework/Versions/Current/bin',
  ];
  process.env.PATH = [...extraPaths, process.env.PATH || '/usr/bin:/bin'].join(':');
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    return { cmd: 'arch', args: ['-arm64', 'python3'] };
  }
  return { cmd: 'python3', args: [] };
}

function clearQuarantine(dir) {
  // Files copied from a downloaded DMG carry the quarantine flag, which can
  // stop the bundled Python and the voice engine from loading. The app owns
  // these files, so clear it before starting the backend; failures are
  // harmless (for example when running straight from the DMG).
  if (process.platform !== 'darwin') return;
  try {
    execFileSync('/usr/bin/xattr', ['-dr', 'com.apple.quarantine', dir], { stdio: 'ignore', timeout: 10000 });
  } catch (err) {
    console.log('[Beatrice] Could not clear quarantine on', dir, '-', err.message);
  }
}

function showBackendError(details) {
  const message = 'The voice engine stopped unexpectedly.';
  const detail = 'Please quit Beatrice (⌘Q) and open it again. If this keeps happening, '
    + 'copy the details and open an issue on GitHub.\n\n'
    + (details.trim().split('\n').slice(-8).join('\n') || 'No error output.');
  dialog.showMessageBox(mainWindow || undefined, {
    type: 'error',
    message,
    detail,
    buttons: ['Copy Details', 'Report on GitHub', 'OK'],
    defaultId: 2,
    cancelId: 2,
  }).then(({ response }) => {
    if (response === 0) clipboard.writeText(`${message}\n\n${details}`);
    if (response === 1) shell.openExternal('https://github.com/satiricalguru/Beatrice-voicechanger-mac/issues/new');
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    const icon = nativeImage.createFromPath(ICON_PATH);
    app.dock.setIcon(icon);
  }
  
  // Strip Referer and Origin headers for MyInstants requests to bypass CORS/access restrictions
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://*.myinstants.com/*'] },
    (details, callback) => {
      delete details.requestHeaders['Referer'];
      delete details.requestHeaders['Origin'];
      details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  startBackend();
  createWindow();

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // On macOS it is conventional to keep the process running
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  appQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (pythonProcess) {
    console.log('[Beatrice] Terminating Python backend…');
    pythonProcess.kill('SIGTERM');
    pythonProcess = null;
  }
});

// IPC Handler for soundboard global keybinds
ipcMain.on('register-sound-shortcuts', (event, shortcuts) => {
  globalShortcut.unregisterAll();

  shortcuts.forEach(s => {
    try {
      const ok = globalShortcut.register(s.keybind, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('play-sound-slot', s.index);
        }
      });
      if (!ok) {
        console.warn(`[Keybind] Failed to register global shortcut: ${s.keybind}`);
      }
    } catch (err) {
      console.error(`[Keybind] Error registering shortcut ${s.keybind}:`, err);
    }
  });
});

// IPC Handler to get the app userData path synchronously
ipcMain.on('get-user-data-path', (event) => {
  event.returnValue = app.getPath('userData');
});

