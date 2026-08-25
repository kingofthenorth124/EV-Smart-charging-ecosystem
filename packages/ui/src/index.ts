/**
 * @workspace/ui
 *
 * Camel Mobility Wallet — reusable React component library.
 *
 * All components follow the platform design language:
 * - Tailwind v4 CSS custom-property tokens
 * - Radix UI primitives for accessibility
 * - class-variance-authority for variant composition
 * - WCAG-compatible keyboard navigation and ARIA usage
 *
 * Consuming apps must scan this package's source files for Tailwind class names.
 * Add to your CSS: @source "../../../packages/ui/src";
 */

// Utilities
export { cn } from "./lib/utils";

// Primitive components
export { Button, buttonVariants } from "./components/button";
export type { ButtonProps } from "./components/button";
export { Input } from "./components/input";
export { Textarea } from "./components/textarea";
export { Label } from "./components/label";
export { Separator } from "./components/separator";
export { Skeleton } from "./components/skeleton";
export { Spinner } from "./components/spinner";
export type { SpinnerProps } from "./components/spinner";

// Layout components
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./components/card";

// Form composition
export {
  FormField,
  FormLabel,
  FormMessage,
  FormDescription,
} from "./components/form";

// Data display
export { Badge, badgeVariants } from "./components/badge";
export type { BadgeProps } from "./components/badge";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./components/table";

// Feedback / state components
export { Alert, AlertTitle, AlertDescription } from "./components/alert";
export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "./components/empty";

// Navigation
export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "./components/pagination";

// Overlay / modal
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/dialog";

// Selection
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "./components/select";

// Tabs
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/tabs";
