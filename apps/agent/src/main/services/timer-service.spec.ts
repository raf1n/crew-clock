import { describe, expect, it } from 'vitest';

import { AgentDatabase } from '../storage/database';
import { TimerService } from './timer-service';

describe('TimerService', () => {
  it('queues a completed entry when stopped', () => {
    const db = new AgentDatabase(':memory:');
    const timer = new TimerService(db);

    timer.start({ projectId: 'project-1', projectName: 'Website', description: 'Work' });
    expect(timer.getTimer()).not.toBeNull();

    const result = timer.stop();
    expect(result).toEqual({ queued: true, reason: 'manual' });
    expect(timer.getTimer()).toBeNull();
    expect(db.pendingCount()).toBe(1);

    db.close();
  });

  it('excludes idle time when auto-stopping', () => {
    const db = new AgentDatabase(':memory:');
    const timer = new TimerService(db);
    db.setTimer({
      projectId: 'project-1',
      projectName: 'Website',
      taskId: null,
      taskTitle: null,
      description: null,
      startedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
    });

    const result = timer.pauseForIdle(5 * 60);
    expect(result).toEqual({ queued: true, reason: 'idle' });

    const [item] = db.pendingEntries();
    const endedAt = new Date(item!.payload.endedAt).getTime();
    expect(endedAt).toBeLessThanOrEqual(Date.now() - 4 * 60_000);
    expect(item!.payload.idleSeconds).toBe(300);
    expect(timer.getPausedTimer()).toMatchObject({ projectName: 'Website' });

    const resumed = timer.resumePaused();
    expect(resumed.projectName).toBe('Website');
    expect(timer.getTimer()).not.toBeNull();
    expect(timer.getPausedTimer()).toBeNull();
    db.close();
  });

  it('truncates a timer that outlived an app restart', () => {
    const db = new AgentDatabase(':memory:');
    const timer = new TimerService(db);
    const startedAt = new Date(Date.now() - 40 * 60_000).toISOString();
    const heartbeat = new Date(Date.now() - 10 * 60_000).toISOString();
    db.setTimer({
      projectId: 'project-1',
      projectName: 'Website',
      taskId: null,
      taskTitle: null,
      description: null,
      startedAt,
    });
    db.setSetting('timerHeartbeatAt', heartbeat);

    const result = timer.recoverStaleTimer();
    expect(result).toEqual({ queued: true, reason: 'restart' });
    expect(timer.getTimer()).toBeNull();

    const [item] = db.pendingEntries();
    expect(new Date(item!.payload.endedAt).getTime()).toBeLessThan(
      new Date(heartbeat).getTime() + 61_000,
    );
    db.close();
  });
});
