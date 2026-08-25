import { useState } from "react";
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
import { useAuth } from "@/hooks/use-auth";
import type { ApiErrorResponse } from "@workspace/api-client-react";
import { registerSchema } from "@workspace/validation";

// Extend the shared schema with the UI-only confirmPassword field.
const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormInput = z.infer<typeof registerFormSchema>;

export default function Register() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormInput) => {
    try {
      setErrorMsg(null);
      await register({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });
      setLocation("/");
    } catch (err) {
      const apiErr = (err as { data?: ApiErrorResponse }).data;
      if (apiErr?.statusCode === 409) {
        if (apiErr.message.toLowerCase().includes("email")) {
          form.setError("email", { message: "Email is already registered" });
        } else if (apiErr.message.toLowerCase().includes("phone")) {
          form.setError("phone", {
            message: "Phone number is already registered",
          });
        } else {
          setErrorMsg(apiErr.message);
        }
      } else {
        setErrorMsg(apiErr?.message ?? "Failed to register.");
      }
    }
  };

  return (
    <AuthLayout title="Create Account" subtitle="Join Camel Mobility today">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {errorMsg && (
            <Alert variant="destructive">
              <AlertDescription data-testid="text-register-error">
                {errorMsg}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Amina"
                      {...field}
                      data-testid="input-firstname"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Bello"
                      {...field}
                      data-testid="input-lastname"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="email"
                    placeholder="amina@example.com"
                    {...field}
                    data-testid="input-email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+2348012345678"
                    {...field}
                    data-testid="input-phone"
                  />
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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...field}
                    data-testid="input-password"
                  />
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
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...field}
                    data-testid="input-confirmpassword"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full bg-[#f0a500] hover:bg-[#d99400] text-[#4a3000] hover:text-[#4a3000] mt-4"
            disabled={form.formState.isSubmitting}
            data-testid="button-submit-register"
          >
            {form.formState.isSubmitting ? "Creating account..." : "Register"}
          </Button>

          <div className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
              data-testid="link-login"
            >
              Sign in
            </Link>
          </div>
        </form>
      </Form>
    </AuthLayout>
  );
}
