"use client";

import Link from "next/link";

// Screen-only controls; hidden when printing.
export function PrintToolbar({ backHref, draft }: { backHref: string; draft: boolean }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 bg-ink px-5 py-2 text-paper print:hidden">
      <Link href={backHref} className="text-xs text-paper/70 hover:text-paper" style={{ fontFamily: "var(--font-plex-mono)" }}>
        ← Back to quotation
      </Link>
      {draft && (
        <span className="rounded-sm border border-alert/50 bg-alert/20 px-2 py-0.5 text-2xs uppercase" style={{ fontFamily: "var(--font-plex-mono)" }}>
          Draft preview
        </span>
      )}
      <button
        onClick={() => window.print()}
        className="ml-auto rounded-sm bg-kmc px-3 py-1 text-xs font-medium text-white hover:bg-kmc-ink"
      >
        Print / Save PDF
      </button>
    </div>
  );
}
