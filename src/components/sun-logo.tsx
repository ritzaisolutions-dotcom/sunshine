import { cn } from "@/lib/utils";

type SunLogoProps = {
  className?: string;
  title?: string;
};

/**
 * Tangled / entangled sun — gold rays with soft purple core glow.
 * Static SVG paths avoid hydration drift.
 */
export function SunLogo({ className, title = "Sunshine" }: SunLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
      suppressHydrationWarning
    >
      <title>{title}</title>
      <defs>
        <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE28A" />
          <stop offset="55%" stopColor="#F2C14E" />
          <stop offset="100%" stopColor="#E0A92E" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="11" fill="url(#sunCore)" />
      <g stroke="#F2C14E" strokeWidth="3.2" strokeLinecap="round">
        <line x1="32" y1="3" x2="32" y2="14" />
        <line x1="32" y1="50" x2="32" y2="61" />
        <line x1="3" y1="32" x2="14" y2="32" />
        <line x1="50" y1="32" x2="61" y2="32" />
        <line x1="11.5" y1="11.5" x2="19.5" y2="19.5" />
        <line x1="44.5" y1="44.5" x2="52.5" y2="52.5" />
        <line x1="52.5" y1="11.5" x2="44.5" y2="19.5" />
        <line x1="19.5" y1="44.5" x2="11.5" y2="52.5" />
        <line x1="7.8" y1="21.5" x2="17.2" y2="25.2" />
        <line x1="46.8" y1="38.8" x2="56.2" y2="42.5" />
        <line x1="56.2" y1="21.5" x2="46.8" y2="25.2" />
        <line x1="17.2" y1="38.8" x2="7.8" y2="42.5" />
      </g>
      {/* Soft entangled swirl in the center */}
      <path
        d="M28 30c2-3 6-3 8 0 1.5 2.2-.2 4.5-2.6 4.2-1.6-.2-2.6-1.4-2.4-2.8"
        fill="none"
        stroke="#9B6BC0"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="32" cy="32" r="3.2" fill="#FFF6D6" opacity="0.85" />
    </svg>
  );
}
