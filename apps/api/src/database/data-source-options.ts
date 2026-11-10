import { join } from 'node:path';

import type { DataSourceOptions } from 'typeorm';

import { RefreshTokenEntity } from '../modules/auth/entities/refresh-token.entity';
import { ActivitySampleEntity } from '../modules/activity/entities/activity-sample.entity';
import { DeviceEntity } from '../modules/devices/entities/device.entity';
import { ProjectEntity } from '../modules/projects/entities/project.entity';
import { TaskEntity } from '../modules/tasks/entities/task.entity';
import { TimeEntryEntity } from '../modules/time-entries/entities/time-entry.entity';
import { TimesheetEntity } from '../modules/timesheets/entities/timesheet.entity';
import { UserEntity } from '../modules/users/entities/user.entity';
import { MemberEntity } from '../modules/workspaces/entities/member.entity';
import { WorkspaceEntity } from '../modules/workspaces/entities/workspace.entity';
import { WorkspaceInvitationEntity } from '../modules/workspaces/entities/workspace-invitation.entity';
import { SnakeNamingStrategy } from './snake-naming.strategy';

export function buildDataSourceOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    namingStrategy: new SnakeNamingStrategy(),
    entities: [
      UserEntity,
      WorkspaceEntity,
      MemberEntity,
      WorkspaceInvitationEntity,
      RefreshTokenEntity,
      DeviceEntity,
      ActivitySampleEntity,
      ProjectEntity,
      TaskEntity,
      TimeEntryEntity,
      TimesheetEntity,
    ],
    migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
    synchronize: false,
    logging: false,
  };
}
