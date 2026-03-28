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
import { useLanguage } from "@/contexts/LanguageContext";

async function requestPushPermissionOnLogin() {
  if (typeof window === "undefined") return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "default") return;

  try {
    await Notification.requestPermission();
  } catch {
    // Ignore prompt errors and continue login flow.
  }
}

const Login = () => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const a = t.auth;

  const loginSchema = z.object({
    email: z.string().trim().email({ message: a.validEmail }),
    password: z.string().min(1, { message: a.passwordRequired }),
  });

  type LoginFormValues = z.infer<typeof loginSchema>;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setLoading(true);
    const pushPermissionRequest = requestPushPermissionOnLogin();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        setServerError(a.invalidCredentials);
        setLoading(false);
        return;
      }
      await pushPermissionRequest;
      // On success: PublicOnlyRoute redirects automatically when AuthContext
      // updates via onAuthStateChange — no manual navigate() needed here.
    } catch {
      setServerError(a.genericError);
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
              {a.photographerAccess}
            </p>
            <h1 className="text-2xl font-light tracking-wide text-foreground">
              {a.signInHeading}
            </h1>
            <p className="text-sm font-light text-muted-foreground">
              {a.noAccount}{" "}
              <Link to="/signup" className="text-foreground underline-offset-4 hover:underline">
                {a.createOneFree}
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
                      {a.emailLabel}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={a.emailPlaceholder}
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
                        {a.passwordLabel}
                      </FormLabel>
                      <Link
                        to="/forgot-password"
                        className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                      >
                        {a.forgotPassword}
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={a.passwordPlaceholder}
                        autoComplete="current-password"
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
                {loading ? a.signingIn : a.signInBtn}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="border-t border-border pt-6">
            <p className="text-[10px] tracking-widest uppercase text-muted-foreground text-center">
              {a.secureFooter} {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
