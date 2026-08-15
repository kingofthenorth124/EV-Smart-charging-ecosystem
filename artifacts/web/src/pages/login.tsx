import { useState } from "react";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { ApiErrorResponse } from "@workspace/api-client-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      setErrorMsg(null);
      await login(values.email, values.password);
      // login success -> auth context triggers router update automatically
      setLocation("/");
    } catch (err: any) {
      const apiErr = err.data as ApiErrorResponse | undefined;
      if (apiErr) {
        if (apiErr.statusCode === 401) {
          setErrorMsg("Invalid email or password.");
        } else if (apiErr.statusCode === 403) {
          setErrorMsg("Your account has been locked or suspended.");
        } else if (apiErr.statusCode === 429) {
          setErrorMsg("Too many attempts. Please try again later.");
        } else {
          setErrorMsg(apiErr.message || "Failed to sign in.");
        }
      } else {
        setErrorMsg("An unexpected error occurred.");
      }
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to your Camel Mobility Wallet">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {errorMsg && (
            <Alert variant="destructive">
              <AlertDescription data-testid="text-login-error">{errorMsg}</AlertDescription>
            </Alert>
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input autoComplete="email" placeholder="you@example.com" {...field} data-testid="input-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary font-medium hover:underline"
                    data-testid="link-forgot-password"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <Input type="password" autoComplete="current-password" placeholder="••••••••" {...field} data-testid="input-password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full bg-[#f0a500] hover:bg-[#d99400] text-[#4a3000] hover:text-[#4a3000]"
            disabled={form.formState.isSubmitting}
            data-testid="button-submit-login"
          >
            {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
          </Button>

          <div className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-primary font-medium hover:underline"
              data-testid="link-register"
            >
              Register here
            </Link>
          </div>
        </form>
      </Form>
    </AuthLayout>
  );
}
