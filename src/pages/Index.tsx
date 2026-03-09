import { Link } from "react-router-dom";
import { Camera, Image, ShoppingBag, Zap, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import logoPrincipal from "@/assets/logo_principal_preto.png";
import seloPrincipal from "@/assets/selo_preto.png";

// ─── Corner Bracket Motif ──────────────────────────────────────────────────
const Bracket = ({ className = "" }: { className?: string }) => (
  <span className={`text-muted-foreground font-light select-none ${className}`}>[ ]</span>
);

// ─── Section Label ─────────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-4 flex items-center gap-3">
    <span className="inline-block w-8 h-px bg-border" />
    {children}
    <span className="inline-block w-8 h-px bg-border" />
  </p>
);

// ─── Feature Card ──────────────────────────────────────────────────────────
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag?: string;
}

const FeatureCard = ({ icon, title, description, tag }: FeatureCardProps) => (
  <div className="border border-border p-8 flex flex-col gap-4 hover:border-foreground transition-colors duration-300 group">
    <div className="flex items-start justify-between">
      <div className="text-foreground">{icon}</div>
      {tag && (
        <span className="text-[10px] tracking-widest uppercase border border-foreground px-2 py-0.5 text-foreground">
          {tag}
        </span>
      )}
    </div>
    <div>
      <h3 className="text-sm font-light tracking-widest uppercase text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed font-light">{description}</p>
    </div>
    <div className="mt-auto pt-4">
      <span className="text-xs tracking-widest uppercase text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-2">
        Learn more <ArrowRight size={12} />
      </span>
    </div>
  </div>
);

// ─── Pricing Card ──────────────────────────────────────────────────────────
interface PricingCardProps {
  plan: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  featured?: boolean;
}

const PricingCard = ({ plan, price, period, description, features, cta, featured }: PricingCardProps) => (
  <div
    className={`border p-8 flex flex-col gap-6 ${
      featured ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground"
    }`}
  >
    <div>
      <p className={`text-[10px] tracking-[0.3em] uppercase mb-4 ${featured ? "text-background/60" : "text-muted-foreground"}`}>
        {plan}
      </p>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-light">{price}</span>
        {period && (
          <span className={`text-sm font-light ${featured ? "text-background/60" : "text-muted-foreground"}`}>
            {period}
          </span>
        )}
      </div>
      <p className={`text-sm font-light mt-2 ${featured ? "text-background/70" : "text-muted-foreground"}`}>
        {description}
      </p>
    </div>

    <ul className="flex flex-col gap-3">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-3 text-sm font-light">
          <Check size={14} className={`mt-0.5 shrink-0 ${featured ? "text-background" : "text-foreground"}`} />
          <span className={featured ? "text-background/80" : "text-muted-foreground"}>{f}</span>
        </li>
      ))}
    </ul>

    <div className="mt-auto">
      {featured ? (
        <Button
          variant="outline"
          className="w-full border-background text-background hover:bg-background hover:text-foreground"
          asChild
        >
          <Link to="/signup">{cta}</Link>
        </Button>
      ) : (
        <Button variant="outline" className="w-full" asChild>
          <Link to="/signup">{cta}</Link>
        </Button>
      )}
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────
const Index = () => {
  const features = [
    {
      icon: <Image size={20} strokeWidth={1} />,
      title: "Client Galleries",
      description:
        "Password-protected galleries with high-resolution delivery. Control downloads, set expiration dates, and let clients mark their favorites.",
    },
    {
      icon: <Camera size={20} strokeWidth={1} />,
      title: "Portfolio",
      description:
        "A public-facing portfolio page that showcases your work across collections, with a contact form and custom domain support.",
    },
    {
      icon: <ShoppingBag size={20} strokeWidth={1} />,
      title: "Print Store",
      description:
        "Sell prints, canvases, albums, and digital downloads directly from your galleries. Orders managed in one place.",
    },
    {
      icon: <Zap size={20} strokeWidth={1} />,
      title: "Lightroom Plugin",
      description:
        "Publish photos straight from Adobe Lightroom Classic to any gallery — no exporting, no uploading. One click.",
      tag: "Key Feature",
    },
  ];

  const plans = [
    {
      plan: "Free",
      price: "$0",
      period: "/mo",
      description: "For photographers just getting started.",
      features: ["3 galleries", "2 GB storage", "Basic gallery layouts", "Davions watermark"],
      cta: "Start for Free",
    },
    {
      plan: "Pro",
      price: "$19",
      period: "/mo",
      description: "For working photographers who need everything.",
      features: [
        "Unlimited galleries",
        "100 GB storage",
        "No watermark",
        "Print store",
        "Custom domain",
        "Lightroom plugin",
      ],
      cta: "Get Started",
      featured: true,
    },
    {
      plan: "Business",
      price: "$39",
      period: "/mo",
      description: "For studios and high-volume professionals.",
      features: [
        "Unlimited galleries",
        "500 GB storage",
        "All Pro features",
        "Priority support",
        "Branding removal",
        "Team access",
      ],
      cta: "Get Started",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col items-center text-center gap-8">
            {/* Bracket motif */}
            <div className="flex items-center gap-4 text-muted-foreground font-light text-sm tracking-widest">
              <span className="text-lg">¬</span>
              <span className="tracking-[0.3em] uppercase text-xs">Galleries · Portfolio · Store</span>
              <span className="text-lg rotate-90">¬</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-light tracking-tight leading-[1.1] text-foreground">
              Your work.
              <br />
              <span className="italic">Delivered beautifully.</span>
            </h1>

            <p className="text-base md:text-lg font-light text-muted-foreground max-w-xl leading-relaxed">
              Davions is the all-in-one platform for photographers to deliver galleries,
              showcase their portfolio, and sell prints — in one seamless place.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
              <Button size="lg" asChild>
                <Link to="/signup">Start for Free</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#features">See Features</a>
              </Button>
            </div>

            {/* Thin divider line */}
            <div className="w-full border-t border-border mt-8 pt-8 flex flex-wrap justify-center gap-x-10 gap-y-2">
              {["No credit card required", "3 free galleries", "Cancel anytime"].map((item) => (
                <span key={item} className="text-xs tracking-widest uppercase text-muted-foreground flex items-center gap-2">
                  <span className="w-3 h-px bg-border inline-block" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <SectionLabel>Features</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-light tracking-wide text-foreground">
              Everything in one place.
            </h2>
            <p className="text-sm text-muted-foreground font-light mt-3 max-w-sm leading-relaxed">
              No separate modules. No add-ons. Every feature available from day one.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {features.map((f) => (
              <div key={f.title} className="bg-background">
                <FeatureCard {...f} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIGHTROOM PLUGIN SPOTLIGHT ───────────────────────────────── */}
      <section id="integrations" className="py-24 px-6 border-t border-border bg-foreground text-background">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="flex flex-col gap-6">
              <SectionLabel>
                <span className="text-background/50">Lightroom Plugin</span>
              </SectionLabel>
              <h2 className="text-3xl md:text-4xl font-light tracking-wide">
                Publish from Lightroom.
                <br />
                <span className="italic">Instantly.</span>
              </h2>
              <p className="text-sm font-light text-background/70 leading-relaxed">
                The Davions Lightroom Classic plugin connects directly to your account.
                Select photos, choose a gallery, and hit Publish — photos go live without
                a single export or upload step.
              </p>
              <ul className="flex flex-col gap-3">
                {[
                  "Native Lightroom Classic integration",
                  "Publish to existing or new galleries",
                  "Authenticate with your API token",
                  "Full image quality control",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-light text-background/80">
                    <span className="w-4 h-px bg-background/30 inline-block shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="outline"
                  className="border-background text-background hover:bg-background hover:text-foreground"
                  asChild
                >
                  <Link to="/signup">Download Plugin</Link>
                </Button>
              </div>
            </div>

            {/* Visual mock */}
            <div className="border border-background/20 p-8 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-background/10 pb-4">
                <span className="text-xs tracking-widest uppercase text-background/50">Lightroom Publish Panel</span>
                <span className="w-2 h-2 rounded-full bg-background/80 inline-block" />
              </div>
              <div className="flex flex-col gap-2">
                {["Wedding — Sarah & Tom", "Portrait Session — Nov 2024", "Corporate Event — Acme Co."].map(
                  (gallery, i) => (
                    <div
                      key={gallery}
                      className="flex items-center justify-between py-2 border-b border-background/10 text-xs font-light"
                    >
                      <span className="text-background/70">{gallery}</span>
                      <span
                        className={`text-[10px] tracking-widest uppercase px-2 py-0.5 border ${
                          i === 0
                            ? "border-background/40 text-background/60"
                            : "border-background/20 text-background/30"
                        }`}
                      >
                        {i === 0 ? "Syncing..." : "Published"}
                      </span>
                    </div>
                  ),
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-background/80 inline-block animate-pulse" />
                <span className="text-[10px] tracking-widest uppercase text-background/50">
                  Connected · Last sync 2 min ago
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <SectionLabel>Pricing</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-light tracking-wide text-foreground">
              Simple, transparent pricing.
            </h2>
            <p className="text-sm text-muted-foreground font-light mt-3 max-w-sm leading-relaxed">
              Start free. Upgrade when your business grows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div key={plan.plan} className="bg-background">
                <PricingCard {...plan} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-border">
        <div className="container mx-auto max-w-2xl text-center flex flex-col items-center gap-6">
          <div className="flex items-center gap-3 text-muted-foreground text-sm font-light">
            <span>¬</span>
            <span className="tracking-widest uppercase text-xs">Get Started</span>
            <span className="rotate-90">¬</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-light tracking-wide text-foreground">
            Deliver more.
            <br />
            <span className="italic">Impress always.</span>
          </h2>
          <p className="text-sm text-muted-foreground font-light max-w-sm leading-relaxed">
            Join photographers who use Davions to deliver beautiful galleries and grow their business.
          </p>
          <Button size="lg" asChild>
            <Link to="/signup">
              Create Your Free Account <ArrowRight size={14} />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-12 px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            {/* Brand */}
            <div className="flex flex-col gap-3">
              <img src={logoPrincipal} alt="Davions" className="h-6 w-auto" />
              <p className="text-xs font-light text-muted-foreground max-w-xs leading-relaxed">
                The all-in-one platform for photographers to deliver, showcase, and sell their work.
              </p>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Product",
                  links: ["Galleries", "Portfolio", "Store", "Lightroom Plugin"],
                },
                {
                  title: "Company",
                  links: ["About", "Blog", "Careers", "Contact"],
                },
                {
                  title: "Support",
                  links: ["Documentation", "Help Center", "Pricing", "Status"],
                },
              ].map((col) => (
                <div key={col.title} className="flex flex-col gap-3">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">{col.title}</p>
                  {col.links.map((link) => (
                    <a
                      key={link}
                      href="#"
                      className="text-xs font-light text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-[10px] tracking-widest uppercase text-muted-foreground">
              © 2026 Davions. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              {["Privacy Policy", "Terms of Service"].map((item) => (
                <a key={item} href="#" className="text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors">
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
