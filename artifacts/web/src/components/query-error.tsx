import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Actionable failure state for failed data fetches.
 * Never render an empty state for a failed query — use this instead.
 */
export function QueryError({
  title = "Couldn't load data",
  message,
  onRetry,
  compact = false,
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-xl border border-destructive/30 bg-destructive/5 ${
        compact ? "p-5 gap-2" : "p-8 gap-3"
      }`}
      role="alert"
    >
      <AlertTriangle
        className={`text-destructive ${compact ? "size-5" : "size-7"}`}
      />
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {message || "Something went wrong while contacting the server."}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
        <RotateCw className="size-3.5 mr-1.5" />
        Try again
      </Button>
    </div>
  );
}
