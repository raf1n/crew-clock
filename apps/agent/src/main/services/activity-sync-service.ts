import type { SyncResult } from '../../shared/types';
import { ApiError, type ApiClient } from './api-client';
import { MAX_SYNC_ATTEMPTS } from '../lib/constants';
import { log } from '../lib/logger';
import type { AgentDatabase } from '../storage/database';

const LAST_SYNCED_KEY = 'lastSyncedAt';
const LAST_ERROR_KEY = 'lastError';
const SYNC_INTERVAL_MS = 60_000;

export class ActivitySyncService {
  private syncing = false;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: AgentDatabase,
    private readonly api: ApiClient,
    private readonly getDeviceToken: () => string | null,
    private readonly onChange: () => void = () => {},
  ) {}

  start(): void {
    this.syncTimer = setInterval(() => void this.syncNow(), SYNC_INTERVAL_MS);
  }

  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
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
      const pending = this.db.pendingActivitySamples();
      if (pending.length === 0) {
        return this.snapshot(0);
      }

      const batch = pending.map(({ id: _id, attempts: _attempts, ...sample }) => sample);
      try {
        const result = await this.api.ingestActivity(token, batch);
        for (const sample of pending) {
          this.db.markActivitySynced(sample.id);
        }
        synced = result.accepted + result.duplicates;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Activity sync failed';
        lastError = message;

        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          log.warn('Device authorization rejected during activity sync', error.status);
        } else if (error instanceof ApiError && error.status === 429) {
          const delay = (error.retryAfterSeconds ?? 60) * 1000;
          for (const sample of pending) {
            this.db.markActivityFailed(sample.id, message, Date.now() + delay);
          }
        } else if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          log.warn('Rejected activity batch moved to dead letter', message);
          for (const sample of pending) {
            this.db.markActivityDeadLetter(sample.id, message);
          }
        } else {
          for (const sample of pending) {
            if (sample.attempts + 1 >= MAX_SYNC_ATTEMPTS) {
              this.db.markActivityDeadLetter(sample.id, message);
            } else {
              this.db.markActivityFailed(
                sample.id,
                message,
                Date.now() + backoffMs(sample.attempts + 1),
              );
            }
          }
        }
      }
    } finally {
      this.syncing = false;
    }

    if (lastError) {
      this.db.setSetting(LAST_ERROR_KEY, lastError);
    } else {
      this.db.setSetting(LAST_SYNCED_KEY, new Date().toISOString());
    }

    if (synced > 0) {
      log.info(`Synced ${synced} activity sample${synced === 1 ? '' : 's'}`);
    }

    this.onChange();
    return this.snapshot(synced);
  }

  private snapshot(synced: number): SyncResult {
    return {
      synced,
      pending: this.db.pendingActivityCount(),
      failed: this.db.failedActivityCount(),
      lastSyncedAt: this.db.getSetting(LAST_SYNCED_KEY),
      lastError: this.db.getSetting(LAST_ERROR_KEY),
    };
  }
}

function backoffMs(attempts: number): number {
  const base = Math.min(15 * 60_000, 15_000 * 2 ** Math.min(attempts, 6));
  return Math.round(base * (0.75 + Math.random() * 0.5));
}
