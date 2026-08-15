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
import { useChangePassword, ApiErrorResponse } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const securitySchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(128, "Too long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function AccountSecurity() {
  const { clearSession } = useAuth();
  const changePassword = useChangePassword();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof securitySchema>>({
    resolver: zodResolver(securitySchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: z.infer<typeof securitySchema>) => {
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
    } catch (err: any) {
      const apiErr = err.data as ApiErrorResponse | undefined;
      form.setError("root", {
        message: apiErr?.message || "Failed to change password. Please verify your current password.",
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
                    <Input type="password" autoComplete="current-password" placeholder="••••••••" {...field} data-testid="input-currentpassword" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4" />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} data-testid="input-newpassword" />
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
                    <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} data-testid="input-confirmpassword" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 border-t border-border">
              <Button
                type="submit"
                className="w-full bg-[#f0a500] hover:bg-[#d99400] text-[#4a3000] hover:text-[#4a3000]"
                disabled={changePassword.isPending}
                data-testid="button-submit-changepassword"
              >
                {changePassword.isPending ? "Updating..." : "Update Password"}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Changing your password will sign you out of all devices.
              </p>
            </div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
