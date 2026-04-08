import { useState, useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@renderer/lib/cn";

interface ErrorRetryMessageProps {
  error: string;
  retryAttempt?: number;
  maxRetries?: number;
  retryInMs?: number;
  onRetry?: () => void;
}

export function ErrorRetryMessage({
  error,
  retryAttempt,
  maxRetries,
  retryInMs,
  onRetry,
}: ErrorRetryMessageProps) {
  const [countdown, setCountdown] = useState(
    retryInMs ? Math.ceil(retryInMs / 1000) : null,
  );

  useEffect(() => {
    if (countdown === null || countdown <= 0) {
      if (countdown === 0) onRetry?.();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onRetry]);

  const hasFailed =
    retryAttempt !== undefined &&
    maxRetries !== undefined &&
    retryAttempt >= maxRetries;
  const isAutoRetrying = countdown !== null && countdown > 0;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3.5",
        hasFailed
          ? "border-red-500/30 bg-red-500/8"
          : "border-amber-500/30 bg-amber-500/8",
      )}
    >
      <AlertCircle
        className={cn(
          "mt-0.5 h-4 w-4 flex-shrink-0",
          hasFailed ? "text-red-400" : "text-amber-400",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-[var(--color-foreground)]">{error}</p>
        {retryAttempt !== undefined && maxRetries !== undefined && (
          <p className="mt-1 text-[11.5px] text-[var(--color-muted)]">
            重试 {retryAttempt}/{maxRetries}
            {isAutoRetrying && ` · ${countdown}s 后自动重试`}
          </p>
        )}
      </div>
      {!isAutoRetrying && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg bg-white/8 px-2.5 py-1.5 text-[12px] text-[var(--color-foreground)] hover:bg-white/12 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          重试
        </button>
      )}
    </div>
  );
}
