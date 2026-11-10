import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';

import { createTestApp } from './test-app';

describe('projects and tasks (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  let ownerToken = '';
  let ownerId = '';
  let ownerWorkspaceId = '';

  let memberToken = '';
  let memberId = '';

  let managerToken = '';

  let outsiderToken = '';
  let outsiderId = '';

  let projectId = '';
  let secondProjectId = '';
  let taskId = '';

  const auth = (token: string): string => `Bearer ${token}`;

  beforeAll(async () => {
    const context = await createTestApp();
    app = context.app;
    server = context.server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets up an owner, an invited member, and an outsider', async () => {
    const owner = await request(server)
      .post('/v1/auth/register')
      .send({
        email: 'alice@acme.test',
        password: 'correct horse battery',
        name: 'Alice',
        workspaceName: 'Acme',
      })
      .expect(201);

    ownerToken = owner.body.accessToken;
    ownerId = owner.body.user.id;
    const workspaces = await request(server)
      .get('/v1/workspaces')
      .set('Authorization', auth(ownerToken))
      .expect(200);
    ownerWorkspaceId = workspaces.body[0].id;

    const member = await request(server)
      .post('/v1/auth/register')
      .send({
        email: 'bob@acme.test',
        password: 'correct horse battery',
        name: 'Bob',
        workspaceName: 'Bob Co',
      })
      .expect(201);
    memberToken = member.body.accessToken;
    memberId = member.body.user.id;

    await request(server)
      .post(`/v1/workspaces/${ownerWorkspaceId}/members`)
      .set('Authorization', auth(ownerToken))
      .send({ email: 'bob@acme.test', role: 'member' })
      .expect(201);

    const manager = await request(server)
      .post('/v1/auth/register')
      .send({
        email: 'dave@acme.test',
        password: 'correct horse battery',
        name: 'Dave',
        workspaceName: 'Dave Co',
      })
      .expect(201);
    managerToken = manager.body.accessToken;

    await request(server)
      .post(`/v1/workspaces/${ownerWorkspaceId}/members`)
      .set('Authorization', auth(ownerToken))
      .send({ email: 'dave@acme.test', role: 'manager' })
      .expect(201);

    const outsider = await request(server)
      .post('/v1/auth/register')
      .send({
        email: 'carol@other.test',
        password: 'correct horse battery',
        name: 'Carol',
        workspaceName: 'Other Co',
      })
      .expect(201);
    outsiderToken = outsider.body.accessToken;
    outsiderId = outsider.body.user.id;
  });

  it('limits managers to adding members', async () => {
    await request(server)
      .post(`/v1/workspaces/${ownerWorkspaceId}/members`)
      .set('Authorization', auth(managerToken))
      .send({ email: 'bob@acme.test', role: 'manager' })
      .expect(403);

    await request(server)
      .post(`/v1/workspaces/${ownerWorkspaceId}/members`)
      .set('Authorization', auth(managerToken))
      .send({ email: 'alice@acme.test', role: 'member' })
      .expect(403);

    await request(server)
      .post(`/v1/workspaces/${ownerWorkspaceId}/members`)
      .set('Authorization', auth(managerToken))
      .send({ email: 'bob@acme.test', role: 'member' })
      .expect(201);
  });

  it('lets an owner create projects', async () => {
    const project = await request(server)
      .post(`/v1/workspaces/${ownerWorkspaceId}/projects`)
      .set('Authorization', auth(ownerToken))
      .send({ name: 'Website redesign', description: 'Marketing site' })
      .expect(201);

    expect(project.body.workspaceId).toBe(ownerWorkspaceId);
    expect(project.body.name).toBe('Website redesign');
    expect(project.body.description).toBe('Marketing site');
    expect(project.body.createdBy).toBe(ownerId);
    expect(project.body.updatedBy).toBe(ownerId);
    projectId = project.body.id;

    const second = await request(server)
      .post(`/v1/workspaces/${ownerWorkspaceId}/projects`)
      .set('Authorization', auth(ownerToken))
      .send({ name: 'Mobile app' })
      .expect(201);
    secondProjectId = second.body.id;
  });

  it('paginates projects for members', async () => {
    const firstPage = await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects?page=1&limit=1`)
      .set('Authorization', auth(memberToken))
      .expect(200);

    expect(firstPage.body.total).toBe(2);
    expect(firstPage.body.items).toHaveLength(1);

    const secondPage = await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects?page=2&limit=1`)
      .set('Authorization', auth(memberToken))
      .expect(200);

    expect(secondPage.body.items).toHaveLength(1);
    expect(secondPage.body.items[0].id).not.toBe(firstPage.body.items[0].id);

    await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects?limit=101`)
      .set('Authorization', auth(memberToken))
      .expect(400);
  });

  it('lets members read but not create projects', async () => {
    await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}`)
      .set('Authorization', auth(memberToken))
      .expect(200);

    await request(server)
      .post(`/v1/workspaces/${ownerWorkspaceId}/projects`)
      .set('Authorization', auth(memberToken))
      .send({ name: 'Member project' })
      .expect(403);
  });

  it('hides projects from non-members', async () => {
    await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects`)
      .set('Authorization', auth(outsiderToken))
      .expect(404);

    await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}`)
      .set('Authorization', auth(outsiderToken))
      .expect(404);
  });

  it('creates tasks assigned to workspace members', async () => {
    const task = await request(server)
      .post(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks`)
      .set('Authorization', auth(ownerToken))
      .send({ title: 'Build navigation', description: 'Desktop nav', assigneeId: memberId })
      .expect(201);

    expect(task.body.status).toBe('todo');
    expect(task.body.assigneeId).toBe(memberId);
    expect(task.body.createdBy).toBe(ownerId);
    expect(task.body.updatedBy).toBe(ownerId);
    taskId = task.body.id;

    await request(server)
      .post(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks`)
      .set('Authorization', auth(ownerToken))
      .send({ title: 'Not a member', assigneeId: outsiderId })
      .expect(400);
  });

  it('lets members update the status of their assigned tasks only', async () => {
    const updated = await request(server)
      .patch(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', auth(memberToken))
      .send({ status: 'in_progress' })
      .expect(200);
    expect(updated.body.status).toBe('in_progress');

    await request(server)
      .patch(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', auth(memberToken))
      .send({ title: 'Renamed by member' })
      .expect(403);

    const unassigned = await request(server)
      .post(`/v1/workspaces/${ownerWorkspaceId}/projects/${secondProjectId}/tasks`)
      .set('Authorization', auth(ownerToken))
      .send({ title: 'Unassigned task' })
      .expect(201);

    await request(server)
      .patch(
        `/v1/workspaces/${ownerWorkspaceId}/projects/${secondProjectId}/tasks/${unassigned.body.id}`,
      )
      .set('Authorization', auth(memberToken))
      .send({ status: 'done' })
      .expect(403);

    await request(server)
      .patch(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', auth(memberToken))
      .send({ status: 'todo' })
      .expect(200);
  });

  it('rejects assigning a task to a non-member on update', async () => {
    await request(server)
      .patch(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', auth(ownerToken))
      .send({ assigneeId: outsiderId })
      .expect(400);
  });

  it('lets members list tasks with filters', async () => {
    const todo = await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks?status=todo`)
      .set('Authorization', auth(memberToken))
      .expect(200);
    expect(todo.body.total).toBe(1);

    const done = await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks?status=done`)
      .set('Authorization', auth(memberToken))
      .expect(200);
    expect(done.body.total).toBe(0);

    const assigned = await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks?assigneeId=${memberId}`)
      .set('Authorization', auth(memberToken))
      .expect(200);
    expect(assigned.body.total).toBe(1);

    await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks?limit=101`)
      .set('Authorization', auth(memberToken))
      .expect(400);
  });

  it('does not let members manage tasks', async () => {
    await request(server)
      .post(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks`)
      .set('Authorization', auth(memberToken))
      .send({ title: 'Member task' })
      .expect(403);

    await request(server)
      .patch(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', auth(memberToken))
      .send({ title: 'Member rename' })
      .expect(403);

    await request(server)
      .delete(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', auth(memberToken))
      .expect(403);
  });

  it('lets an owner update and unassign a task', async () => {
    const updated = await request(server)
      .patch(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', auth(ownerToken))
      .send({ status: 'done', assigneeId: null })
      .expect(200);

    expect(updated.body.status).toBe('done');
    expect(updated.body.assigneeId).toBeNull();
    expect(updated.body.updatedBy).toBe(ownerId);

    await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', auth(memberToken))
      .expect(200);
  });

  it('does not expose tasks to non-members', async () => {
    await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', auth(outsiderToken))
      .expect(404);
  });

  it('soft-deletes tasks', async () => {
    await request(server)
      .delete(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', auth(ownerToken))
      .expect(204);

    await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', auth(ownerToken))
      .expect(404);

    const tasks = await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks`)
      .set('Authorization', auth(ownerToken))
      .expect(200);
    expect(tasks.body.total).toBe(0);
  });

  it('soft-deletes a project and its tasks', async () => {
    await request(server)
      .delete(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}`)
      .set('Authorization', auth(ownerToken))
      .expect(204);

    await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}`)
      .set('Authorization', auth(ownerToken))
      .expect(404);

    await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects/${projectId}/tasks`)
      .set('Authorization', auth(ownerToken))
      .expect(404);

    const projects = await request(server)
      .get(`/v1/workspaces/${ownerWorkspaceId}/projects`)
      .set('Authorization', auth(ownerToken))
      .expect(200);
    expect(projects.body.total).toBe(1);
    expect(projects.body.items[0].id).toBe(secondProjectId);
  });

  it('does not let the last owner demote themselves', async () => {
    await request(server)
      .post(`/v1/workspaces/${ownerWorkspaceId}/members`)
      .set('Authorization', auth(ownerToken))
      .send({ email: 'alice@acme.test', role: 'member' })
      .expect(409);
  });
});
