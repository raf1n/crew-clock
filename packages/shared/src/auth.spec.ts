import { loginSchema, registerSchema } from './auth';

describe('auth schemas', () => {
  it('normalizes email and trims names when registering', () => {
    const parsed = registerSchema.parse({
      email: '  Ada@Example.COM ',
      password: 'correct horse battery',
      name: ' Ada Lovelace ',
      workspaceName: ' Analytical Engines ',
    });

    expect(parsed).toEqual({
      email: 'ada@example.com',
      password: 'correct horse battery',
      name: 'Ada Lovelace',
      workspaceName: 'Analytical Engines',
    });
  });

  it('enforces an 8-character password minimum', () => {
    const base = {
      email: 'ada@example.com',
      name: 'Ada',
      workspaceName: 'Acme',
    };

    expect(registerSchema.safeParse({ ...base, password: '1234567' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: '12345678' }).success).toBe(true);
  });

  it('does not enforce the length policy on login passwords', () => {
    const result = loginSchema.safeParse({ email: 'ada@example.com', password: 'short' });

    expect(result.success).toBe(true);
  });
});
