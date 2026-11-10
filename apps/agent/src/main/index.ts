import { join } from 'node:path';

import { app, powerMonitor, session } from 'electron';

import type { StopTimerReason } from '../shared/types';
import { createTray, destroyTray, updateTray } from './app/tray';
import {
  broadcast,
  createWindow,
  setHideOnClose,
  setQuitting,
  setTrackingTitle,
  showWindow,
} from './app/window';
import { registerIpc } from './ipc';
import {
  AUTO_RESUME_WINDOW_MS,
  IDLE_POLL_MS,
  IDLE_THRESHOLD_SECONDS,
  RESUME_IDLE_SECONDS,
} from './lib/constants';
import { log } from './lib/logger';
import { ActivitySampler } from './services/activity-sampler';
import { ActivitySyncService } from './services/activity-sync-service';
import { ApiClient } from './services/api-client';
import { DeviceSetupService } from './services/device-setup';
import { buildState } from './services/state';
import { SyncService } from './services/sync-service';
import { TimerService } from './services/timer-service';
import { AgentDatabase } from './storage/database';
import { revealToken } from './storage/secure-store';

app.setName('Crewclock');
app.setAppUserModelId('com.crewclock.agent');

let db: AgentDatabase;
let api: ApiClient;
let timer: TimerService;
let sync: SyncService;
let activitySync: ActivitySyncService;
let activitySampler: ActivitySampler;
let setup: DeviceSetupService;
let idleInterval: NodeJS.Timeout | null = null;

function notify(): void {
  if (!db || !api || !timer) {
    return;
  }
  const state = buildState(db, api, timer);
  updateTray();
  if (state.timer) {
    setTrackingTitle(state.timer.projectName);
  } else if (state.pausedTimer) {
    setTrackingTitle(state.pausedTimer.projectName, true);
  } else {
    setTrackingTitle(null);
  }
  broadcast('agent:state-changed', state);
}

function stopAndSync(reason: StopTimerReason): void {
  if (!timer || !sync) {
    return;
  }
  try {
    const result = timer.stop(reason);
    log.info(`Timer stopped reason=${result.reason} queued=${result.queued}`);
    notify();
    if (result.queued) {
      void sync.syncNow();
    }
  } catch (error) {
    log.error('Failed to stop timer', error);
    notify();
  }
}

function pauseAndSync(reason: StopTimerReason): void {
  if (!timer || !sync) {
    return;
  }
  try {
    const result = timer.pauseForInterruption(reason);
    log.info(`Timer paused reason=${result.reason} queued=${result.queued}`);
    notify();
    if (result.queued) {
      void sync.syncNow();
    }
  } catch (error) {
    log.error('Failed to pause timer', error);
    notify();
  }
}

function resumePausedIfAppropriate(): void {
  if (!timer || timer.getTimer()) {
    return;
  }
  const paused = timer.getPausedTimer();
  if (!paused) {
    return;
  }
  if (powerMonitor.getSystemIdleTime() >= RESUME_IDLE_SECONDS) {
    return;
  }
  const pausedFor = Date.now() - Date.parse(paused.pausedAt);
  if (pausedFor > AUTO_RESUME_WINDOW_MS) {
    return;
  }

  try {
    timer.resumePaused();
    log.info('Paused session auto-resumed after idle');
    notify();
  } catch (error) {
    log.error('Failed to auto-resume paused session', error);
  }
}

function quit(): void {
  setQuitting(true);
  app.quit();
}

function startIdleMonitor(): void {
  idleInterval = setInterval(() => {
    if (!timer.getTimer()) {
      resumePausedIfAppropriate();
      return;
    }

    timer.heartbeat();
    const idleSeconds = powerMonitor.getSystemIdleTime();
    if (idleSeconds < IDLE_THRESHOLD_SECONDS) {
      return;
    }

    const result = timer.pauseForIdle(idleSeconds);
    log.info(`Idle pause queued=${result.queued}`);
    notify();
    if (result.queued) {
      void sync.syncNow();
    }
  }, IDLE_POLL_MS);
}

function registerPowerEvents(): void {
  powerMonitor.on('suspend', () => pauseAndSync('suspend'));
  powerMonitor.on('lock-screen', () => pauseAndSync('lock'));
  powerMonitor.on('shutdown', () => stopAndSync('shutdown'));
  powerMonitor.on('resume', () => {
    resumePausedIfAppropriate();
    notify();
  });
}

async function start(): Promise<void> {
  db = new AgentDatabase(join(app.getPath('userData'), 'agent.db'));
  api = new ApiClient();
  timer = new TimerService(db);
  setup = new DeviceSetupService(db, api);
  sync = new SyncService(db, api, () => revealToken(db.getSetting('deviceToken')), notify);
  activitySync = new ActivitySyncService(
    db,
    api,
    () => revealToken(db.getSetting('deviceToken')),
    notify,
  );
  activitySampler = new ActivitySampler(
    db,
    () => timer.getTimer(),
    () => void activitySync.syncNow(),
  );

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  session.defaultSession.setPermissionCheckHandler(() => false);

  registerIpc({ db, api, timer, sync, activitySync, setup, notify });
  createWindow();

  const trayReady = createTray({
    getTimer: () => timer.getTimer(),
    getPausedTimer: () => timer.getPausedTimer(),
    onShow: showWindow,
    onStop: () => stopAndSync('manual'),
    onResume: () => {
      try {
        timer.resumePaused();
        notify();
      } catch (error) {
        log.error('Failed to resume paused session', error);
      }
    },
    onQuit: quit,
  });
  setHideOnClose(trayReady);
  if (!trayReady) {
    app.on('window-all-closed', () => app.quit());
  }

  sync.start();
  activitySync.start();
  activitySampler.start();
  try {
    const recovered = timer.recoverStaleTimer();
    if (recovered) {
      log.info(`Recovered stale timer reason=${recovered.reason} queued=${recovered.queued}`);
      notify();
      if (recovered.queued) {
        void sync.syncNow();
      }
    }
  } catch (error) {
    log.error('Failed to recover timer after restart', error);
  }

  startIdleMonitor();
  registerPowerEvents();
  log.info(`Crewclock agent ready api=${api.baseUrl}`);
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (app.isReady()) {
      showWindow();
    }
  });

  app
    .whenReady()
    .then(start)
    .catch((error) => {
      log.error('Agent failed to start', error);
      app.quit();
    });

  app.on('activate', () => showWindow());

  app.on('before-quit', () => {
    setQuitting(true);
  });

  app.on('will-quit', () => {
    setQuitting(true);
    try {
      if (timer?.getTimer()) {
        timer.stop('shutdown');
      }
    } catch (error) {
      log.error('Failed to persist timer on shutdown', error);
    }
    sync?.stop();
    activitySync?.stop();
    void activitySampler?.stop();
    if (idleInterval) {
      clearInterval(idleInterval);
      idleInterval = null;
    }
    destroyTray();
    db?.close();
    log.info('Crewclock agent stopped');
  });
}
