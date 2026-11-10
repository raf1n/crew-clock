import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';

import { createTestApp } from './test-app';

describe('time tracking (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  let ownerToken = '';
  let ownerId = '';
  let workspaceId = '';

  let memberToken = '';
  let memberId = '';

  let outsiderToken = '';

  let projectId = '';
  let secondProjectId = '';
  let taskId = '';
  let secondTaskId = '';

  let timerEntryId = '';
  let manualEntryId = '';
  let timesheetId = '';

  const auth = (token: string): string => `Bearer ${token}`;

  beforeAll(async () => {
    const context = await createTestApp();
    app = context.app;
    server = context.server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets up a workspace with a project and task', async () => {
    const owner = await request(server)
      .post('/v1/auth/register')
      .send({
        email: 'alice@time.test',
        password: 'correct horse battery',
        name: 'Alice',
        workspaceName: 'Time Co',
      })
      .expect(201);
    ownerToken = owner.body.accessToken;
    ownerId = owner.body.user.id;

    const workspaces = await request(server)
      .get('/v1/workspaces')
      .set('Authorization', auth(ownerToken))
      .expect(200);
    workspaceId = workspaces.body[0].id;

    const member = await request(server)
      .post('/v1/auth/register')
      .send({
        email: 'bob@time.test',
        password: 'correct horse battery',
        name: 'Bob',
        workspaceName: 'Bob Co',
      })
      .expect(201);
    memberToken = member.body.accessToken;
    memberId = member.body.user.id;

    await request(server)
      .post(`/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', auth(ownerToken))
      .send({ email: 'bob@time.test', role: 'member' })
      .expect(201);

    const outsider = await request(server)
      .post('/v1/auth/register')
      .send({
        email: 'carol@other-time.test',
        password: 'correct horse battery',
        name: 'Carol',
        workspaceName: 'Other Co',
      })
      .expect(201);
    outsiderToken = outsider.body.accessToken;

    const project = await request(server)
      .post(`/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', auth(ownerToken))
      .send({ name: 'Website' })
      .expect(201);
    projectId = project.body.id;

    const secondProject = await request(server)
      .post(`/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', auth(ownerToken))
      .send({ name: 'Mobile' })
      .expect(201);
    secondProjectId = secondProject.body.id;

    const task = await request(server)
      .post(`/v1/workspaces/${workspaceId}/projects/${projectId}/tasks`)
      .set('Authorization', auth(ownerToken))
      .send({ title: 'Build navigation', assigneeId: memberId })
      .expect(201);
    taskId = task.body.id;

    const secondTask = await request(server)
      .post(`/v1/workspaces/${workspaceId}/projects/${secondProjectId}/tasks`)
      .set('Authorization', auth(ownerToken))
      .send({ title: 'Other task' })
      .expect(201);
    secondTaskId = secondTask.body.id;
  });

  it('starts, reports, and stops a running timer', async () => {
    const started = await request(server)
      .post(`/v1/workspaces/${workspaceId}/time-entries/start`)
      .set('Authorization', auth(memberToken))
      .send({ projectId, taskId, description: 'Working' })
      .expect(201);

    expect(started.body.endedAt).toBeNull();
    expect(started.body.durationSeconds).toBeNull();
    expect(started.body.source).toBe('timer');
    expect(started.body.userId).toBe(memberId);
    expect(started.body.createdBy).toBe(memberId);
    timerEntryId = started.body.id;

    await request(server)
      .post(`/v1/workspaces/${workspaceId}/time-entries/start`)
      .set('Authorization', auth(memberToken))
      .send({ projectId })
      .expect(409);

    const running = await request(server)
      .get(`/v1/workspaces/${workspaceId}/time-entries/running`)
      .set('Authorization', auth(memberToken))
      .expect(200);
    expect(running.body.id).toBe(timerEntryId);

    const noTimer = await request(server)
      .get(`/v1/workspaces/${workspaceId}/time-entries/running`)
      .set('Authorization', auth(ownerToken))
      .expect(200);
    expect(noTimer.body).toEqual({});

    const stopped = await request(server)
      .post(`/v1/workspaces/${workspaceId}/time-entries/${timerEntryId}/stop`)
      .set('Authorization', auth(memberToken))
      .expect(200);

    expect(stopped.body.endedAt).toEqual(expect.any(String));
    expect(stopped.body.durationSeconds).toBeGreaterThanOrEqual(1);

    await request(server)
      .post(`/v1/workspaces/${workspaceId}/time-entries/${timerEntryId}/stop`)
      .set('Authorization', auth(memberToken))
      .expect(409);
  });

  it('creates manual entries and rejects invalid ranges and overlaps', async () => {
    const manual = await request(server)
      .post(`/v1/workspaces/${workspaceId}/time-entries`)
      .set('Authorization', auth(memberToken))
      .send({
        projectId,
        taskId,
        description: 'Sprint planning',
        startedAt: '2026-01-05T09:00:00.000Z',
        endedAt: '2026-01-05T10:00:00.000Z',
      })
      .expect(201);

    expect(manual.body.durationSeconds).toBe(3600);
    expect(manual.body.source).toBe('manual');
    expect(manual.body.createdBy).toBe(memberId);
    manualEntryId = manual.body.id;

    await request(server)
      .post(`/v1/workspaces/${workspaceId}/time-entries`)
      .set('Authorization', auth(memberToken))
      .send({
        projectId,
        startedAt: '2026-01-05T09:30:00.000Z',
        endedAt: '2026-01-05T10:30:00.000Z',
      })
      .expect(409);

    await request(server)
      .post(`/v1/workspaces/${workspaceId}/time-entries`)
      .set('Authorization', auth(memberToken))
      .send({
        projectId,
        startedAt: '2026-01-05T10:00:00.000Z',
        endedAt: '2026-01-05T09:00:00.000Z',
      })
      .expect(400);

    await request(server)
      .post(`/v1/workspaces/${workspaceId}/time-entries`)
      .set('Authorization', auth(memberToken))
      .send({
        projectId,
        taskId: secondTaskId,
        startedAt: '2026-01-06T09:00:00.000Z',
        endedAt: '2026-01-06T10:00:00.000Z',
      })
      .expect(404);
  });

  it('prevents owners and managers from tracking time', async () => {
    await request(server)
      .post(`/v1/workspaces/${workspaceId}/time-entries`)
      .set('Authorization', auth(ownerToken))
      .send({
        projectId,
        startedAt: '2026-01-08T09:00:00.000Z',
        endedAt: '2026-01-08T10:00:00.000Z',
      })
      .expect(403);

    await request(server)
      .post(`/v1/workspaces/${workspaceId}/time-entries/start`)
      .set('Authorization', auth(ownerToken))
      .send({ projectId })
      .expect(403);

    await request(server)
      .patch(`/v1/workspaces/${workspaceId}/time-entries/${manualEntryId}`)
      .set('Authorization', auth(ownerToken))
      .send({ description: 'Owner edit' })
      .expect(403);

    await request(server)
      .delete(`/v1/workspaces/${workspaceId}/time-entries/${manualEntryId}`)
      .set('Authorization', auth(ownerToken))
      .expect(403);
  });

  it('lists entries with role-based scoping, filters, and pagination', async () => {
    const own = await request(server)
      .get(`/v1/workspaces/${workspaceId}/time-entries`)
      .set('Authorization', auth(memberToken))
      .expect(200);
    expect(own.body.total).toBe(2);
    expect(own.body.items.every((entry: { userId: string }) => entry.userId === memberId)).toBe(
      true,
    );

    const filtered = await request(server)
      .get(
        `/v1/workspaces/${workspaceId}/time-entries?from=2026-01-05T00:00:00.000Z&to=2026-01-06T00:00:00.000Z`,
      )
      .set('Authorization', auth(memberToken))
      .expect(200);
    expect(filtered.body.total).toBe(1);
    expect(filtered.body.items[0].id).toBe(manualEntryId);

    const ownerView = await request(server)
      .get(`/v1/workspaces/${workspaceId}/time-entries?userId=${memberId}`)
      .set('Authorization', auth(ownerToken))
      .expect(200);
    expect(ownerView.body.total).toBe(2);

    const forcedScope = await request(server)
      .get(`/v1/workspaces/${workspaceId}/time-entries?userId=${ownerId}`)
      .set('Authorization', auth(memberToken))
      .expect(200);
    expect(forcedScope.body.total).toBe(2);
    expect(
      forcedScope.body.items.every((entry: { userId: string }) => entry.userId === memberId),
    ).toBe(true);

    const paginated = await request(server)
      .get(`/v1/workspaces/${workspaceId}/time-entries?limit=1`)
      .set('Authorization', auth(memberToken))
      .expect(200);
    expect(paginated.body.total).toBe(2);
    expect(paginated.body.items).toHaveLength(1);

    await request(server)
      .get(`/v1/workspaces/${workspaceId}/time-entries?limit=101`)
      .set('Authorization', auth(memberToken))
      .expect(400);

    await request(server)
      .get(`/v1/workspaces/${workspaceId}/time-entries`)
      .set('Authorization', auth(outsiderToken))
      .expect(404);
  });

  it('reports time grouped by project, task, and user with role scoping', async () => {
    const from = '2026-01-05T00:00:00.000Z';
    const to = '2026-01-06T00:00:00.000Z';

    const byProject = await request(server)
      .get(`/v1/workspaces/${workspaceId}/reports/time?from=${from}&to=${to}&groupBy=project`)
      .set('Authorization', auth(memberToken))
      .expect(200);
    expect(byProject.body.totalSeconds).toBe(3600);
    expect(byProject.body.groups).toHaveLength(1);
    expect(byProject.body.groups[0]).toMatchObject({
      key: projectId,
      label: 'Website',
      seconds: 3600,
      entryCount: 1,
    });

    const byTask = await request(server)
      .get(`/v1/workspaces/${workspaceId}/reports/time?from=${from}&to=${to}&groupBy=task`)
      .set('Authorization', auth(memberToken))
      .expect(200);
    expect(byTask.body.groups[0].label).toBe('Build navigation');

    const ownerView = await request(server)
      .get(
        `/v1/workspaces/${workspaceId}/reports/time?from=${from}&to=${to}&groupBy=user&userId=${memberId}`,
      )
      .set('Authorization', auth(ownerToken))
      .expect(200);
    expect(ownerView.body.totalSeconds).toBe(3600);
    expect(ownerView.body.groups[0].key).toBe(memberId);

    const forcedScope = await request(server)
      .get(
        `/v1/workspaces/${workspaceId}/reports/time?from=${from}&to=${to}&groupBy=user&userId=${ownerId}`,
      )
      .set('Authorization', auth(memberToken))
      .expect(200);
    expect(forcedScope.body.groups[0].key).toBe(memberId);

    await request(server)
      .get(`/v1/workspaces/${workspaceId}/reports/time?from=${from}&to=${to}`)
      .set('Authorization', auth(outsiderToken))
      .expect(404);
  });

  it('reports daily time per member', async () => {
    const from = '2026-01-05T00:00:00.000Z';
    const to = '2026-01-07T00:00:00.000Z';

    const memberView = await request(server)
      .get(`/v1/workspaces/${workspaceId}/reports/time/daily?from=${from}&to=${to}`)
      .set('Authorization', auth(memberToken))
      .expect(200);

    expect(memberView.body.dates).toEqual(['2026-01-05', '2026-01-06']);
    expect(memberView.body.members).toHaveLength(1);
    expect(memberView.body.members[0].userId).toBe(memberId);

    const januaryFifth = memberView.body.members[0].days.find(
      (day: { date: string }) => day.date === '2026-01-05',
    );
    expect(januaryFifth.seconds).toBe(3600);
    expect(memberView.body.totalSeconds).toBe(3600);

    const ownerView = await request(server)
      .get(`/v1/workspaces/${workspaceId}/reports/time/daily?from=${from}&to=${to}`)
      .set('Authorization', auth(ownerToken))
      .expect(200);
    expect(ownerView.body.members).toHaveLength(1);
    expect(ownerView.body.members[0].userId).toBe(memberId);

    await request(server)
      .get(`/v1/workspaces/${workspaceId}/reports/time/daily?from=${from}&to=${to}`)
      .set('Authorization', auth(outsiderToken))
      .expect(404);
  });

  it('builds and submits weekly timesheets', async () => {
    const draft = await request(server)
      .get(`/v1/workspaces/${workspaceId}/timesheets/me?weekStart=2026-01-07`)
      .set('Authorization', auth(memberToken))
      .expect(200);

    expect(draft.body.periodStart).toBe('2026-01-05');
    expect(draft.body.periodEnd).toBe('2026-01-12');
    expect(draft.body.status).toBe('draft');
    expect(draft.body.totalSeconds).toBe(3600);
    expect(draft.body.entryCount).toBe(1);
    expect(draft.body.projects[0]).toMatchObject({ projectId, seconds: 3600 });
    expect(draft.body.tasks[0]).toMatchObject({
      taskId,
      taskTitle: 'Build navigation',
      projectId,
      projectName: 'Website',
      seconds: 3600,
    });
    expect(draft.body.days).toHaveLength(7);
    expect(draft.body.days[0]).toMatchObject({
      date: '2026-01-05',
      seconds: 3600,
      entryCount: 1,
    });
    expect(draft.body.days.slice(1).every((day: { seconds: number }) => day.seconds === 0)).toBe(
      true,
    );

    const submitted = await request(server)
      .post(`/v1/workspaces/${workspaceId}/timesheets/submit?weekStart=2026-01-05`)
      .set('Authorization', auth(memberToken))
      .expect(201);

    expect(submitted.body.status).toBe('submitted');
    expect(submitted.body.submittedAt).toEqual(expect.any(String));
    timesheetId = submitted.body.id;

    const me = await request(server)
      .get(`/v1/workspaces/${workspaceId}/timesheets/me?weekStart=2026-01-05`)
      .set('Authorization', auth(memberToken))
      .expect(200);
    expect(me.body.status).toBe('submitted');
    expect(me.body.id).toBe(timesheetId);

    const list = await request(server)
      .get(`/v1/workspaces/${workspaceId}/timesheets?weekStart=2026-01-05`)
      .set('Authorization', auth(ownerToken))
      .expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].userId).toBe(memberId);

    await request(server)
      .post(`/v1/workspaces/${workspaceId}/timesheets/${timesheetId}/approve`)
      .set('Authorization', auth(memberToken))
      .expect(403);
  });

  it('lets a member withdraw a submitted timesheet and unlock the week', async () => {
    const withdrawn = await request(server)
      .post(`/v1/workspaces/${workspaceId}/timesheets/${timesheetId}/withdraw`)
      .set('Authorization', auth(memberToken))
      .expect(200);

    expect(withdrawn.body.status).toBe('draft');
    expect(withdrawn.body.submittedAt).toBeNull();

    // The week is editable again while the timesheet is a draft.
    const updated = await request(server)
      .patch(`/v1/workspaces/${workspaceId}/time-entries/${manualEntryId}`)
      .set('Authorization', auth(memberToken))
      .send({ description: 'Sprint planning (draft edit)' })
      .expect(200);
    expect(updated.body.description).toBe('Sprint planning (draft edit)');

    const resubmitted = await request(server)
      .post(`/v1/workspaces/${workspaceId}/timesheets/submit?weekStart=2026-01-05`)
      .set('Authorization', auth(memberToken))
      .expect(201);
    expect(resubmitted.body.status).toBe('submitted');
  });

  it('lets a manager approve a submitted timesheet and locks resubmission', async () => {
    const approved = await request(server)
      .post(`/v1/workspaces/${workspaceId}/timesheets/${timesheetId}/approve`)
      .set('Authorization', auth(ownerToken))
      .expect(200);

    expect(approved.body.status).toBe('approved');
    expect(approved.body.approvedBy).toBe(ownerId);
    expect(approved.body.approvedAt).toEqual(expect.any(String));

    await request(server)
      .post(`/v1/workspaces/${workspaceId}/timesheets/${timesheetId}/withdraw`)
      .set('Authorization', auth(memberToken))
      .expect(409);

    await request(server)
      .post(`/v1/workspaces/${workspaceId}/timesheets/${timesheetId}/withdraw`)
      .set('Authorization', auth(outsiderToken))
      .expect(404);

    await request(server)
      .post(`/v1/workspaces/${workspaceId}/timesheets/submit?weekStart=2026-01-05`)
      .set('Authorization', auth(memberToken))
      .expect(409);

    await request(server)
      .post(`/v1/workspaces/${workspaceId}/timesheets/3f4b2c1a-9d8e-4f7a-b6c5-d4e3f2a1b0c9/approve`)
      .set('Authorization', auth(ownerToken))
      .expect(404);

    await request(server)
      .get(`/v1/workspaces/${workspaceId}/timesheets?weekStart=2026-01-05`)
      .set('Authorization', auth(outsiderToken))
      .expect(404);
  });

  it('updates and soft-deletes entries outside locked weeks', async () => {
    const editable = await request(server)
      .post(`/v1/workspaces/${workspaceId}/time-entries`)
      .set('Authorization', auth(memberToken))
      .send({
        projectId,
        description: 'February work',
        startedAt: '2026-02-02T09:00:00.000Z',
        endedAt: '2026-02-02T10:00:00.000Z',
      })
      .expect(201);

    const updated = await request(server)
      .patch(`/v1/workspaces/${workspaceId}/time-entries/${editable.body.id}`)
      .set('Authorization', auth(memberToken))
      .send({ description: 'February work (updated)' })
      .expect(200);

    expect(updated.body.description).toBe('February work (updated)');
    expect(updated.body.updatedBy).toBe(memberId);

    const temp = await request(server)
      .post(`/v1/workspaces/${workspaceId}/time-entries`)
      .set('Authorization', auth(memberToken))
      .send({
        projectId,
        startedAt: '2026-02-03T09:00:00.000Z',
        endedAt: '2026-02-03T10:00:00.000Z',
      })
      .expect(201);

    await request(server)
      .delete(`/v1/workspaces/${workspaceId}/time-entries/${temp.body.id}`)
      .set('Authorization', auth(memberToken))
      .expect(204);

    await request(server)
      .get(`/v1/workspaces/${workspaceId}/time-entries/${temp.body.id}`)
      .set('Authorization', auth(memberToken))
      .expect(404);

    // The approved January week is frozen.
    await request(server)
      .patch(`/v1/workspaces/${workspaceId}/time-entries/${manualEntryId}`)
      .set('Authorization', auth(memberToken))
      .send({ description: 'Should not change' })
      .expect(409);

    await request(server)
      .delete(`/v1/workspaces/${workspaceId}/time-entries/${manualEntryId}`)
      .set('Authorization', auth(memberToken))
      .expect(409);

    await request(server)
      .post(`/v1/workspaces/${workspaceId}/time-entries`)
      .set('Authorization', auth(memberToken))
      .send({
        projectId,
        startedAt: '2026-01-05T11:00:00.000Z',
        endedAt: '2026-01-05T12:00:00.000Z',
      })
      .expect(409);

    await request(server)
      .delete(`/v1/workspaces/${workspaceId}/time-entries/${manualEntryId}`)
      .set('Authorization', auth(outsiderToken))
      .expect(404);

    const remaining = await request(server)
      .get(`/v1/workspaces/${workspaceId}/time-entries`)
      .set('Authorization', auth(memberToken))
      .expect(200);
    expect(remaining.body.total).toBe(3);
  });
});
