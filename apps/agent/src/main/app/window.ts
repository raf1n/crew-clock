import { join } from 'node:path';

import { BrowserWindow } from 'electron';

import { log } from '../lib/logger';

let mainWindow: BrowserWindow | null = null;
let quitting = false;
let hideOnClose = true;

export function setQuitting(value: boolean): void {
  quitting = value;
}

export function setHideOnClose(value: boolean): void {
  hideOnClose = value;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

export function createWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 440,
    height: 720,
    minWidth: 380,
    minHeight: 580,
    title: 'Crewclock',
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());
  mainWindow.on('close', (event) => {
    if (hideOnClose && !quitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    log.error('Renderer process gone', details.reason, details.exitCode);
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

export function showWindow(): void {
  const window = getMainWindow() ?? createWindow();
  window.show();
  window.focus();
}

export function setTrackingTitle(projectName: string | null, paused = false): void {
  getMainWindow()?.setTitle(
    !projectName
      ? 'Crewclock'
      : paused
        ? `Ⅱ Paused — ${projectName} — Crewclock`
        : `● Tracking — ${projectName} — Crewclock`,
  );
}

export function broadcast(channel: string, payload: unknown): void {
  const window = getMainWindow();
  if (window) {
    window.webContents.send(channel, payload);
  }
}
