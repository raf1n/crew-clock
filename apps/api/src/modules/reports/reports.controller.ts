import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  dailyReportQuerySchema,
  reportQuerySchema,
  type DailyReportQuery,
  type DailyTimeReport,
  type ReportQuery,
  type TimeReport,
} from '@crewclock/shared';

import type { AuthenticatedUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ReportsService } from './reports.service';

@Controller('workspaces/:workspaceId/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('time/daily')
  dailyReport(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query(new ZodValidationPipe(dailyReportQuerySchema)) query: DailyReportQuery,
  ): Promise<DailyTimeReport> {
    return this.reports.dailyReport(current.userId, workspaceId, query);
  }

  @Get('time')
  timeReport(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: ReportQuery,
  ): Promise<TimeReport> {
    return this.reports.timeReport(current.userId, workspaceId, query);
  }
}
