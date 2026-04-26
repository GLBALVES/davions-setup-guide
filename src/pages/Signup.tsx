import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
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
      .max(128)
      .regex(/[A-Z]/, { message: a.passwordMissingUppercase })
      .regex(/[a-z]/, { message: a.passwordMissingLowercase })
      .regex(/[0-9]/, { message: a.passwordMissingNumber }),
    confirmPassword: z.string(),
  }).refine((d) => d.password === d.confirmPassword, {
    message: a.passwordsDontMatch,
    path: ["confirmPassword"],
  });

  type SignupFormValues = z.infer<typeof signupSchema>;

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
    mode: "onChange",
  });

  const passwordValue = form.watch("password");
  const confirmValue = form.watch("confirmPassword");

  const checks = [
    { key: "len", label: a.reqMinLength, ok: passwordValue.length >= 8 },
    { key: "upper", label: a.reqUppercase, ok: /[A-Z]/.test(passwordValue) },
    { key: "lower", label: a.reqLowercase, ok: /[a-z]/.test(passwordValue) },
    { key: "num", label: a.reqNumber, ok: /[0-9]/.test(passwordValue) },
    { key: "match", label: a.reqMatch, ok: passwordValue.length > 0 && passwordValue === confirmValue },
  ];

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

              {/* Password requirements checklist */}
              <div className="border border-border bg-muted/30 px-4 py-3">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground font-light mb-2.5">
                  {a.passwordRequirementsTitle}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {checks.map((c) => (
                    <li
                      key={c.key}
                      className={cn(
                        "flex items-center gap-2 text-xs font-light transition-colors",
                        c.ok ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "flex items-center justify-center w-4 h-4 rounded-full border transition-colors shrink-0",
                          c.ok
                            ? "bg-foreground border-foreground text-background"
                            : "border-border bg-background text-muted-foreground/50"
                        )}
                      >
                        {c.ok ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : <X className="w-2.5 h-2.5" strokeWidth={2} />}
                      </span>
                      {c.label}
                    </li>
                  ))}
                </ul>
              </div>

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
