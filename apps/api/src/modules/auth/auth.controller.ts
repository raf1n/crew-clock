import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  acceptInviteRegistrationSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  type AcceptInviteRegistrationInput,
  type AuthResponse,
  type LoginInput,
  type PublicUser,
  type RefreshTokenInput,
  type RegisterInput,
} from '@crewclock/shared';
import type { CookieOptions, Request, Response } from 'express';

import type { AuthenticatedUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/v1/auth';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) input: RegisterInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.auth.register(input);
    this.setRefreshCookie(response, result.refreshToken);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('accept-invite')
  async acceptInvite(
    @Body(new ZodValidationPipe(acceptInviteRegistrationSchema))
    input: AcceptInviteRegistrationInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.auth.acceptInviteRegistration(input);
    this.setRefreshCookie(response, result.refreshToken);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) input: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.auth.login(input);
    this.setRefreshCookie(response, result.refreshToken);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) input: RefreshTokenInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const token = input.refreshToken ?? this.readRefreshCookie(request);
    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const result = await this.auth.refresh(token, input.timezone);
    this.setRefreshCookie(response, result.refreshToken);
    return result;
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Body(new ZodValidationPipe(refreshTokenSchema)) input: RefreshTokenInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = input.refreshToken ?? this.readRefreshCookie(request);
    if (token) {
      await this.auth.logout(token);
    }
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @Get('me')
  me(@CurrentUser() current: AuthenticatedUser): Promise<PublicUser> {
    return this.auth.getProfile(current.userId);
  }

  private setRefreshCookie(response: Response, token: string): void {
    response.cookie(REFRESH_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge: Number(this.config.getOrThrow('REFRESH_TOKEN_TTL_SECONDS')) * 1000,
    });
  }

  private readRefreshCookie(request: Request): string | undefined {
    const value: unknown = request.cookies?.[REFRESH_COOKIE];
    return typeof value === 'string' ? value : undefined;
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.getOrThrow<string>('NODE_ENV') === 'production',
      path: REFRESH_COOKIE_PATH,
    };
  }
}
