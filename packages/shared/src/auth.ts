import { z } from 'zod';

import type { PublicUser } from './users';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(320)
  .regex(EMAIL_PATTERN, 'Invalid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

export const displayNameSchema = z.string().trim().min(1).max(120);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: displayNameSchema,
  workspaceName: z.string().trim().min(1).max(100),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const acceptInviteRegistrationSchema = z.object({
  token: z.string().min(1),
  name: displayNameSchema,
  password: passwordSchema,
});

export type AcceptInviteRegistrationInput = z.infer<typeof acceptInviteRegistrationSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse extends AuthTokens {
  user: PublicUser;
}
