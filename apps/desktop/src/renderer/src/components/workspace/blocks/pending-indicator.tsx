export function PendingIndicator() {
  return (
    <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-muted)]">
      <span>Thinking</span>
      <span className="inline-flex items-center gap-1" aria-hidden="true">
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-muted)]"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-muted)]"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-muted)]"
          style={{ animationDelay: "300ms" }}
        />
      </span>
    </div>
  );
}
