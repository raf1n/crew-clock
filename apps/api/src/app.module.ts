import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { validateEnv } from './config/env.validation';
import { buildDataSourceOptions } from './database/data-source-options';
import { AuthModule } from './modules/auth/auth.module';
import { DevicesModule } from './modules/devices/devices.module';
import { HealthModule } from './modules/health/health.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TimeEntriesModule } from './modules/time-entries/time-entries.module';
import { TimesheetsModule } from './modules/timesheets/timesheets.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [join(process.cwd(), '.env'), join(process.cwd(), '../../.env')],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...buildDataSourceOptions(config.getOrThrow<string>('DATABASE_URL')),
        autoLoadEntities: true,
      }),
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    HealthModule,
    UsersModule,
    WorkspacesModule,
    ProjectsModule,
    TasksModule,
    TimeEntriesModule,
    DevicesModule,
    TimesheetsModule,
    ReportsModule,
    AuthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
