import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import type { Server } from 'node:http';
import { Client } from 'pg';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { buildDataSourceOptions } from '../src/database/data-source-options';

export interface TestApp {
  app: INestApplication;
  server: Server;
  dataSource: DataSource;
}

async function ensureDatabaseExists(url: string): Promise<void> {
  const target = new URL(url);
  const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ''));
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      databaseName,
    ]);
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`);
    }
  } finally {
    await client.end();
  }
}

export async function createTestApp(): Promise<TestApp> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set for e2e tests');
  }

  await ensureDatabaseExists(databaseUrl);

  const migrationRunner = new DataSource(buildDataSourceOptions(databaseUrl));
  await migrationRunner.initialize();
  await migrationRunner.runMigrations();
  await migrationRunner.destroy();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  const dataSource = app.get<DataSource>(getDataSourceToken());
  await dataSource.query(
    'TRUNCATE TABLE "tasks", "projects", "refresh_tokens", "members", "workspaces", "users" RESTART IDENTITY CASCADE',
  );

  return { app, server: app.getHttpServer() as Server, dataSource };
}
