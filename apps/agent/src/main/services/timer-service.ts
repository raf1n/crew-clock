import { randomUUID } from 'node:crypto';

import type {
  PausedTimer,
  StartTimerInput,
  StopTimerReason,
  StopTimerResult,
  TimerState,
} from '../../shared/types';
import { RESTART_GAP_MS } from '../lib/constants';
import type { AgentDatabase } from '../storage/database';

export class TimerService {
  constructor(private readonly db: AgentDatabase) {}

  getTimer(): TimerState | null {
    return this.db.getTimer();
  }

  getPausedTimer(): PausedTimer | null {
    return this.db.getPausedTimer();
  }

  start(input: StartTimerInput): TimerState {
    if (this.db.getTimer()) {
      throw new Error('A timer is already running');
    }

    this.db.clearPausedTimer();
    const timer: TimerState = {
      projectId: input.projectId,
      projectName: input.projectName,
      taskId: input.taskId ?? null,
      taskTitle: input.taskTitle ?? null,
      description: input.description?.trim() || null,
      startedAt: new Date().toISOString(),
    };
    this.db.setTimer(timer);
    this.heartbeat();
    return timer;
  }

  heartbeat(): void {
    if (this.db.getTimer()) {
      this.db.setSetting('timerHeartbeatAt', new Date().toISOString());
    }
  }

  stop(reason: StopTimerReason = 'manual'): StopTimerResult {
    const timer = this.db.getTimer();
    if (!timer) {
      return { queued: false, reason: 'not-running' };
    }

    const started = new Date(timer.startedAt).getTime();
    const ended = reason === 'manual' ? Math.max(Date.now(), started + 1000) : Date.now();
    return this.stopAt(new Date(ended), reason);
  }

  pauseForIdle(idleSeconds: number): StopTimerResult {
    const timer = this.db.getTimer();
    if (!timer) {
      return { queued: false, reason: 'not-running' };
    }

    const started = new Date(timer.startedAt).getTime();
    const ended = Date.now() - idleSeconds * 1000;
    let result: StopTimerResult;
    if (ended <= started) {
      this.discard();
      result = { queued: false, reason: 'idle' };
    } else {
      result = this.stopAt(new Date(ended), 'idle', Math.round(idleSeconds));
    }

    this.db.setPausedTimer({
      projectId: timer.projectId,
      projectName: timer.projectName,
      taskId: timer.taskId ?? null,
      taskTitle: timer.taskTitle ?? null,
      description: timer.description,
      pausedAt: new Date().toISOString(),
    });
    return result;
  }

  pauseForInterruption(reason: StopTimerReason): StopTimerResult {
    const timer = this.db.getTimer();
    if (!timer) {
      return { queued: false, reason: 'not-running' };
    }

    const result = this.stop(reason);
    this.db.setPausedTimer({
      projectId: timer.projectId,
      projectName: timer.projectName,
      taskId: timer.taskId ?? null,
      taskTitle: timer.taskTitle ?? null,
      description: timer.description,
      pausedAt: new Date().toISOString(),
    });
    return result;
  }

  resumePaused(): TimerState {
    const paused = this.db.getPausedTimer();
    if (!paused) {
      throw new Error('No paused session to resume');
    }
    return this.start({
      projectId: paused.projectId,
      projectName: paused.projectName,
      taskId: paused.taskId ?? undefined,
      taskTitle: paused.taskTitle ?? undefined,
      description: paused.description ?? undefined,
    });
  }

  discardPaused(): void {
    this.db.clearPausedTimer();
  }

  stopAt(endedAt: Date, reason: StopTimerReason, idleSeconds = 0): StopTimerResult {
    const timer = this.db.getTimer();
    if (!timer) {
      return { queued: false, reason: 'not-running' };
    }

    const started = new Date(timer.startedAt).getTime();
    if (endedAt.getTime() <= started) {
      this.discard();
      return { queued: false, reason };
    }

    const clientId = randomUUID();
    this.db.enqueueEntry({
      projectId: timer.projectId,
      taskId: timer.taskId ?? null,
      description: timer.description,
      startedAt: timer.startedAt,
      endedAt: endedAt.toISOString(),
      clientId,
      idleSeconds: Math.max(0, idleSeconds),
    });
    this.db.clearTimer();
    return { queued: true, reason };
  }

  recoverStaleTimer(now = Date.now()): StopTimerResult | null {
    const timer = this.db.getTimer();
    if (!timer) {
      return null;
    }

    const heartbeat = this.db.getSetting('timerHeartbeatAt');
    const lastSeen = heartbeat ? Date.parse(heartbeat) : new Date(timer.startedAt).getTime();
    if (now - lastSeen <= RESTART_GAP_MS) {
      return null;
    }

    const started = new Date(timer.startedAt).getTime();
    const cutoff = Math.min(now, lastSeen + 60_000);
    if (cutoff <= started) {
      this.discard();
      return { queued: false, reason: 'restart' };
    }

    return this.stopAt(new Date(cutoff), 'restart');
  }

  discard(): void {
    this.db.clearTimer();
  }
}
