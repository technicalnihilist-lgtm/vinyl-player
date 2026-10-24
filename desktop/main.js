const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

const START = path.join(__dirname, 'app', 'index.html');
const REPO = 'https://github.com/technicalnihilist-lgtm/vinyl-player';

let win = null;

function openExternal(url) {
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 360,
    minHeight: 520,
    backgroundColor: '#05060c',
    show: false,
    title: 'Vinyl Player',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: process.platform !== 'darwin',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile(START);

  // Links leave the app and open in the real browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });

  // The window can never navigate away from its own bundled files.
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      openExternal(url);
    }
  });

  win.on('closed', () => {
    win = null;
  });
}

/** Click the app's own (already tested) file inputs from a menu item. */
function clickInput(selector) {
  if (!win) return;
  win.webContents.executeJavaScript(
    `document.querySelector(${JSON.stringify(selector)})?.click();`,
    true,
  ).catch(() => undefined);
}

function buildMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Add music files…', accelerator: 'CmdOrCtrl+O', click: () => clickInput('input[type=file]:not([webkitdirectory])') },
        { label: 'Add a music folder…', accelerator: 'CmdOrCtrl+Shift+O', click: () => clickInput('input[webkitdirectory]') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { type: 'separator' },
        { label: 'Full screen', role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [{ label: 'Project on GitHub', click: () => openExternal(REPO) }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// A second launch should focus the window we already have.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(() => {
    buildMenu();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
