import "server-only";
import { hash, verify } from "@node-rs/argon2";

// argon2id — SE-01. Parameters are the library defaults, adequate for a local/LAN deployment.
export function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

export function verifyPassword(digest: string, plain: string): Promise<boolean> {
  return verify(digest, plain);
}

// SE-02 — minimum length 10, complexity encouraged not enforced.
export const MIN_PASSWORD_LENGTH = 10;
