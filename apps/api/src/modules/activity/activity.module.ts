import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DevicesModule } from '../devices/devices.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ActivityController } from './activity.controller';
import { ActivityReportController } from './activity-report.controller';
import { ActivityRetentionService } from './activity-retention.service';
import { ActivityService } from './activity.service';
import { ActivitySampleEntity } from './entities/activity-sample.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActivitySampleEntity]), DevicesModule, WorkspacesModule],
  controllers: [ActivityController, ActivityReportController],
  providers: [ActivityService, ActivityRetentionService],
  exports: [ActivityService],
})
export class ActivityModule {}
