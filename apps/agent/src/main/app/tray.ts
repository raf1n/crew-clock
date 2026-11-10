import { Menu, nativeImage, Tray } from 'electron';

import type { PausedTimer, TimerState } from '../../shared/types';
import { TRAY_ICON_DATA_URL } from '../lib/constants';
import { log } from '../lib/logger';

interface TrayHandlers {
  getTimer: () => TimerState | null;
  getPausedTimer: () => PausedTimer | null;
  onShow: () => void;
  onStop: () => void;
  onResume: () => void;
  onQuit: () => void;
}

let tray: Tray | null = null;
let handlers: TrayHandlers | null = null;

export function createTray(nextHandlers: TrayHandlers): boolean {
  handlers = nextHandlers;
  try {
    tray = new Tray(nativeImage.createFromDataURL(TRAY_ICON_DATA_URL));
    tray.on('click', () => handlers?.onShow());
    updateTray();
    return true;
  } catch (error) {
    log.error('Failed to create tray icon', error);
    tray = null;
    return false;
  }
}

export function updateTray(): void {
  if (!tray || !handlers) {
    return;
  }

  const timer = handlers.getTimer();
  const paused = timer ? null : handlers.getPausedTimer();
  const label = timer
    ? `Tracking ${timer.projectName}`
    : paused
      ? `Paused ${paused.projectName}`
      : 'Idle';
  tray.setToolTip(`Crewclock — ${label}`);
  if (process.platform === 'darwin') {
    tray.setTitle(timer ? '●' : paused ? 'Ⅱ' : '');
  }

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Crewclock', click: () => handlers?.onShow() },
      ...(timer ? [{ label: 'Stop timer', click: () => handlers?.onStop() }] : []),
      ...(paused ? [{ label: 'Resume timer', click: () => handlers?.onResume() }] : []),
      { type: 'separator' },
      { label: 'Quit', click: () => handlers?.onQuit() },
    ]),
  );
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
