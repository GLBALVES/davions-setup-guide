import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import logoPrincipal from "@/assets/logo_principal_preto.png";

const schema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address." }),
});

type FormValues = z.infer<typeof schema>;

const ForgotPassword = () => {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setServerError("Something went wrong. Please try again.");
      } else {
        setSent(true);
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
              Forgot your password?
            </h1>
            <p className="text-sm font-light text-muted-foreground">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          {sent ? (
            <div className="flex flex-col gap-6">
              <div className="border border-border bg-muted/30 px-4 py-4 text-sm font-light text-foreground">
                Check your inbox — a password reset link has been sent to <strong>{form.getValues("email")}</strong>.
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Didn't receive it?{" "}
                <button
                  onClick={() => setSent(false)}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
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

                {serverError && (
                  <p className="text-xs text-destructive border border-destructive/30 bg-destructive/5 px-3 py-2">
                    {serverError}
                  </p>
                )}

                <Button type="submit" disabled={loading} className="w-full mt-2" size="lg">
                  {loading ? "Sending…" : "Send Reset Link"}
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

export default ForgotPassword;
