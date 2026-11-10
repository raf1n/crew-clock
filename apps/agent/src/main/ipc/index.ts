import { ipcMain, powerMonitor } from 'electron';

import type { Project } from '@crewclock/shared';

import type { StartTimerInput } from '../../shared/types';
import {
  loginIpcSchema,
  parseIpc,
  registerDeviceIpcSchema,
  startTimerIpcSchema,
  tasksIpcSchema,
} from '../../shared/validation';
import type { ApiClient } from '../services/api-client';
import type { DeviceSetupService } from '../services/device-setup';
import { log } from '../lib/logger';
import { buildState, readDevice } from '../services/state';
import type { SyncService } from '../services/sync-service';
import type { TimerService } from '../services/timer-service';
import { revealToken } from '../storage/secure-store';
import type { AgentDatabase } from '../storage/database';

interface IpcDependencies {
  db: AgentDatabase;
  api: ApiClient;
  timer: TimerService;
  sync: SyncService;
  setup: DeviceSetupService;
  notify: () => void;
}

export function registerIpc(deps: IpcDependencies): void {
  const { db, api, timer, sync, setup, notify } = deps;
  const state = () => buildState(db, api, timer);

  ipcMain.handle('agent:state', () => state());

  ipcMain.handle('agent:login', async (_event, input: unknown) => {
    const credentials = parseIpc(loginIpcSchema, input);
    return setup.login(credentials.email, credentials.password);
  });

  ipcMain.handle('agent:register-device', async (_event, input: unknown) => {
    const parsed = parseIpc(registerDeviceIpcSchema, input);
    await setup.registerDevice(parsed.workspaceId, parsed.deviceName);
    notify();
    return state();
  });

  ipcMain.handle('agent:projects', async (): Promise<Project[]> => {
    const device = readDevice(db);
    if (!device) {
      throw new Error('This device is not registered');
    }

    const token = revealToken(db.getSetting('deviceToken'));
    if (!token) {
      throw new Error('This device is not registered');
    }

    try {
      const projects = await api.listProjects(token);
      db.cacheProjects(device.workspaceId, projects);
      return projects;
    } catch (error) {
      const cached = db.getCachedProjects(device.workspaceId);
      if (cached) {
        log.warn('Project refresh failed; using cached projects');
        return cached;
      }
      throw error;
    }
  });

  ipcMain.handle('agent:tasks', async (_event, input: unknown) => {
    const { projectId } = parseIpc(tasksIpcSchema, input);
    const token = revealToken(db.getSetting('deviceToken'));
    if (!token) {
      throw new Error('This device is not registered');
    }
    return api.listTasks(token, projectId);
  });

  ipcMain.handle('agent:idle-seconds', () =>
    timer.getTimer() ? powerMonitor.getSystemIdleTime() : 0,
  );

  ipcMain.handle('agent:start-timer', (_event, input: unknown) => {
    const parsed = parseIpc(startTimerIpcSchema, input) as StartTimerInput;
    timer.start(parsed);
    log.info(`Timer started project=${parsed.projectId}`);
    notify();
    return state();
  });

  ipcMain.handle('agent:stop-timer', async () => {
    const result = timer.stop();
    notify();
    if (result.queued) {
      await sync.syncNow();
    }
    return result;
  });

  ipcMain.handle('agent:resume-timer', () => {
    timer.resumePaused();
    log.info('Paused session resumed');
    notify();
    return state();
  });

  ipcMain.handle('agent:discard-paused', () => {
    timer.discardPaused();
    notify();
    return state();
  });

  ipcMain.handle('agent:sync-now', async () => {
    const result = await sync.syncNow();
    notify();
    return result;
  });

  ipcMain.handle('agent:discard-failed', () => {
    db.clearFailed();
    if (db.pendingCount() === 0) {
      db.deleteSetting('lastError');
    }
    notify();
    return state();
  });

  ipcMain.handle('agent:sign-out', () => {
    db.clearQueue();
    timer.discard();
    timer.discardPaused();
    for (const key of ['deviceToken', 'device', 'workspaceName', 'lastSyncedAt', 'lastError']) {
      db.deleteSetting(key);
    }
    setup.clearPending();
    log.info('Agent signed out; local queue cleared');
    notify();
    return state();
  });
}
