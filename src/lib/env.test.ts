import { describe, expect, it } from 'vitest';
import { readServerEnv, requireServerEnv } from './env';

const valid = {
  DATABASE_URL: 'postgres://user:password@localhost:5432/kaoming',
  AUTH_SECRET: 'a'.repeat(32),
};

describe('server environment', () => {
  it('lists missing field names without printing secret values', () => {
    const result = readServerEnv({});
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors.AUTH_SECRET).toBeDefined();
    expect(() => requireServerEnv({ ...valid, AUTH_SECRET: 'short' })).toThrow(
      'Invalid server configuration: AUTH_SECRET',
    );
  });

  it('applies Taiwan defaults', () => {
    const result = readServerEnv(valid);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.TZ).toBe('Asia/Taipei');
    expect(result.data.DEFAULT_LOCALE).toBe('en');
  });
});
