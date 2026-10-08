import { cn } from "@/lib/utils";

/** Tiny hair-bow motif for the Rapunzel background (Schleifen). */
export function HairBowMark({
  className,
  tone = "lilac",
}: {
  className?: string;
  tone?: "lilac" | "gold";
}) {
  const fill = tone === "gold" ? "#F2C14E" : "#B48AD4";
  return (
    <svg
      viewBox="0 0 40 36"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path
        d="M20 16c-1.2 2.4-2.2 4.8-2.2 7.2 0 1.6.6 2.8 2.2 2.8s2.2-1.2 2.2-2.8c0-2.4-1-4.8-2.2-7.2z"
        fill={fill}
      />
      <ellipse cx="11" cy="14" rx="9" ry="7" fill={fill} />
      <ellipse cx="29" cy="14" rx="9" ry="7" fill={fill} />
      <circle cx="20" cy="14" r="3.2" fill={tone === "gold" ? "#E8A838" : "#9B6BC0"} />
      <path
        d="M17 20c.6 3 1.4 6 3 8M23 20c-.6 3-1.4 6-3 8"
        stroke={tone === "gold" ? "#E8A838" : "#9B6BC0"}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

type BowFieldProps = {
  className?: string;
};

/** Soft tiled field of hair bows behind the app. */
export function BowField({ className }: BowFieldProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <div className="sunshine-bow-field absolute inset-0 opacity-[0.38]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#F6EEFC]/35 via-transparent to-[#E8D5F5]/45" />
    </div>
  );
}
