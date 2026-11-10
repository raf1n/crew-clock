import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createTimeEntrySchema,
  heartbeatTimezoneSchema,
  type CreateTimeEntryInput,
  type HeartbeatTimezoneInput,
  type Project,
  type Task,
  type TimeEntry,
} from '@crewclock/shared';

import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { TimeEntriesService } from '../time-entries/time-entries.service';
import { UsersService } from '../users/users.service';
import { CurrentDevice } from './decorators/current-device.decorator';
import { DeviceAuthGuard } from './guards/device-auth.guard';
import type { AuthenticatedDevice } from './types/authenticated-device';

@Public()
@UseGuards(DeviceAuthGuard)
@Controller('agent')
export class AgentController {
  constructor(
    private readonly timeEntries: TimeEntriesService,
    private readonly projects: ProjectsService,
    private readonly tasks: TasksService,
    private readonly users: UsersService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('heartbeat')
  async heartbeat(
    @CurrentDevice() device: AuthenticatedDevice,
    @Body(new ZodValidationPipe(heartbeatTimezoneSchema)) input: HeartbeatTimezoneInput,
  ): Promise<AuthenticatedDevice> {
    if (input?.timezone) {
      await this.users.setTimezone(device.userId, input.timezone);
    }
    return device;
  }

  @Get('projects')
  async listProjects(@CurrentDevice() device: AuthenticatedDevice): Promise<Project[]> {
    const page = await this.projects.list(device.userId, device.workspaceId, {
      page: 1,
      limit: 100,
    });
    return page.items;
  }

  @Get('tasks')
  async listTasks(
    @CurrentDevice() device: AuthenticatedDevice,
    @Query('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<Task[]> {
    const page = await this.tasks.list(device.userId, device.workspaceId, projectId, {
      page: 1,
      limit: 100,
    });
    return page.items;
  }

  @Post('time-entries')
  createTimeEntry(
    @CurrentDevice() device: AuthenticatedDevice,
    @Body(new ZodValidationPipe(createTimeEntrySchema)) input: CreateTimeEntryInput,
  ): Promise<TimeEntry> {
    return this.timeEntries.create(device.userId, device.workspaceId, input);
  }
}
