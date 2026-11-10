import { randomUUID } from 'node:crypto';

import { powerMonitor } from 'electron';
import type { ActivitySampleInput } from '@crewclock/shared';

import type { TimerState } from '../../shared/types';
import { log } from '../lib/logger';
import type { AgentDatabase } from '../storage/database';

const SAMPLE_INTERVAL_MS = 60_000;
const MONITOR_INTERVAL_MS = 2_000;
const MIN_SAMPLE_SECONDS = 5;
const MOUSE_MOVE_THROTTLE_MS = 500;

type Hook = (typeof import('uiohook-napi'))['uIOhook'];
type ActiveWindow = (typeof import('active-win'))['activeWindow'];

export class ActivitySampler {
  private monitorTimer: NodeJS.Timeout | null = null;
  private sampleTimer: NodeJS.Timeout | null = null;
  private hook: Hook | null = null;
  private activeWindow: ActiveWindow | null = null;
  private sampling = false;
  private intervalStart = 0;
  private keyboardEvents = 0;
  private mouseEvents = 0;
  private lastMouseMove = 0;

  constructor(
    private readonly db: AgentDatabase,
    private readonly getTimer: () => TimerState | null,
    private readonly onQueued: () => void,
  ) {}

  start(): void {
    if (this.monitorTimer) {
      return;
    }
    this.monitorTimer = setInterval(() => void this.tick(), MONITOR_INTERVAL_MS);
    void this.tick();
  }

  async stop(): Promise<void> {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
    await this.endSession();
  }

  private async tick(): Promise<void> {
    const active = Boolean(this.getTimer());
    if (active && !this.sampling) {
      await this.beginSession();
    } else if (!active && this.sampling) {
      await this.endSession();
    }
  }

  private async beginSession(): Promise<void> {
    this.sampling = true;
    this.intervalStart = Date.now();
    this.keyboardEvents = 0;
    this.mouseEvents = 0;

    try {
      const { uIOhook } = await import('uiohook-napi');
      this.hook = uIOhook;
      uIOhook.on('keydown', this.handleKey);
      uIOhook.on('mousedown', this.handleMouse);
      uIOhook.on('wheel', this.handleMouse);
      uIOhook.on('mousemove', this.handleMouseMove);
      uIOhook.start();
    } catch (error) {
      this.hook = null;
      this.setCaptureError(`Input capture unavailable: ${messageOf(error)}`);
      log.warn('Input activity capture unavailable', error);
    }

    try {
      const { activeWindow } = await import('active-win');
      this.activeWindow = activeWindow;
    } catch (error) {
      this.activeWindow = null;
      this.setCaptureError(`Active window capture unavailable: ${messageOf(error)}`);
      log.warn('Active window capture unavailable', error);
    }

    if (this.hook && this.activeWindow) {
      this.clearCaptureError();
    }

    this.sampleTimer = setInterval(() => void this.flush(), SAMPLE_INTERVAL_MS);
  }

  private async endSession(): Promise<void> {
    if (!this.sampling) {
      return;
    }
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    await this.flush();
    this.sampling = false;

    if (this.hook) {
      this.hook.off('keydown', this.handleKey);
      this.hook.off('mousedown', this.handleMouse);
      this.hook.off('wheel', this.handleMouse);
      this.hook.off('mousemove', this.handleMouseMove);
      this.hook.stop();
      this.hook = null;
    }
  }

  private async flush(): Promise<void> {
    if (!this.sampling || this.intervalStart === 0) {
      return;
    }

    const endedAt = Date.now();
    const durationSeconds = Math.round((endedAt - this.intervalStart) / 1000);
    if (durationSeconds < MIN_SAMPLE_SECONDS) {
      this.resetInterval(endedAt);
      return;
    }

    const idleSeconds = Math.min(durationSeconds, powerMonitor.getSystemIdleTime());
    const activeSeconds = Math.max(0, durationSeconds - idleSeconds);
    const window = await this.captureWindow();

    const sample: ActivitySampleInput = {
      clientSampleId: randomUUID(),
      intervalStart: new Date(this.intervalStart).toISOString(),
      intervalEnd: new Date(endedAt).toISOString(),
      source: 'desktop',
      activeSeconds,
      idleSeconds,
      keyboardEvents: this.keyboardEvents,
      mouseEvents: this.mouseEvents,
      appName: window?.appName ?? null,
      appId: window?.appId ?? null,
      windowTitle: window?.windowTitle ?? null,
      url: window?.url ?? null,
      pageTitle: window?.windowTitle ?? null,
    };

    try {
      this.db.enqueueActivitySample(sample);
      this.onQueued();
    } catch (error) {
      log.error('Failed to queue activity sample', error);
    }

    this.resetInterval(endedAt);
  }

  private async captureWindow(): Promise<{
    appName: string | null;
    appId: string | null;
    windowTitle: string | null;
    url: string | null;
  } | null> {
    if (!this.activeWindow) {
      return null;
    }
    try {
      const window = await this.activeWindow();
      if (!window) {
        return null;
      }
      const owner = window.owner;
      const appId =
        'bundleId' in owner && owner.bundleId ? owner.bundleId : (owner.path ?? owner.name);
      const url = 'url' in window && typeof window.url === 'string' ? window.url : null;
      return {
        appName: truncate(owner.name, 255),
        appId: truncate(appId, 255),
        windowTitle: truncate(window.title, 512),
        url: url ? truncate(url, 2048) : null,
      };
    } catch (error) {
      this.setCaptureError(`Active window read failed: ${messageOf(error)}`);
      log.warn('Failed to read the active window', error);
      return null;
    }
  }

  private setCaptureError(message: string): void {
    this.db.setSetting('activityCaptureError', message);
  }

  private clearCaptureError(): void {
    this.db.deleteSetting('activityCaptureError');
  }

  private resetInterval(now: number): void {
    this.intervalStart = now;
    this.keyboardEvents = 0;
    this.mouseEvents = 0;
    this.lastMouseMove = 0;
  }

  private readonly handleKey = (): void => {
    this.keyboardEvents += 1;
  };

  private readonly handleMouse = (): void => {
    this.mouseEvents += 1;
  };

  private readonly handleMouseMove = (): void => {
    const now = Date.now();
    if (now - this.lastMouseMove < MOUSE_MOVE_THROTTLE_MS) {
      return;
    }
    this.lastMouseMove = now;
    this.mouseEvents += 1;
  };
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
