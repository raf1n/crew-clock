import { describe, expect, it } from 'vitest';

import { AgentDatabase } from './database';

describe('AgentDatabase queue', () => {
  it('enqueues entries idempotently by client id', () => {
    const db = new AgentDatabase(':memory:');
    const payload = {
      projectId: 'project-1',
      startedAt: '2026-01-01T09:00:00.000Z',
      endedAt: '2026-01-01T10:00:00.000Z',
      clientId: 'client-1',
    };

    expect(db.enqueueEntry(payload)).toBe(true);
    expect(db.enqueueEntry(payload)).toBe(false);
    expect(db.pendingCount()).toBe(1);

    db.close();
  });

  it('backs off failed entries and removes synced ones', () => {
    const db = new AgentDatabase(':memory:');
    db.enqueueEntry({
      projectId: 'project-1',
      startedAt: '2026-01-01T09:00:00.000Z',
      endedAt: '2026-01-01T10:00:00.000Z',
      clientId: 'client-1',
    });

    const [item] = db.pendingEntries();
    expect(item).toBeDefined();
    db.markFailed(item!.id, 'offline', Date.now() + 60_000);
    expect(db.pendingEntries()).toHaveLength(0);
    expect(db.pendingCount()).toBe(1);

    db.markSynced(item!.id);
    expect(db.pendingCount()).toBe(0);

    db.close();
  });

  it('moves permanent failures to a dead-letter queue', () => {
    const db = new AgentDatabase(':memory:');
    db.enqueueEntry({
      projectId: 'project-1',
      startedAt: '2026-01-01T09:00:00.000Z',
      endedAt: '2026-01-01T10:00:00.000Z',
      clientId: 'client-1',
    });

    const [item] = db.pendingEntries();
    db.markDeadLetter(item!.id, 'Project not found');
    expect(db.pendingCount()).toBe(0);
    expect(db.failedCount()).toBe(1);

    db.clearFailed();
    expect(db.failedCount()).toBe(0);
    db.close();
  });

  it('caches projects for offline starts', () => {
    const db = new AgentDatabase(':memory:');
    const projects = [
      {
        id: 'project-1',
        workspaceId: 'workspace-1',
        name: 'Website',
        description: null,
        createdBy: null,
        updatedBy: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    db.cacheProjects('workspace-1', projects);
    expect(db.getCachedProjects('workspace-1')).toEqual(projects);
    expect(db.getCachedProjects('workspace-2')).toBeNull();
    db.close();
  });

  it('queues activity samples idempotently', () => {
    const db = new AgentDatabase(':memory:');
    const sample = {
      clientSampleId: 'sample-1',
      intervalStart: '2026-01-01T09:00:00.000Z',
      intervalEnd: '2026-01-01T09:01:00.000Z',
      source: 'desktop' as const,
      activeSeconds: 55,
      idleSeconds: 5,
      keyboardEvents: 10,
      mouseEvents: 4,
    };

    expect(db.enqueueActivitySample(sample)).toBe(true);
    expect(db.enqueueActivitySample(sample)).toBe(false);
    expect(db.pendingActivityCount()).toBe(1);

    const [pending] = db.pendingActivitySamples();
    db.markActivitySynced(pending!.id);
    expect(db.pendingActivityCount()).toBe(0);
    db.close();
  });
});
