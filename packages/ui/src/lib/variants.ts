/**
 * Pure variant helpers — no JSX, no React import.
 * Import from here in tests to avoid the react/jsx-dev-runtime resolution issue
 * that occurs when vitest runs in node mode without a React devDependency.
 */
import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-elevate active-elevate-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground border border-primary-border',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm border-destructive-border',
        outline: 'border [border-color:var(--button-outline)] shadow-xs active:shadow-none',
        secondary: 'bg-secondary text-secondary-foreground border border-secondary-border',
        ghost: 'border border-transparent',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-9 px-4 py-2',
        sm: 'min-h-8 rounded-md px-3 text-xs',
        lg: 'min-h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export const badgeVariants = cva(
  'whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover-elevate',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow-xs',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow-xs',
        outline: 'text-foreground border [border-color:var(--badge-outline)]',
        success: 'border-transparent bg-green-100 text-green-800',
        warning: 'border-transparent bg-amber-100 text-amber-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);
