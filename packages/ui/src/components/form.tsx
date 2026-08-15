/**
 * Form field composition helpers.
 * Provides accessible label + input + error message layout
 * without coupling to any specific form library.
 */
import * as React from 'react';
import { cn } from '../lib/utils';
import { Label } from './label';

// ─── FormField ────────────────────────────────────────────────────────────────

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** When true the field is rendered in an error state. */
  hasError?: boolean;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, hasError, ...props }, ref) => (
    <div
      ref={ref}
      data-error={hasError ? 'true' : undefined}
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    />
  ),
);
FormField.displayName = 'FormField';

// ─── FormLabel ────────────────────────────────────────────────────────────────

interface FormLabelProps extends React.ComponentPropsWithoutRef<typeof Label> {
  required?: boolean;
}

const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  FormLabelProps
>(({ className, required, children, ...props }, ref) => (
  <Label ref={ref} className={cn('', className)} {...props}>
    {children}
    {required && (
      <span aria-hidden="true" className="ml-0.5 text-destructive">
        *
      </span>
    )}
  </Label>
));
FormLabel.displayName = 'FormLabel';

// ─── FormMessage ──────────────────────────────────────────────────────────────

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  if (!children) return null;
  return (
    <p
      ref={ref}
      role="alert"
      aria-live="polite"
      className={cn('text-sm font-medium text-destructive', className)}
      {...props}
    >
      {children}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';

// ─── FormDescription ──────────────────────────────────────────────────────────

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
FormDescription.displayName = 'FormDescription';

export { FormField, FormLabel, FormMessage, FormDescription };
