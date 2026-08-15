import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/app-layout";
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
import { useChangePassword } from "@workspace/api-client-react";
import type { ApiErrorResponse } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { passwordSchema } from "@workspace/validation";

// Extend the shared password rules with form-level confirmPassword and
// an extra refine that prevents reusing the current password.
const securityFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "New password must differ from current password",
    path: ["newPassword"],
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SecurityFormInput = z.infer<typeof securityFormSchema>;

export default function AccountSecurity() {
  const { clearSession } = useAuth();
  const changePassword = useChangePassword();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<SecurityFormInput>({
    resolver: zodResolver(securityFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: SecurityFormInput) => {
    try {
      await changePassword.mutateAsync({
        data: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
      });

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully. Please sign in again.",
      });

      clearSession();
      setLocation("/login");
    } catch (err) {
      const apiErr = (err as { data?: ApiErrorResponse }).data;
      form.setError("root", {
        message: apiErr?.message ?? "Failed to change password. Please verify your current password.",
      });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-md mx-auto py-4">
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <div className="bg-primary/10 p-3 rounded-full">
            <Shield className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Account Security</h1>
            <p className="text-sm text-muted-foreground">Manage your password and security settings</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <Alert variant="destructive">
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} />
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
                    <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={changePassword.isPending}
            >
              {changePassword.isPending ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
