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

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        setServerError("Invalid email or password.");
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
              Photographer Access
            </p>
            <h1 className="text-2xl font-light tracking-wide text-foreground">
              Sign in to your account
            </h1>
            <p className="text-sm font-light text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Create one free
              </Link>
            </p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">

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
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-xs tracking-widest uppercase text-muted-foreground font-light">
                        Password
                      </FormLabel>
                      <Link
                        to="/forgot-password"
                        className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
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
                {loading ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </Form>

          {/* Divider */}
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

export default Login;
