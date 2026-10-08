import { cn } from "@/lib/utils";

type SunLogoProps = {
  className?: string;
  title?: string;
};

/** Corona sun: round disc with separate curved rays, gold on the purple UI. */
const LONG_RAY =
  "M30 18.2C25.6 12.4 23.4 5.6 31.6 0.4C32.2 6.2 34.6 12.2 34.2 18.2Z";
const SHORT_RAY =
  "M30.6 17.6C27.6 13.2 27.2 8.4 32 5.2C32.2 8.8 34.2 13 33.8 17.6Z";

const LONG_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const SHORT_ANGLES = [22, 67, 112, 157, 202, 247, 292, 337];

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
      <g fill="#F2C14E">
        {LONG_ANGLES.map((deg) => (
          <path
            key={`l-${deg}`}
            d={LONG_RAY}
            transform={`rotate(${deg} 32 32)`}
          />
        ))}
        {SHORT_ANGLES.map((deg) => (
          <path
            key={`s-${deg}`}
            d={SHORT_RAY}
            transform={`rotate(${deg} 32 32)`}
          />
        ))}
        <circle cx="32" cy="32" r="15" />
      </g>
    </svg>
  );
}
