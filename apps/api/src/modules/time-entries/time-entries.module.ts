import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectsModule } from '../projects/projects.module';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TimesheetEntity } from '../timesheets/entities/timesheet.entity';
import { UsersModule } from '../users/users.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { TimeEntryEntity } from './entities/time-entry.entity';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntriesService } from './time-entries.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeEntryEntity, TaskEntity, TimesheetEntity]),
    ProjectsModule,
    WorkspacesModule,
    UsersModule,
  ],
  controllers: [TimeEntriesController],
  providers: [TimeEntriesService],
  exports: [TimeEntriesService],
})
export class TimeEntriesModule {}
