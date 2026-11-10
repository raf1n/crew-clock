import { hostname } from 'node:os';

import type { Device } from '@crewclock/shared';

import type { AgentState } from '../../shared/types';
import type { ApiClient } from './api-client';
import type { AgentDatabase } from '../storage/database';
import { revealToken } from '../storage/secure-store';
import type { TimerService } from './timer-service';

export function readDevice(db: AgentDatabase): Device | null {
  const raw = db.getSetting('device');
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Device;
  } catch {
    return null;
  }
}

export function buildState(db: AgentDatabase, api: ApiClient, timer: TimerService): AgentState {
  const device = readDevice(db);
  const token = revealToken(db.getSetting('deviceToken'));
  return {
    apiUrl: api.baseUrl,
    configured: Boolean(device && token),
    deviceName: hostname(),
    workspaceName: db.getSetting('workspaceName'),
    device,
    timer: timer.getTimer(),
    pausedTimer: timer.getPausedTimer(),
    pendingEntries: db.pendingCount(),
    failedEntries: db.failedCount(),
    lastSyncedAt: db.getSetting('lastSyncedAt'),
    lastError: db.getSetting('lastError'),
  };
}
