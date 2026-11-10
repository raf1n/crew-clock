import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  createTimeEntrySchema,
  listTimeEntriesQuerySchema,
  startTimerSchema,
  updateTimeEntrySchema,
  type CreateTimeEntryInput,
  type ListTimeEntriesQuery,
  type Page,
  type StartTimerInput,
  type TimeEntry,
  type UpdateTimeEntryInput,
} from '@crewclock/shared';

import type { AuthenticatedUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TimeEntriesService } from './time-entries.service';

@Controller('workspaces/:workspaceId/time-entries')
export class TimeEntriesController {
  constructor(private readonly timeEntries: TimeEntriesService) {}

  @Get()
  list(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query(new ZodValidationPipe(listTimeEntriesQuerySchema)) query: ListTimeEntriesQuery,
  ): Promise<Page<TimeEntry>> {
    return this.timeEntries.list(current.userId, workspaceId, query);
  }

  @Get('running')
  running(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ): Promise<TimeEntry | null> {
    return this.timeEntries.running(current.userId, workspaceId);
  }

  @Get(':entryId')
  get(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ): Promise<TimeEntry> {
    return this.timeEntries.get(current.userId, workspaceId, entryId);
  }

  @Post()
  create(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body(new ZodValidationPipe(createTimeEntrySchema)) input: CreateTimeEntryInput,
  ): Promise<TimeEntry> {
    return this.timeEntries.create(current.userId, workspaceId, input);
  }

  @Post('start')
  start(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body(new ZodValidationPipe(startTimerSchema)) input: StartTimerInput,
  ): Promise<TimeEntry> {
    return this.timeEntries.startTimer(current.userId, workspaceId, input);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':entryId/stop')
  stop(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ): Promise<TimeEntry> {
    return this.timeEntries.stopTimer(current.userId, workspaceId, entryId);
  }

  @Patch(':entryId')
  update(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body(new ZodValidationPipe(updateTimeEntrySchema)) input: UpdateTimeEntryInput,
  ): Promise<TimeEntry> {
    return this.timeEntries.update(current.userId, workspaceId, entryId, input);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':entryId')
  async remove(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ): Promise<void> {
    await this.timeEntries.remove(current.userId, workspaceId, entryId);
  }
}
