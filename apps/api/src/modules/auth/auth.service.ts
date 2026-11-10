import { randomUUID } from 'node:crypto';

import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  AcceptInviteRegistrationInput,
  AuthResponse,
  AuthTokens,
  LoginInput,
  PublicUser,
  RegisterInput,
} from '@crewclock/shared';
import { DEFAULT_TIMEZONE } from '@crewclock/shared';
import { DataSource, IsNull, Repository } from 'typeorm';

import { toPublicUser } from '../users/mappers/user.mapper';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { hashPassword, verifyPassword } from './utils/password.util';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { hashToken, tokenHashMatches } from '../../common/utils/token-hash';
import type { AccessTokenPayload, RefreshTokenPayload } from './types/token-payload';

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly users: UsersService,
    private readonly workspaces: WorkspacesService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokens: Repository<RefreshTokenEntity>,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const passwordHash = await hashPassword(input.password);

    let user: UserEntity;
    try {
      user = await this.dataSource.transaction(async (manager) => {
        const users = manager.getRepository(UserEntity);
        const existing = await users.findOne({ where: { email: input.email } });
        if (existing) {
          throw new ConflictException('An account with this email already exists');
        }

        const created = users.create({
          email: input.email,
          name: input.name,
          passwordHash,
          timezone: input.timezone ?? DEFAULT_TIMEZONE,
        });
        await users.save(created);
        await this.workspaces.createForUser(created.id, input.workspaceName, manager);
        return created;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }

    return { user: toPublicUser(user), ...(await this.issueTokens(user)) };
  }

  async acceptInviteRegistration(input: AcceptInviteRegistrationInput): Promise<AuthResponse> {
    const preview = await this.workspaces.previewInvitation(input.token);
    const passwordHash = await hashPassword(input.password);

    let user: UserEntity;
    try {
      user = await this.dataSource.transaction(async (manager) => {
        const users = manager.getRepository(UserEntity);
        const existing = await users.findOne({ where: { email: preview.email } });
        if (existing) {
          throw new ConflictException(
            'An account with this email already exists. Sign in to accept the invitation.',
          );
        }

        const created = users.create({
          email: preview.email,
          name: input.name,
          passwordHash,
          timezone: input.timezone ?? DEFAULT_TIMEZONE,
        });
        await users.save(created);
        await this.workspaces.acceptInvitationWithManager(
          manager,
          created.id,
          preview.email,
          input.token,
        );
        return created;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'An account with this email already exists. Sign in to accept the invitation.',
        );
      }
      throw error;
    }

    return { user: toPublicUser(user), ...(await this.issueTokens(user)) };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.users.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await verifyPassword(user.passwordHash, input.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (input.timezone && input.timezone !== user.timezone) {
      user.timezone = input.timezone;
      await this.users.setTimezone(user.id, input.timezone);
    }

    return { user: toPublicUser(user), ...(await this.issueTokens(user)) };
  }

  async refresh(token: string, timezone?: string): Promise<AuthResponse> {
    const payload = await this.verifyRefreshToken(token);
    const stored = await this.refreshTokens.findOne({
      where: { id: payload.jti, userId: payload.sub },
    });
    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const unusable =
      stored.revokedAt !== null ||
      stored.expiresAt.getTime() <= Date.now() ||
      !tokenHashMatches(stored.tokenHash, token);

    if (unusable) {
      const reusedAfterGrace =
        stored.revokedAt !== null &&
        Date.now() - stored.revokedAt.getTime() > REFRESH_TOKEN_REUSE_GRACE_MS;
      if (reusedAfterGrace) {
        await this.revokeAllForUser(payload.sub);
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    const revoked = await this.refreshTokens.update(
      { id: stored.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    if (revoked.affected !== 1) {
      // Another request rotated this token first (e.g. two tabs, or React
      // StrictMode running the bootstrap effect twice). Reject this request
      // without revoking the freshly rotated token.
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }
    if (timezone && timezone !== user.timezone) {
      user.timezone = timezone;
      await this.users.setTimezone(user.id, timezone);
    }

    return { user: toPublicUser(user), ...(await this.issueTokens(user)) };
  }

  async logout(token: string): Promise<void> {
    await this.refreshTokens.update(
      { tokenHash: hashToken(token), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }
    return toPublicUser(user);
  }

  private async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
      });
      if (
        payload.tokenType !== 'refresh' ||
        typeof payload.sub !== 'string' ||
        typeof payload.jti !== 'string'
      ) {
        throw new Error('Unexpected refresh token payload');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async issueTokens(user: UserEntity): Promise<AuthTokens> {
    const accessTtlSeconds = Number(this.config.getOrThrow('ACCESS_TOKEN_TTL_SECONDS'));
    const refreshTtlSeconds = Number(this.config.getOrThrow('REFRESH_TOKEN_TTL_SECONDS'));
    const refreshSecret = this.config.getOrThrow<string>('REFRESH_TOKEN_SECRET');
    const tokenId = randomUUID();

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      tokenType: 'access',
    } satisfies AccessTokenPayload);

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        tokenType: 'refresh',
      } satisfies Omit<RefreshTokenPayload, 'jti'>,
      { secret: refreshSecret, expiresIn: refreshTtlSeconds, jwtid: tokenId },
    );

    await this.refreshTokens.insert({
      id: tokenId,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
      revokedAt: null,
    });

    return { accessToken, refreshToken, expiresIn: accessTtlSeconds };
  }

  private async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokens.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }
}

const REFRESH_TOKEN_REUSE_GRACE_MS = 30_000;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'driverError' in error &&
    (error as { driverError?: { code?: string } }).driverError?.code === '23505'
  );
}
