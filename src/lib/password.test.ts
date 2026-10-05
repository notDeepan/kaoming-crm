import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashes', () => {
  it('accepts the right password and refuses a different one', async () => {
    const password = 'A-different-long-password!';
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword('wrong-password', first)).toBe(false);
  });

  it('refuses short passwords and malformed hashes', async () => {
    await expect(hashPassword('short')).rejects.toThrow();
    expect(await verifyPassword('any-password', 'not-a-hash')).toBe(false);
  });
});
