import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
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
import { CheckCircle2 } from "lucide-react";
import { useConfirmPasswordReset, ApiErrorResponse } from "@workspace/api-client-react";

const resetSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(128, "Too long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ResetPassword() {
  const [success, setSuccess] = useState(false);
  const confirmReset = useConfirmPasswordReset();
  
  // Parse token from URL if available
  const tokenParams = new URLSearchParams(window.location.search).get("token") || "";

  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { token: tokenParams, newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: z.infer<typeof resetSchema>) => {
    try {
      await confirmReset.mutateAsync({
        data: { token: values.token, newPassword: values.newPassword },
      });
      setSuccess(true);
    } catch (err: any) {
      const apiErr = err.data as ApiErrorResponse | undefined;
      form.setError("root", {
        message: apiErr?.message || "Failed to reset password. The token may be invalid or expired.",
      });
    }
  };

  if (success) {
    return (
      <AuthLayout title="Password Reset" subtitle="Your password has been changed">
        <div className="text-center py-4 space-y-4">
          <div className="flex justify-center">
            <div className="size-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="size-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            You can now sign in with your new password. All other sessions have been revoked.
          </p>
          <div className="pt-4 border-t border-border mt-6">
            <Link href="/login" className="inline-flex items-center justify-center h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 w-full">
              Sign in now
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose New Password" subtitle="Enter your new password below">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {form.formState.errors.root && (
            <Alert variant="destructive">
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
            </Alert>
          )}

          {!tokenParams && (
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reset Token</FormLabel>
                  <FormControl>
                    <Input placeholder="Paste token here" {...field} data-testid="input-token" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} data-testid="input-newpassword" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} data-testid="input-confirmpassword" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full bg-[#f0a500] hover:bg-[#d99400] text-[#4a3000] hover:text-[#4a3000]"
            disabled={confirmReset.isPending}
            data-testid="button-submit-reset"
          >
            {confirmReset.isPending ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
