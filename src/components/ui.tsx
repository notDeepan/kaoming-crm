import * as React from "react";

/** Utility: join class names. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// ── Button ────────────────────────────────────────────────────────────────────
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};
export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";
  const sizes = { sm: "h-7 px-2.5 text-xs", md: "h-9 px-3.5 text-sm" };
  const variants = {
    primary: "bg-kmc text-surface hover:bg-kmc-ink",
    secondary: "border border-grey-line bg-surface text-ink hover:bg-paper",
    ghost: "text-grey-mute hover:text-ink hover:bg-paper",
    danger: "border border-alert/40 bg-surface text-alert hover:bg-alert/10",
  };
  return <button className={cx(base, sizes[size], variants[variant], className)} {...props} />;
}

// ── Field wrapper (label + hint + error) ────────────────────────────────────────
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="label flex items-center gap-1">
        {label}
        {required && <span className="text-kmc" aria-hidden>*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-2xs text-grey-mute">{hint}</p>}
      {error && <p className="text-2xs text-alert">{error}</p>}
    </div>
  );
}

// ── Text input ──────────────────────────────────────────────────────────────────
const inputBase =
  "h-9 w-full rounded-sm border border-grey-line bg-surface px-2.5 text-sm text-ink placeholder:text-grey-mute/60 focus:border-kmc focus:outline-none";

export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }
>(function TextInput({ className, mono, spellCheck, type, ...props }, ref) {
  // Codes, usernames, emails and URLs should never be spell-checked.
  const noSpell = mono || type === "email" || type === "url" || type === "password";
  return (
    <input
      ref={ref}
      type={type}
      spellCheck={spellCheck ?? (noSpell ? false : undefined)}
      className={cx(inputBase, mono && "mono", className)}
      {...props}
    />
  );
});

export const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cx(inputBase, "h-auto min-h-[72px] py-2 leading-5", className)}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cx(inputBase, "pr-8", className)} {...props}>
      {children}
    </select>
  );
});

// ── Status pill ─────────────────────────────────────────────────────────────────
// State carries colour: active states use the brand red sparingly; warnings use amber;
// everything neutral stays grey.
type PillTone = "active" | "warn" | "neutral" | "muted";
export function StatusPill({ tone = "neutral", children }: { tone?: PillTone; children: React.ReactNode }) {
  const tones: Record<PillTone, string> = {
    active: "border-kmc/30 bg-kmc-wash text-kmc-ink",
    warn: "border-alert/30 bg-alert-wash text-alert",
    neutral: "border-grey-line bg-surface text-ink",
    muted: "border-grey-line bg-paper text-grey-mute",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-2xs font-medium uppercase mono",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}
