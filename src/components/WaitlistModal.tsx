import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const COUNTRIES = [
  "Brasil", "United States", "Portugal", "España", "Argentina", "México",
  "Colombia", "Chile", "Peru", "United Kingdom", "Canada", "France",
  "Germany", "Italy", "Australia", "Other",
];

const labels = {
  en: {
    headline: "Coming soon — the world's largest AI-integrated photography platform!",
    sub: "Join the waitlist",
    name: "Full name",
    email: "Email",
    phone: "Phone",
    country: "Country",
    cta: "Join the Waitlist",
    success: "You're on the list! We'll be in touch soon.",
    selectCountry: "Select your country",
    close: "Close",
  },
  pt: {
    headline: "Em breve a maior plataforma para fotografia, integrada com inteligência artificial, do mundo!",
    sub: "Entre na fila de espera",
    name: "Nome completo",
    email: "E-mail",
    phone: "Telefone",
    country: "País",
    cta: "Entrar na Fila de Espera",
    success: "Você está na lista! Entraremos em contato em breve.",
    selectCountry: "Selecione seu país",
    close: "Fechar",
  },
  es: {
    headline: "Próximamente la plataforma de fotografía integrada con inteligencia artificial más grande del mundo!",
    sub: "Únete a la lista de espera",
    name: "Nombre completo",
    email: "Correo electrónico",
    phone: "Teléfono",
    country: "País",
    cta: "Unirse a la Lista de Espera",
    success: "¡Estás en la lista! Te contactaremos pronto.",
    selectCountry: "Selecciona tu país",
    close: "Cerrar",
  },
};

export function WaitlistModal() {
  const { lang } = useLanguage();
  const l = labels[lang];
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", country: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.country) return;
    setLoading(true);
    const { error } = await supabase.from("leads").insert({
      name: form.name,
      email: form.email,
      phone: form.phone,
      country: form.country,
    });
    setLoading(false);
    if (error) {
      toast.error("Something went wrong. Try again.");
      return;
    }
    setSubmitted(true);
    toast.success(l.success);
    setTimeout(() => setOpen(false), 2500);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="waitlist-overlay"
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Liquid glass backdrop — iOS 26 style */}
          <div
            className="absolute inset-0 backdrop-blur-xl"
            style={{
              background: "linear-gradient(135deg, hsla(0,0%,100%,0.25) 0%, hsla(0,0%,100%,0.15) 50%, hsla(0,0%,100%,0.25) 100%)",
              WebkitBackdropFilter: "blur(24px) saturate(1.8)",
              backdropFilter: "blur(24px) saturate(1.8)",
            }}
          />

            {/* Header */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center">
                <Sparkles size={16} className="text-background" />
              </div>
              <h2 className="text-lg font-light leading-snug tracking-wide text-foreground max-w-sm">
                {l.headline}
              </h2>
              <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground">{l.sub}</p>
            </div>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 py-6"
              >
                <div className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center">
                  <Sparkles size={20} className="text-background" />
                </div>
                <p className="text-sm text-muted-foreground text-center">{l.success}</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <Input
                  placeholder={l.name}
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  className="h-11"
                />
                <Input
                  type="email"
                  placeholder={l.email}
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                  className="h-11"
                />
                <Input
                  type="tel"
                  placeholder={l.phone}
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  required
                  className="h-11"
                />
                <select
                  value={form.country}
                  onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                  required
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground"
                >
                  <option value="" disabled>{l.selectCountry}</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
                  {loading ? "..." : l.cta}
                </Button>
              </form>
            )}

            {/* Bottom decoration */}
            <div className="flex justify-center">
              <span className="text-[9px] tracking-[0.4em] uppercase text-muted-foreground/50">davions</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
