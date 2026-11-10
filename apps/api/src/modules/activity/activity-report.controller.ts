import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  activityReportQuerySchema,
  type ActivityReport,
  type ActivityReportQuery,
} from '@crewclock/shared';

import type { AuthenticatedUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ActivityService } from './activity.service';

@Controller('workspaces/:workspaceId/activity')
export class ActivityReportController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  report(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query(new ZodValidationPipe(activityReportQuerySchema)) query: ActivityReportQuery,
  ): Promise<ActivityReport> {
    return this.activity.report(current.userId, workspaceId, query);
  }
}
