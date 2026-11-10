import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  createDeviceSchema,
  type CreateDeviceInput,
  type CreateDeviceResult,
  type Device,
} from '@crewclock/shared';

import type { AuthenticatedUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DevicesService } from './devices.service';

@Controller('workspaces/:workspaceId/devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  create(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body(new ZodValidationPipe(createDeviceSchema)) input: CreateDeviceInput,
  ): Promise<CreateDeviceResult> {
    return this.devices.create(current.userId, workspaceId, input);
  }

  @Get()
  list(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ): Promise<Device[]> {
    return this.devices.list(current.userId, workspaceId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':deviceId')
  async revoke(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ): Promise<void> {
    await this.devices.revoke(current.userId, workspaceId, deviceId);
  }
}
