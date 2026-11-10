import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';

import { createTestApp } from './test-app';

describe('workspace invitations (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  let ownerToken = '';
  let workspaceId = '';
  let managerToken = '';
  let memberToken = '';

  let invitationToken = '';

  const auth = (token: string): string => `Bearer ${token}`;

  beforeAll(async () => {
    const context = await createTestApp();
    app = context.app;
    server = context.server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets up an owner and a manager', async () => {
    const owner = await request(server)
      .post('/v1/auth/register')
      .send({
        email: 'owner@invite.test',
        password: 'correct horse battery',
        name: 'Olivia Owner',
        workspaceName: 'Invite Co',
      })
      .expect(201);
    ownerToken = owner.body.accessToken;

    const workspaces = await request(server)
      .get('/v1/workspaces')
      .set('Authorization', auth(ownerToken))
      .expect(200);
    workspaceId = workspaces.body[0].id;

    const manager = await request(server)
      .post('/v1/auth/register')
      .send({
        email: 'manager@invite.test',
        password: 'correct horse battery',
        name: 'Mia Manager',
        workspaceName: 'Manager Co',
      })
      .expect(201);
    managerToken = manager.body.accessToken;

    await request(server)
      .post(`/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', auth(ownerToken))
      .send({ email: 'manager@invite.test', role: 'manager' })
      .expect(201);
  });

  it('invites a new email and exposes a public preview', async () => {
    const invited = await request(server)
      .post(`/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', auth(ownerToken))
      .send({ email: 'newbie@invite.test', role: 'member' })
      .expect(201);

    invitationToken = invited.body.token;
    expect(invitationToken).toEqual(expect.any(String));
    expect(invited.body.invitation.email).toBe('newbie@invite.test');
    expect(invited.body.invitation.role).toBe('member');

    const preview = await request(server).get(`/v1/invitations/${invitationToken}`).expect(200);
    expect(preview.body).toMatchObject({
      workspaceId,
      workspaceName: 'Invite Co',
      email: 'newbie@invite.test',
      role: 'member',
    });

    const pending = await request(server)
      .get(`/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', auth(ownerToken))
      .expect(200);
    expect(
      pending.body.some((item: { email: string }) => item.email === 'newbie@invite.test'),
    ).toBe(true);
  });

  it('lets the invited user accept and join the workspace', async () => {
    const newbie = await request(server)
      .post('/v1/auth/register')
      .send({
        email: 'newbie@invite.test',
        password: 'correct horse battery',
        name: 'Noah Newbie',
        workspaceName: 'Newbie Co',
      })
      .expect(201);
    memberToken = newbie.body.accessToken;

    const accepted = await request(server)
      .post(`/v1/invitations/${invitationToken}/accept`)
      .set('Authorization', auth(memberToken))
      .expect(200);

    expect(accepted.body.id).toBe(workspaceId);
    expect(accepted.body.role).toBe('member');

    const workspaces = await request(server)
      .get('/v1/workspaces')
      .set('Authorization', auth(memberToken))
      .expect(200);
    expect(workspaces.body.some((workspace: { id: string }) => workspace.id === workspaceId)).toBe(
      true,
    );

    await request(server)
      .post(`/v1/invitations/${invitationToken}/accept`)
      .set('Authorization', auth(memberToken))
      .expect(409);
  });

  it('does not invite an existing member', async () => {
    await request(server)
      .post(`/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', auth(ownerToken))
      .send({ email: 'newbie@invite.test', role: 'member' })
      .expect(409);
  });

  it('limits managers to member invitations', async () => {
    await request(server)
      .post(`/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', auth(managerToken))
      .send({ email: 'other@invite.test', role: 'manager' })
      .expect(403);

    await request(server)
      .post(`/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', auth(managerToken))
      .send({ email: 'other@invite.test', role: 'member' })
      .expect(201);

    await request(server)
      .get(`/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', auth(managerToken))
      .expect(200);

    await request(server)
      .get(`/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', auth(memberToken))
      .expect(403);
  });

  it('registers a brand-new invitee and joins in one step', async () => {
    const invited = await request(server)
      .post(`/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', auth(ownerToken))
      .send({ email: 'direct@invite.test', role: 'member' })
      .expect(201);

    const signup = await request(server)
      .post('/v1/auth/accept-invite')
      .send({
        token: invited.body.token,
        name: 'Dana Direct',
        password: 'correct horse battery',
      })
      .expect(201);

    expect(signup.body.user.email).toBe('direct@invite.test');
    expect(signup.body.accessToken).toEqual(expect.any(String));

    const workspaces = await request(server)
      .get('/v1/workspaces')
      .set('Authorization', auth(signup.body.accessToken))
      .expect(200);
    expect(workspaces.body.some((workspace: { id: string }) => workspace.id === workspaceId)).toBe(
      true,
    );

    await request(server)
      .post('/v1/auth/accept-invite')
      .send({
        token: invited.body.token,
        name: 'Dana Direct',
        password: 'correct horse battery',
      })
      .expect(404);
  });

  it('does not create a duplicate account for an existing invited user', async () => {
    const invited = await request(server)
      .post(`/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', auth(ownerToken))
      .send({ email: 'existing@invite.test', role: 'member' })
      .expect(201);

    await request(server)
      .post('/v1/auth/register')
      .send({
        email: 'existing@invite.test',
        password: 'correct horse battery',
        name: 'Existing User',
        workspaceName: 'Existing Co',
      })
      .expect(201);

    await request(server)
      .post('/v1/auth/accept-invite')
      .send({
        token: invited.body.token,
        name: 'Existing User',
        password: 'correct horse battery',
      })
      .expect(409);
  });

  it('cancels invitations and allows re-inviting the same email', async () => {
    const invited = await request(server)
      .post(`/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', auth(ownerToken))
      .send({ email: 'cancel@invite.test', role: 'member' })
      .expect(201);

    await request(server)
      .delete(`/v1/workspaces/${workspaceId}/invitations/${invited.body.invitation.id}`)
      .set('Authorization', auth(ownerToken))
      .expect(204);

    await request(server).get(`/v1/invitations/${invited.body.token}`).expect(404);

    await request(server)
      .post(`/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', auth(ownerToken))
      .send({ email: 'cancel@invite.test', role: 'member' })
      .expect(201);
  });
});
