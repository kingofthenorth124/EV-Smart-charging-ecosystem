import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { GuestRoute, ProtectedRoute } from "@/components/protected-route";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Charge from "@/pages/charge";
import TopUp from "@/pages/topup";
import History from "@/pages/history";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import AccountSecurity from "@/pages/account-security";
import AdminUsers from "@/pages/admin-users";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/login">
          <GuestRoute component={Login} />
        </Route>
        <Route path="/register">
          <GuestRoute component={Register} />
        </Route>
        <Route path="/forgot-password">
          <GuestRoute component={ForgotPassword} />
        </Route>
        <Route path="/reset-password">
          <GuestRoute component={ResetPassword} />
        </Route>
        <Route path="/account/security">
          <ProtectedRoute component={AccountSecurity} />
        </Route>
        <Route path="/admin/users">
          <ProtectedRoute
            component={AdminUsers}
            roles={["SUPER_ADMIN", "ADMIN_OFFICER"]}
          />
        </Route>
        <Route path="/charge">
          <ProtectedRoute component={Charge} />
        </Route>
        <Route path="/topup">
          <ProtectedRoute component={TopUp} />
        </Route>
        <Route path="/history">
          <ProtectedRoute component={History} />
        </Route>
        <Route path="/">
          <ProtectedRoute component={Home} />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
