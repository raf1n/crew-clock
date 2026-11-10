import { chmodSync } from 'node:fs';

import Database from 'better-sqlite3';

import type { ActivitySampleInput, Project } from '@crewclock/shared';

import type { PausedTimer, TimerState } from '../../shared/types';
import { MAX_QUEUE_SIZE } from '../lib/constants';

export interface QueuedEntryPayload {
  projectId: string;
  taskId?: string | null;
  description?: string | null;
  startedAt: string;
  endedAt: string;
  clientId: string;
  idleSeconds?: number;
}

export interface QueueItem {
  id: string;
  payload: QueuedEntryPayload;
  attempts: number;
  nextAttemptAt: number;
}

interface QueueRow {
  id: string;
  payload: string;
  attempts: number;
  next_attempt_at: number;
}

interface ColumnInfo {
  name: string;
}

export class AgentDatabase {
  private readonly db: Database.Database;

  constructor(filePath: string) {
    this.db = new Database(filePath);
    if (filePath !== ':memory:') {
      try {
        chmodSync(filePath, 0o600);
      } catch {
        // Best-effort permissions; the OS may not support chmod here.
      }
    }
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS queue (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at INTEGER NOT NULL,
        last_error TEXT,
        dead_lettered INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS projects_cache (
        workspace_id TEXT PRIMARY KEY,
        projects TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS activity_queue (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at INTEGER NOT NULL,
        last_error TEXT,
        dead_lettered INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);

    const columns = this.db.pragma('table_info(queue)') as ColumnInfo[];
    if (!columns.some((column) => column.name === 'dead_lettered')) {
      this.db.exec('ALTER TABLE queue ADD COLUMN dead_lettered INTEGER NOT NULL DEFAULT 0');
    }

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_queue_pending
      ON queue (dead_lettered, next_attempt_at, created_at);
      CREATE INDEX IF NOT EXISTS idx_activity_queue_pending
      ON activity_queue (dead_lettered, next_attempt_at, created_at);
    `);
    this.db.pragma('user_version = 2');
  }

  close(): void {
    this.db.close();
  }

  getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      { value: string } | undefined;
    return row?.value ?? null;
  }

  setSetting(key: string, value: string): void {
    this.db
      .prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      )
      .run(key, value);
  }

  deleteSetting(key: string): void {
    this.db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  }

  getTimer(): TimerState | null {
    const value = this.getSetting('timer');
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as TimerState;
    } catch {
      return null;
    }
  }

  setTimer(timer: TimerState): void {
    this.setSetting('timer', JSON.stringify(timer));
  }

  clearTimer(): void {
    this.deleteSetting('timer');
    this.deleteSetting('timerHeartbeatAt');
  }

  getPausedTimer(): PausedTimer | null {
    const value = this.getSetting('pausedTimer');
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as PausedTimer;
    } catch {
      return null;
    }
  }

  setPausedTimer(timer: PausedTimer): void {
    this.setSetting('pausedTimer', JSON.stringify(timer));
  }

  clearPausedTimer(): void {
    this.deleteSetting('pausedTimer');
  }

  enqueueEntry(payload: QueuedEntryPayload): boolean {
    if (this.pendingCount() + this.failedCount() >= MAX_QUEUE_SIZE) {
      throw new Error('Offline queue is full — reconnect to sync before tracking more');
    }

    const result = this.db
      .prepare(
        'INSERT OR IGNORE INTO queue (id, payload, next_attempt_at, created_at) VALUES (?, ?, ?, ?)',
      )
      .run(payload.clientId, JSON.stringify(payload), Date.now(), Date.now());
    return result.changes > 0;
  }

  pendingEntries(limit = 50): QueueItem[] {
    const rows = this.db
      .prepare(
        'SELECT id, payload, attempts, next_attempt_at FROM queue WHERE dead_lettered = 0 AND next_attempt_at <= ? ORDER BY created_at ASC LIMIT ?',
      )
      .all(Date.now(), limit) as QueueRow[];

    return rows.map((row) => ({
      id: row.id,
      payload: JSON.parse(row.payload) as QueuedEntryPayload,
      attempts: row.attempts,
      nextAttemptAt: row.next_attempt_at,
    }));
  }

  pendingCount(): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM queue WHERE dead_lettered = 0')
      .get() as { count: number };
    return row.count;
  }

  failedCount(): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM queue WHERE dead_lettered = 1')
      .get() as { count: number };
    return row.count;
  }

  markSynced(id: string): void {
    this.db.prepare('DELETE FROM queue WHERE id = ?').run(id);
  }

  markFailed(id: string, error: string, nextAttemptAt: number): void {
    this.db
      .prepare(
        'UPDATE queue SET attempts = attempts + 1, next_attempt_at = ?, last_error = ? WHERE id = ?',
      )
      .run(nextAttemptAt, error, id);
  }

  markDeadLetter(id: string, error: string): void {
    this.db
      .prepare(
        'UPDATE queue SET attempts = attempts + 1, dead_lettered = 1, last_error = ? WHERE id = ?',
      )
      .run(error, id);
  }

  clearFailed(): void {
    this.db.prepare('DELETE FROM queue WHERE dead_lettered = 1').run();
  }

  clearQueue(): void {
    this.db.prepare('DELETE FROM queue').run();
  }

  enqueueActivitySample(payload: ActivitySampleInput): boolean {
    if (this.pendingActivityCount() + this.failedActivityCount() >= MAX_QUEUE_SIZE) {
      throw new Error('Activity queue is full — reconnect to sync before tracking more');
    }
    const result = this.db
      .prepare(
        'INSERT OR IGNORE INTO activity_queue (id, payload, next_attempt_at, created_at) VALUES (?, ?, ?, ?)',
      )
      .run(payload.clientSampleId, JSON.stringify(payload), Date.now(), Date.now());
    return result.changes > 0;
  }

  pendingActivitySamples(
    limit = 50,
  ): Array<ActivitySampleInput & { id: string; attempts: number }> {
    const rows = this.db
      .prepare(
        'SELECT id, payload, attempts FROM activity_queue WHERE dead_lettered = 0 AND next_attempt_at <= ? ORDER BY created_at ASC LIMIT ?',
      )
      .all(Date.now(), limit) as Array<{ id: string; payload: string; attempts: number }>;

    return rows.map((row) => ({
      ...(JSON.parse(row.payload) as ActivitySampleInput),
      id: row.id,
      attempts: row.attempts,
    }));
  }

  pendingActivityCount(): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM activity_queue WHERE dead_lettered = 0')
      .get() as { count: number };
    return row.count;
  }

  failedActivityCount(): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM activity_queue WHERE dead_lettered = 1')
      .get() as { count: number };
    return row.count;
  }

  markActivitySynced(id: string): void {
    this.db.prepare('DELETE FROM activity_queue WHERE id = ?').run(id);
  }

  markActivityFailed(id: string, error: string, nextAttemptAt: number): void {
    this.db
      .prepare(
        'UPDATE activity_queue SET attempts = attempts + 1, next_attempt_at = ?, last_error = ? WHERE id = ?',
      )
      .run(nextAttemptAt, error, id);
  }

  markActivityDeadLetter(id: string, error: string): void {
    this.db
      .prepare(
        'UPDATE activity_queue SET attempts = attempts + 1, dead_lettered = 1, last_error = ? WHERE id = ?',
      )
      .run(error, id);
  }

  clearFailedActivity(): void {
    this.db.prepare('DELETE FROM activity_queue WHERE dead_lettered = 1').run();
  }

  clearActivityQueue(): void {
    this.db.prepare('DELETE FROM activity_queue').run();
  }

  getCachedProjects(workspaceId: string): Project[] | null {
    const row = this.db
      .prepare('SELECT projects FROM projects_cache WHERE workspace_id = ?')
      .get(workspaceId) as { projects: string } | undefined;
    if (!row) {
      return null;
    }
    try {
      return JSON.parse(row.projects) as Project[];
    } catch {
      return null;
    }
  }

  cacheProjects(workspaceId: string, projects: Project[]): void {
    this.db
      .prepare(
        'INSERT INTO projects_cache (workspace_id, projects, updated_at) VALUES (?, ?, ?) ON CONFLICT(workspace_id) DO UPDATE SET projects = excluded.projects, updated_at = excluded.updated_at',
      )
      .run(workspaceId, JSON.stringify(projects), Date.now());
  }
}
