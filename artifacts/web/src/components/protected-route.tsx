/**
 * Route guards: authentication + role-based access.
 */
import { type ComponentType, type ReactNode } from 'react';
import { Redirect } from 'wouter';
import type { UserRole } from '@workspace/api-client-react';
import { useAuth } from '@/hooks/use-auth';
import { Spinner } from '@/components/ui/spinner';

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner className="size-8 text-primary" data-testid="loader-auth" />
    </div>
  );
}

export function ProtectedRoute({
  component: Component,
  roles,
}: {
  component: ComponentType;
  roles?: UserRole[];
}) {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) return <FullPageLoader />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (roles && user && !roles.includes(user.role)) return <Redirect to="/" />;

  return <Component />;
}

/** Redirect authenticated users away from guest-only pages (login/register). */
export function GuestRoute({ component: Component }: { component: ComponentType }) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <FullPageLoader />;
  if (isAuthenticated) return <Redirect to="/" />;

  return <Component />;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  return <>{children}</>;
}
