import Link from "next/link";
import { Button } from "./ui";

/**
 * Empty states are the first impression — this system starts completely empty. They say what to
 * do first, in the interface's voice, never a shrug.
 */
export function EmptyState({
  title,
  hint,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  hint: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-sm border border-dashed border-grey-line bg-surface/60 px-8 py-12 text-center">
      {/* a quiet engraved-plate glyph, not an illustration */}
      <div className="mb-1 h-[3px] w-10 bg-kmc" />
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="text-sm text-grey-mute">{hint}</p>
      {(actionHref || secondaryHref) && (
        <div className="mt-2 flex items-center gap-2">
          {actionHref && actionLabel && (
            <Link href={actionHref}>
              <Button variant="primary" size="sm">
                {actionLabel}
              </Button>
            </Link>
          )}
          {secondaryHref && secondaryLabel && (
            <Link href={secondaryHref}>
              <Button variant="secondary" size="sm">
                {secondaryLabel}
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
