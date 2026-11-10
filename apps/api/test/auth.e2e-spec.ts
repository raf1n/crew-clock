import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { DataSource } from 'typeorm';

import { createTestApp } from './test-app';

describe('auth and workspace scoping (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let dataSource: DataSource;

  let aliceAccessToken = '';
  let aliceRefreshToken = '';
  let aliceId = '';
  let workspaceId = '';

  let bobAccessToken = '';
  let bobId = '';

  beforeAll(async () => {
    const context = await createTestApp();
    app = context.app;
    server = context.server;
    dataSource = context.dataSource;
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a user with a workspace they own', async () => {
    const response = await request(server)
      .post('/v1/auth/register')
      .send({
        email: '  Alice@Example.COM ',
        password: 'correct horse battery',
        name: 'Alice',
        workspaceName: 'Acme',
      })
      .expect(201);

    expect(response.body.user.email).toBe('alice@example.com');
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));

    aliceAccessToken = response.body.accessToken;
    aliceRefreshToken = response.body.refreshToken;
    aliceId = response.body.user.id;

    const me = await request(server)
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${aliceAccessToken}`)
      .expect(200);
    expect(me.body.id).toBe(aliceId);

    const workspaces = await request(server)
      .get('/v1/workspaces')
      .set('Authorization', `Bearer ${aliceAccessToken}`)
      .expect(200);

    expect(workspaces.body).toHaveLength(1);
    expect(workspaces.body[0].role).toBe('owner');
    workspaceId = workspaces.body[0].id;
  });

  it('rejects a duplicate email', async () => {
    await request(server)
      .post('/v1/auth/register')
      .send({
        email: 'alice@example.com',
        password: 'correct horse battery',
        name: 'Alice Again',
        workspaceName: 'Another Co',
      })
      .expect(409);
  });

  it('registers a second user', async () => {
    const response = await request(server)
      .post('/v1/auth/register')
      .send({
        email: 'bob@example.com',
        password: 'another correct battery',
        name: 'Bob',
        workspaceName: 'Bob Co',
      })
      .expect(201);

    bobAccessToken = response.body.accessToken;
    bobId = response.body.user.id;
  });

  it('does not leak a workspace to non-members', async () => {
    await request(server)
      .get(`/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${bobAccessToken}`)
      .expect(404);
  });

  it('lets an owner add a member', async () => {
    const response = await request(server)
      .post(`/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${aliceAccessToken}`)
      .send({ email: 'bob@example.com', role: 'member' })
      .expect(201);

    expect(response.body.userId).toBe(bobId);
    expect(response.body.role).toBe('member');

    const workspaceAsBob = await request(server)
      .get(`/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${bobAccessToken}`)
      .expect(200);
    expect(workspaceAsBob.body.role).toBe('member');
  });

  it('does not let a member manage other members', async () => {
    await request(server)
      .post(`/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${bobAccessToken}`)
      .send({ email: 'alice@example.com', role: 'manager' })
      .expect(403);
  });

  it('rejects a wrong password and accepts the right one', async () => {
    await request(server)
      .post('/v1/auth/login')
      .send({ email: 'alice@example.com', password: 'wrong password' })
      .expect(401);

    const response = await request(server)
      .post('/v1/auth/login')
      .send({ email: 'alice@example.com', password: 'correct horse battery' })
      .expect(200);

    aliceAccessToken = response.body.accessToken;
    aliceRefreshToken = response.body.refreshToken;
  });

  it('rotates refresh tokens and tolerates duplicate use within the grace window', async () => {
    const rotated = await request(server)
      .post('/v1/auth/refresh')
      .send({ refreshToken: aliceRefreshToken })
      .expect(200);

    expect(rotated.body.refreshToken).not.toBe(aliceRefreshToken);
    expect(rotated.body.accessToken).toEqual(expect.any(String));

    await request(server)
      .post('/v1/auth/refresh')
      .send({ refreshToken: aliceRefreshToken })
      .expect(401);

    // A duplicate use within the grace window must not revoke the new token.
    const next = await request(server)
      .post('/v1/auth/refresh')
      .send({ refreshToken: rotated.body.refreshToken })
      .expect(200);
    expect(next.body.refreshToken).toEqual(expect.any(String));
  });

  it('revokes the chain when an old token is reused after the grace window', async () => {
    const login = await request(server)
      .post('/v1/auth/login')
      .send({ email: 'alice@example.com', password: 'correct horse battery' })
      .expect(200);

    const original = login.body.refreshToken as string;
    const rotated = await request(server)
      .post('/v1/auth/refresh')
      .send({ refreshToken: original })
      .expect(200);

    await dataSource.query(
      `UPDATE "refresh_tokens" SET "revoked_at" = now() - interval '1 minute'
       WHERE "revoked_at" IS NOT NULL AND "user_id" = (SELECT "id" FROM "users" WHERE "email" = $1)`,
      ['alice@example.com'],
    );

    await request(server).post('/v1/auth/refresh').send({ refreshToken: original }).expect(401);

    // Reuse after the grace window is treated as compromise.
    await request(server)
      .post('/v1/auth/refresh')
      .send({ refreshToken: rotated.body.refreshToken })
      .expect(401);
  });

  it('requires an access token on protected routes', async () => {
    await request(server).get('/v1/workspaces').expect(401);
    await request(server).get('/v1/health').expect(200);
  });

  it('supports httpOnly cookie refresh for browsers', async () => {
    const login = await request(server)
      .post('/v1/auth/login')
      .send({ email: 'alice@example.com', password: 'correct horse battery' })
      .expect(200);

    const setCookie = login.headers['set-cookie'] as unknown as string[] | undefined;
    expect(setCookie).toBeDefined();
    expect(setCookie?.[0]).toContain('HttpOnly');

    const cookie = setCookie?.[0]?.split(';')[0] ?? '';
    const refreshed = await request(server)
      .post('/v1/auth/refresh')
      .set('Cookie', cookie)
      .send({})
      .expect(200);

    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    expect(refreshed.body.refreshToken).toEqual(expect.any(String));
  });

  it('keeps the session when two refresh requests race', async () => {
    const login = await request(server)
      .post('/v1/auth/login')
      .send({ email: 'alice@example.com', password: 'correct horse battery' })
      .expect(200);

    const token = login.body.refreshToken as string;
    const [first, second] = await Promise.all([
      request(server).post('/v1/auth/refresh').send({ refreshToken: token }),
      request(server).post('/v1/auth/refresh').send({ refreshToken: token }),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 401]);

    const winner = first.status === 200 ? first : second;
    await request(server)
      .post('/v1/auth/refresh')
      .send({ refreshToken: winner.body.refreshToken })
      .expect(200);
  });
});
