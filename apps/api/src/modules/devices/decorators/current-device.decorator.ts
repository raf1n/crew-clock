import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedDevice } from '../types/authenticated-device';

export const CurrentDevice = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedDevice => {
    const request = context.switchToHttp().getRequest<Request & { device?: AuthenticatedDevice }>();
    if (!request.device) {
      throw new Error('CurrentDevice used on an unauthenticated route');
    }
    return request.device;
  },
);
