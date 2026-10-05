export type UserActionState = { ok: boolean; message?: string; errors?: Record<string, string[]> };
export type PasswordActionState = { ok: boolean; message?: string };

export const initialUserActionState: UserActionState = { ok: false };
export const initialPasswordActionState: PasswordActionState = { ok: false };
