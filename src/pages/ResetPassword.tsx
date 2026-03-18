import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import logoPrincipal from "@/assets/logo_principal_preto.png";

const schema = z.object({
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords don't match.",
  path: ["confirm"],
});

type FormValues = z.infer<typeof schema>;

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Supabase sets the session via the URL hash when the user lands from the email link
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    } else {
      // Listen for auth state change — Supabase may fire PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      });
      // Give it a short window before marking the link invalid
      const timer = setTimeout(() => {
        if (!ready) setInvalidLink(true);
      }, 2000);
      return () => {
        subscription.unsubscribe();
        clearTimeout(timer);
      };
    }
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) {
        setServerError(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => navigate("/dashboard"), 2500);
      }
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border h-16 flex items-center px-6">
        <Link to="/" className="flex items-center">
          <img src={logoPrincipal} alt="Davions" className="h-6 w-auto" />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm flex flex-col gap-10">

          <div className="flex flex-col gap-2">
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
              <span className="inline-block w-6 h-px bg-border" />
              Password Recovery
            </p>
            <h1 className="text-2xl font-light tracking-wide text-foreground">
              Set new password
            </h1>
            <p className="text-sm font-light text-muted-foreground">
              Choose a strong password for your account.
            </p>
          </div>

          {success ? (
            <div className="border border-border bg-muted/30 px-4 py-4 text-sm font-light text-foreground">
              Password updated successfully. Redirecting to your dashboard…
            </div>
          ) : invalidLink ? (
            <div className="flex flex-col gap-6">
              <div className="text-xs text-destructive border border-destructive/30 bg-destructive/5 px-3 py-2">
                This reset link is invalid or has expired. Please request a new one.
              </div>
              <Link
                to="/forgot-password"
                className="text-xs text-center text-foreground underline-offset-4 hover:underline"
              >
                Request a new link
              </Link>
            </div>
          ) : !ready ? (
            <div className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse text-center">
              Verifying link…
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs tracking-widest uppercase text-muted-foreground font-light">
                        New Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
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
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs tracking-widest uppercase text-muted-foreground font-light">
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="new-password"
                          className="rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground transition-colors"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {serverError && (
                  <p className="text-xs text-destructive border border-destructive/30 bg-destructive/5 px-3 py-2">
                    {serverError}
                  </p>
                )}

                <Button type="submit" disabled={loading} className="w-full mt-2" size="lg">
                  {loading ? "Updating…" : "Update Password"}
                </Button>
              </form>
            </Form>
          )}

          <div className="border-t border-border pt-6 flex justify-center">
            <Link
              to="/login"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
            >
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
