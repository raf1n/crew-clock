import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { TimeEntriesModule } from '../time-entries/time-entries.module';
import { UsersModule } from '../users/users.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AgentController } from './agent.controller';
import { DeviceEntity } from './entities/device.entity';
import { DeviceAuthGuard } from './guards/device-auth.guard';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceEntity]),
    WorkspacesModule,
    TimeEntriesModule,
    ProjectsModule,
    TasksModule,
    UsersModule,
  ],
  controllers: [DevicesController, AgentController],
  providers: [DevicesService, DeviceAuthGuard],
  exports: [DevicesService, DeviceAuthGuard],
})
export class DevicesModule {}
