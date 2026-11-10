import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  timesheetQuerySchema,
  type TimesheetQuery,
  type TimesheetSummary,
} from '@crewclock/shared';

import type { AuthenticatedUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { WorkspaceRoles } from '../workspaces/decorators/workspace-roles.decorator';
import { WorkspaceRolesGuard } from '../workspaces/guards/workspace-roles.guard';
import { TimesheetsService } from './timesheets.service';

@Controller('workspaces/:workspaceId/timesheets')
export class TimesheetsController {
  constructor(private readonly timesheets: TimesheetsService) {}

  @Get()
  list(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query(new ZodValidationPipe(timesheetQuerySchema)) query: TimesheetQuery,
  ): Promise<TimesheetSummary[]> {
    return this.timesheets.list(current.userId, workspaceId, query);
  }

  @Get('me')
  me(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query(new ZodValidationPipe(timesheetQuerySchema)) query: TimesheetQuery,
  ): Promise<TimesheetSummary> {
    return this.timesheets.getMe(current.userId, workspaceId, query);
  }

  @Post('submit')
  submit(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query(new ZodValidationPipe(timesheetQuerySchema)) query: TimesheetQuery,
  ): Promise<TimesheetSummary> {
    return this.timesheets.submit(current.userId, workspaceId, query);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':timesheetId/withdraw')
  withdraw(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('timesheetId', ParseUUIDPipe) timesheetId: string,
  ): Promise<TimesheetSummary> {
    return this.timesheets.withdraw(current.userId, workspaceId, timesheetId);
  }

  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  @Post(':timesheetId/approve')
  approve(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('timesheetId', ParseUUIDPipe) timesheetId: string,
  ): Promise<TimesheetSummary> {
    return this.timesheets.approve(current.userId, workspaceId, timesheetId);
  }
}
