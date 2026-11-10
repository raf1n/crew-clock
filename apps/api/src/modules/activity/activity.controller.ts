import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  activityBatchSchema,
  type ActivityBatchInput,
  type ActivityIngestResult,
} from '@crewclock/shared';

import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentDevice } from '../devices/decorators/current-device.decorator';
import { DeviceAuthGuard } from '../devices/guards/device-auth.guard';
import type { AuthenticatedDevice } from '../devices/types/authenticated-device';
import { ActivityService } from './activity.service';

@Public()
@UseGuards(DeviceAuthGuard)
@Controller('agent/activity-samples')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Post()
  ingest(
    @CurrentDevice() device: AuthenticatedDevice,
    @Body(new ZodValidationPipe(activityBatchSchema)) input: ActivityBatchInput,
  ): Promise<ActivityIngestResult> {
    return this.activity.ingest(device, input);
  }
}
