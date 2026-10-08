import { cn } from "@/lib/utils";

type SunLogoProps = {
  className?: string;
  title?: string;
};

/** Red Tangled-inspired sun mark for Sunshine. Static SVG avoids hydration drift. */
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
      <circle cx="32" cy="32" r="12" fill="#C41E3A" />
      <g stroke="#C41E3A" strokeWidth="3.5" strokeLinecap="round">
        <line x1="32" y1="4" x2="32" y2="16" />
        <line x1="32" y1="48" x2="32" y2="60" />
        <line x1="4" y1="32" x2="16" y2="32" />
        <line x1="48" y1="32" x2="60" y2="32" />
        <line x1="12.2" y1="12.2" x2="20.7" y2="20.7" />
        <line x1="43.3" y1="43.3" x2="51.8" y2="51.8" />
        <line x1="51.8" y1="12.2" x2="43.3" y2="20.7" />
        <line x1="20.7" y1="43.3" x2="12.2" y2="51.8" />
        <line x1="8.4" y1="22" x2="18.1" y2="25.6" />
        <line x1="45.9" y1="38.4" x2="55.6" y2="42" />
        <line x1="55.6" y1="22" x2="45.9" y2="25.6" />
        <line x1="18.1" y1="38.4" x2="8.4" y2="42" />
      </g>
      <circle cx="32" cy="32" r="5" fill="#FFF8EF" opacity="0.35" />
    </svg>
  );
}
