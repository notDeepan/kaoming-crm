export type UserActionState = { ok: boolean; message?: string; errors?: Record<string, string[]> };

export const initialUserActionState: UserActionState = { ok: false };
