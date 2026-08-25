import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

export interface SpinnerProps extends React.ComponentProps<"svg"> {
  /** Accessible label for screen readers */
  label?: string;
}

function Spinner({ className, label = "Loading", ...props }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
