export function LoadingDots() {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-1 py-1"
      aria-label="Maria is writing"
      role="status"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2 animate-bounce rounded-full bg-[#F3B6C8]"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}
