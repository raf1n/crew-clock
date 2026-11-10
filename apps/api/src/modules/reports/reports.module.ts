import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TimeEntryEntity } from '../time-entries/entities/time-entry.entity';
import { UsersModule } from '../users/users.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([TimeEntryEntity]), WorkspacesModule, UsersModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
