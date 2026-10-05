import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { userRoles } from '@/db/enums';
import { users } from '@/db/schema';
import { verifyPassword } from '@/lib/password';
import { allowCredentialAttempt, resetAccountAttempts } from '@/lib/login-throttle';
import type { UserRole } from '@/lib/role-policy';

function asUserRole(value: unknown): UserRole {
  if (typeof value === 'string' && userRoles.some((role) => role === value)) return value as UserRole;
  throw new Error('Invalid session role');
}

const credentialsSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(1024),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(input, request) {
        const parsed = credentialsSchema.safeParse(input);
        if (!parsed.success) return null;
        if (!(await allowCredentialAttempt(parsed.data.email, request))) return null;

        const [user] = await getDb()
          .select({ id: users.id, name: users.name, email: users.email, role: users.role, passwordHash: users.passwordHash })
          .from(users)
          .where(and(eq(users.email, parsed.data.email), eq(users.isActive, true), isNull(users.deletedAt)))
          .limit(1);

        if (!user?.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) return null;
        await resetAccountAttempts(parsed.data.email);
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = String(user.id ?? '');
        token.role = asUserRole(user.role);
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.id);
      session.user.role = asUserRole(token.role);
      return session;
    },
  },
});
