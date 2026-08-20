/**
 * KMC mark — a clean SVG rebuild of the KAO MING emblem (red mountain dome + blue peaks)
 * for crisp rendering at any size in the shell. Brand colours here are identity, which is the
 * one place they are allowed. If the raster logo is later dropped into docs/brand/, swap it in.
 */
export function KmcMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="KAO MING"
    >
      {/* red dome / mountain base ring */}
      <path
        d="M4 40 A20 20 0 0 1 44 40 L37 40 A13 13 0 0 0 11 40 Z"
        fill="#BE1E2D"
      />
      {/* blue peaks inside the dome */}
      <path d="M15 40 L24 20 L33 40 Z" fill="#6BA6D6" />
      <path d="M24 40 L31 26 L38 40 Z" fill="#4E8FC4" />
      <path d="M10 40 L17 28 L24 40 Z" fill="#83B7DC" />
    </svg>
  );
}
