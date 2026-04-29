import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import logoPrincipal from "@/assets/logo_principal_preto.png";
import { useLanguage } from "@/contexts/LanguageContext";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { t } = useLanguage();
  const a = t.auth;

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("type=invite") || hash.includes("type=signup")) {
      setReady(true);
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    const timer = setTimeout(() => {
      setReady((r) => {
        if (!r) setInvalidLink(true);
        return r;
      });
    }, 2000);
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const schema = z.object({
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

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
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

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) {
        setServerError(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => navigate("/dashboard"), 2000);
      }
    } catch {
      setServerError(a.genericError);
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
              {a.passwordRecoveryEyebrow ?? "Password Recovery"}
            </p>
            <h1 className="text-2xl font-light tracking-wide text-foreground">
              {a.setNewPasswordTitle ?? "Set new password"}
            </h1>
            <p className="text-sm font-light text-muted-foreground">
              {a.setNewPasswordSubtitle ?? "Choose a strong password for your account."}
            </p>
          </div>

          {success ? (
            <div className="border border-border bg-muted/30 px-4 py-4 text-sm font-light text-foreground">
              {a.passwordUpdatedRedirect ?? "Password updated successfully. Redirecting…"}
            </div>
          ) : invalidLink ? (
            <div className="flex flex-col gap-6">
              <div className="text-xs text-destructive border border-destructive/30 bg-destructive/5 px-3 py-2">
                {a.invalidResetLink ?? "This reset link is invalid or has expired. Please request a new one."}
              </div>
              <Link
                to="/forgot-password"
                className="text-xs text-center text-foreground underline-offset-4 hover:underline"
              >
                {a.requestNewLink ?? "Request a new link"}
              </Link>
            </div>
          ) : !ready ? (
            <div className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse text-center">
              {a.verifyingLink ?? "Verifying link…"}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs tracking-widest uppercase text-muted-foreground font-light">
                        {a.passwordLabel}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder={a.passwordMinHint}
                            autoComplete="new-password"
                            className="rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground transition-colors pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            tabIndex={-1}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
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
                        <div className="relative">
                          <Input
                            type={showConfirm ? "text" : "password"}
                            placeholder={a.confirmPasswordPlaceholder}
                            autoComplete="new-password"
                            className="rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground transition-colors pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm((v) => !v)}
                            tabIndex={-1}
                            aria-label={showConfirm ? "Hide password" : "Show password"}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

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
                  {loading ? (a.updatingPassword ?? "Updating…") : (a.updatePasswordButton ?? "Update Password")}
                </Button>
              </form>
            </Form>
          )}

          <div className="border-t border-border pt-6 flex justify-center">
            <Link
              to="/login"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
            >
              ← {a.backToSignIn ?? "Back to Sign In"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
