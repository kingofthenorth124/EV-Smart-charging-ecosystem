import { useState } from "react";
import { Link } from "wouter";
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
import { CheckCircle2 } from "lucide-react";
import { useRequestPasswordReset } from "@workspace/api-client-react";
import { passwordResetRequestSchema, type PasswordResetRequestInput } from "@workspace/validation";

export default function ForgotPassword() {
  const [success, setSuccess] = useState(false);
  const requestReset = useRequestPasswordReset();

  const form = useForm<PasswordResetRequestInput>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: PasswordResetRequestInput) => {
    try {
      await requestReset.mutateAsync({ data: { email: values.email } });
      setSuccess(true);
    } catch {
      // The API returns 200 for any email (enumeration-safe), so an error
      // means the request never completed (network/server failure). Do NOT
      // claim success — surface the retryable error banner instead
      // (requestReset.isError renders it).
    }
  };

  if (success) {
    return (
      <AuthLayout title="Check Your Email" subtitle="Password reset requested">
        <div className="text-center py-4 space-y-4">
          <div className="flex justify-center">
            <div className="size-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="size-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            If an account exists for that email, we've sent a link to reset your password.
          </p>
          <div className="pt-4 border-t border-border mt-6">
            <p className="text-xs text-muted-foreground mb-4">
              (For development: check your email for a link to <code className="bg-muted px-1 rounded">/reset-password?token=...</code>)
            </p>
            <Link href="/login" className="text-primary text-sm font-medium hover:underline">
              Return to sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Password" subtitle="We'll send you a reset link">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {requestReset.isError && (
            <Alert variant="destructive">
              <AlertDescription>Failed to request password reset. Please try again.</AlertDescription>
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

          <Button
            type="submit"
            className="w-full bg-[#f0a500] hover:bg-[#d99400] text-[#4a3000] hover:text-[#4a3000]"
            disabled={requestReset.isPending}
            data-testid="button-submit-reset"
          >
            {requestReset.isPending ? "Sending..." : "Send Reset Link"}
          </Button>

          <div className="text-center text-sm mt-6">
            <Link href="/login" className="text-primary font-medium hover:underline">
              Back to sign in
            </Link>
          </div>
        </form>
      </Form>
    </AuthLayout>
  );
}
