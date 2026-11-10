import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TimeEntryEntity } from '../time-entries/entities/time-entry.entity';
import { UsersModule } from '../users/users.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { TimesheetEntity } from './entities/timesheet.entity';
import { TimesheetsController } from './timesheets.controller';
import { TimesheetsService } from './timesheets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimesheetEntity, TimeEntryEntity]),
    WorkspacesModule,
    UsersModule,
  ],
  controllers: [TimesheetsController],
  providers: [TimesheetsService],
})
export class TimesheetsModule {}
