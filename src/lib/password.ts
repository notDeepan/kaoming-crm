import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(nodeScrypt);
const keyLength = 64;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) throw new Error('Password must have at least 12 characters');
  const salt = randomBytes(32);
  const key = (await scrypt(password, salt, keyLength)) as Buffer;
  return `scrypt:${salt.toString('hex')}:${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, saltHex, keyHex] = stored.split(':');
  if (algorithm !== 'scrypt' || !saltHex || !keyHex) return false;
  if (!/^[0-9a-f]{64}$/i.test(saltHex) || !/^[0-9a-f]{128}$/i.test(keyHex)) return false;

  const expected = Buffer.from(keyHex, 'hex');
  const actual = (await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length)) as Buffer;
  return timingSafeEqual(actual, expected);
}
