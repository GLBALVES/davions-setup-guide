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
import { useLanguage } from "@/contexts/LanguageContext";

const Signup = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const a = t.auth;

  const signupSchema = z.object({
    fullName: z
      .string()
      .trim()
      .min(2, { message: a.nameTooShort })
      .max(100, { message: a.nameTooLong }),
    email: z
      .string()
      .trim()
      .email({ message: a.validEmail })
      .max(255),
    password: z
      .string()
      .min(8, { message: a.passwordTooShort })
      .max(128),
    confirmPassword: z.string(),
  }).refine((d) => d.password === d.confirmPassword, {
    message: a.passwordsDontMatch,
    path: ["confirmPassword"],
  });

  type SignupFormValues = z.infer<typeof signupSchema>;

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
          setServerError(a.emailAlreadyInUse);
        } else {
          setServerError(error.message);
        }
      } else {
        navigate("/dashboard");
      }
    } catch {
      setServerError(a.genericError);
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
              {a.createAccount}
            </p>
            <h1 className="text-2xl font-light tracking-wide text-foreground">
              {a.startFree}
            </h1>
            <p className="text-sm font-light text-muted-foreground">
              {a.alreadyHaveAccount}{" "}
              <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
                {a.signInLink}
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
                      {a.fullNameLabel}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder={a.fullNamePlaceholder}
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
                    <FormLabel className="text-xs tracking-widest uppercase text-muted-foreground font-light">
                      {a.passwordLabel}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={a.passwordMinHint}
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
                      {a.confirmPasswordLabel}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={a.confirmPasswordPlaceholder}
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
                {loading ? a.creatingAccount : a.createAccount}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center leading-relaxed font-light">
                {a.termsNotice}{" "}
                <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
                  {a.termsLink}
                </Link>{" "}
                {a.andWord}{" "}
                <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
                  {a.privacyLink}
                </Link>
                .
              </p>
            </form>
          </Form>

          {/* Footer */}
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

export default Signup;
