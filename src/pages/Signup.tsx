import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import logoPrincipal from "@/assets/logo_principal_preto.png";

const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters." })
    .max(100, { message: "Name must be under 100 characters." }),
  email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email address." })
    .max(255),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." })
    .max(128),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

const Signup = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setServerError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.fullName },
        },
      });
      if (error) {
        if (error.message.includes("already registered")) {
          setServerError("This email is already in use. Try signing in instead.");
        } else {
          setServerError(error.message);
        }
      } else {
        navigate("/dashboard");
      }
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border h-16 flex items-center px-6">
        <Link to="/" className="flex items-center">
          <img src={logoPrincipal} alt="Davions" className="h-6 w-auto" />
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm flex flex-col gap-10">

          {/* Heading */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
              <span className="inline-block w-6 h-px bg-border" />
              Create Account
            </p>
            <h1 className="text-2xl font-light tracking-wide text-foreground">
              Start for free
            </h1>
            <p className="text-sm font-light text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs tracking-widest uppercase text-muted-foreground font-light">
                      Full Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Jane Doe"
                        autoComplete="name"
                        className="rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground transition-colors"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs tracking-widest uppercase text-muted-foreground font-light">
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground transition-colors"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs tracking-widest uppercase text-muted-foreground font-light">
                      Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        className="rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground transition-colors"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs tracking-widest uppercase text-muted-foreground font-light">
                      Confirm Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        className="rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground transition-colors"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Server error */}
              {serverError && (
                <p className="text-xs text-destructive border border-destructive/30 bg-destructive/5 px-3 py-2">
                  {serverError}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-2"
                size="lg"
              >
                {loading ? "Creating account…" : "Create Account"}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center leading-relaxed font-light">
                By creating an account you agree to our{" "}
                <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
                  Privacy Policy
                </Link>
                .
              </p>
            </form>
          </Form>

          {/* Footer */}
          <div className="border-t border-border pt-6">
            <p className="text-[10px] tracking-widest uppercase text-muted-foreground text-center">
              Secure · End-to-end encrypted · Davions © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Signup;
