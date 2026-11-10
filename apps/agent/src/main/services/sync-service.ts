import type { SyncResult } from '../../shared/types';
import { ApiError, type ApiClient } from './api-client';
import { MAX_SYNC_ATTEMPTS } from '../lib/constants';
import { log } from '../lib/logger';
import { systemTimeZone } from '../lib/timezone';
import type { AgentDatabase } from '../storage/database';

const LAST_SYNCED_KEY = 'lastSyncedAt';
const LAST_ERROR_KEY = 'lastError';
const SYNC_INTERVAL_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 60_000;

export class SyncService {
  private syncing = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: AgentDatabase,
    private readonly api: ApiClient,
    private readonly getDeviceToken: () => string | null,
    private readonly onChange: () => void = () => {},
  ) {}

  start(): void {
    this.syncTimer = setInterval(() => void this.syncNow(), SYNC_INTERVAL_MS);
    this.heartbeatTimer = setInterval(() => void this.heartbeat(), HEARTBEAT_INTERVAL_MS);
    void this.heartbeat();
  }

  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  async syncNow(): Promise<SyncResult> {
    if (this.syncing) {
      return this.snapshot(0);
    }

    const token = this.getDeviceToken();
    if (!token) {
      return this.snapshot(0);
    }

    this.syncing = true;
    let synced = 0;
    let lastError: string | null = null;

    try {
      const pending = this.db.pendingEntries();
      for (const item of pending) {
        try {
          await this.api.createEntry(token, item.payload);
          this.db.markSynced(item.id);
          synced += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Sync failed';
          lastError = message;

          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            log.warn('Device authorization rejected during sync', error.status);
            break;
          }

          if (error instanceof ApiError && error.status === 429) {
            this.db.markFailed(
              item.id,
              message,
              Date.now() + (error.retryAfterSeconds ?? 60) * 1000,
            );
            break;
          }

          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            log.warn('Rejected offline entry moved to dead letter', message);
            this.db.markDeadLetter(item.id, message);
            continue;
          }

          if (item.attempts + 1 >= MAX_SYNC_ATTEMPTS) {
            log.warn('Offline entry exhausted retries', item.id, message);
            this.db.markDeadLetter(item.id, message);
            continue;
          }

          this.db.markFailed(item.id, message, Date.now() + backoffMs(item.attempts + 1));
          break;
        }
      }
    } finally {
      this.syncing = false;
    }

    if (lastError && this.db.failedCount() === 0) {
      this.db.setSetting(LAST_ERROR_KEY, lastError);
    } else if (!lastError) {
      this.db.deleteSetting(LAST_ERROR_KEY);
      this.db.setSetting(LAST_SYNCED_KEY, new Date().toISOString());
    }

    if (synced > 0) {
      log.info(`Synced ${synced} offline entr${synced === 1 ? 'y' : 'ies'}`);
    }

    this.onChange();
    return this.snapshot(synced);
  }

  async heartbeat(): Promise<void> {
    const token = this.getDeviceToken();
    if (!token) {
      return;
    }
    try {
      await this.api.heartbeat(token, systemTimeZone());
    } catch (error) {
      log.warn('Agent heartbeat failed', error instanceof Error ? error.message : error);
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        this.db.setSetting(
          LAST_ERROR_KEY,
          'This device was revoked or is no longer authorized. Sign in again.',
        );
        this.onChange();
      }
    }
  }

  private snapshot(synced: number): SyncResult {
    return {
      synced,
      pending: this.db.pendingCount(),
      failed: this.db.failedCount(),
      lastSyncedAt: this.db.getSetting(LAST_SYNCED_KEY),
      lastError: this.db.getSetting(LAST_ERROR_KEY),
    };
  }
}

function backoffMs(attempts: number): number {
  const base = Math.min(15 * 60_000, 15_000 * 2 ** Math.min(attempts, 6));
  return Math.round(base * (0.75 + Math.random() * 0.5));
}
