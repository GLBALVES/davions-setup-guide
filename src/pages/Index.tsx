import { Link } from "react-router-dom";
import { Camera, Image, ShoppingBag, Zap, Check, ArrowRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import logoPrincipal from "@/assets/logo_principal_preto.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegion, REGIONAL_PLANS } from "@/contexts/RegionContext";

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
  learnMore: string;
}

const FeatureCard = ({ icon, title, description, tag, learnMore }: FeatureCardProps) => (
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
        {learnMore} <ArrowRight size={12} />
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
  const { t } = useLanguage();
  const l = t.landing;
  const region = useRegion();

  const starterPrice = REGIONAL_PLANS.starter[region.currency] ?? REGIONAL_PLANS.starter.USD;
  const proPrice = REGIONAL_PLANS.pro[region.currency] ?? REGIONAL_PLANS.pro.USD;
  const studioPrice = REGIONAL_PLANS.studio[region.currency] ?? REGIONAL_PLANS.studio.USD;

  const currencyBadge = !region.loading && region.currency !== "USD"
    ? `${region.symbol} · ${region.country}`
    : null;

  const periodLabel = l.plan1Period ?? "/month";

  const features = [
    {
      icon: <Image size={20} strokeWidth={1} />,
      title: l.feature1Title,
      description: l.feature1Desc,
    },
    {
      icon: <Camera size={20} strokeWidth={1} />,
      title: l.feature2Title,
      description: l.feature2Desc,
    },
    {
      icon: <ShoppingBag size={20} strokeWidth={1} />,
      title: l.feature3Title,
      description: l.feature3Desc,
    },
    {
      icon: <Zap size={20} strokeWidth={1} />,
      title: l.feature4Title,
      description: l.feature4Desc,
      tag: l.featuresKeyFeatureTag,
    },
  ];

  const plans = [
    {
      plan: l.plan1Name,
      price: l.plan1Price,
      period: l.plan1Period,
      description: l.plan1Desc,
      features: [l.plan1F1, l.plan1F2, l.plan1F3, l.plan1F4],
      cta: l.plan1Cta,
    },
    {
      plan: l.plan2Name,
      price: l.plan2Price,
      period: l.plan2Period,
      description: l.plan2Desc,
      features: [l.plan2F1, l.plan2F2, l.plan2F3, l.plan2F4, l.plan2F5, l.plan2F6],
      cta: l.plan2Cta,
      featured: true,
    },
    {
      plan: l.plan3Name,
      price: l.plan3Price,
      period: l.plan3Period,
      description: l.plan3Desc,
      features: [l.plan3F1, l.plan3F2, l.plan3F3, l.plan3F4, l.plan3F5, l.plan3F6],
      cta: l.plan3Cta,
    },
  ];

  const lrGalleries = [
    "Wedding — Sarah & Tom",
    "Portrait Session — Nov 2024",
    "Corporate Event — Acme Co.",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col items-center text-center gap-8">
            <div className="flex items-center gap-4 text-muted-foreground font-light text-sm tracking-widest">
              <span className="text-lg">¬</span>
              <span className="tracking-[0.3em] uppercase text-xs">{l.heroTag}</span>
              <span className="text-lg rotate-90">¬</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-light tracking-tight leading-[1.1] text-foreground">
              {l.heroHeadline1}
              <br />
              <span className="italic">{l.heroHeadline2}</span>
            </h1>

            <p className="text-base md:text-lg font-light text-muted-foreground max-w-xl leading-relaxed">
              {l.heroSubheadline}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
              <Button size="lg" asChild>
                <Link to="/signup">{l.heroCta}</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#features">{l.heroSeeFeaturesBtn}</a>
              </Button>
            </div>

            <div className="w-full border-t border-border mt-8 pt-8 flex flex-wrap justify-center gap-x-10 gap-y-2">
              {[l.heroBadge1, l.heroBadge2, l.heroBadge3].map((item) => (
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
            <SectionLabel>{l.featuresSectionLabel}</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-light tracking-wide text-foreground">
              {l.featuresHeading}
            </h2>
            <p className="text-sm text-muted-foreground font-light mt-3 max-w-sm leading-relaxed">
              {l.featuresSubheading}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {features.map((f) => (
              <div key={f.title} className="bg-background">
                <FeatureCard {...f} learnMore={l.featuresLearnMore} />
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
                <span className="text-background/50">{l.lrSectionLabel}</span>
              </SectionLabel>
              <h2 className="text-3xl md:text-4xl font-light tracking-wide">
                {l.lrHeading1}
                <br />
                <span className="italic">{l.lrHeading2}</span>
              </h2>
              <p className="text-sm font-light text-background/70 leading-relaxed">
                {l.lrSubheadline}
              </p>
              <ul className="flex flex-col gap-3">
                {[l.lrBullet1, l.lrBullet2, l.lrBullet3, l.lrBullet4].map((item) => (
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
                  <Link to="/signup">{l.lrCta}</Link>
                </Button>
              </div>
            </div>

            {/* Visual mock */}
            <div className="border border-background/20 p-8 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-background/10 pb-4">
                <span className="text-xs tracking-widest uppercase text-background/50">{l.lrPanelLabel}</span>
                <span className="w-2 h-2 rounded-full bg-background/80 inline-block" />
              </div>
              <div className="flex flex-col gap-2">
                {lrGalleries.map((gallery, i) => (
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
                      {i === 0 ? l.lrSyncing : l.lrPublished}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-background/80 inline-block animate-pulse" />
                <span className="text-[10px] tracking-widest uppercase text-background/50">
                  {l.lrStatus}
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
            <SectionLabel>{l.pricingSectionLabel}</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-light tracking-wide text-foreground">
              {l.pricingHeading}
            </h2>
            <p className="text-sm text-muted-foreground font-light mt-3 max-w-sm leading-relaxed">
              {l.pricingSubheading}
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
            <span className="tracking-widest uppercase text-xs">{l.ctaTag}</span>
            <span className="rotate-90">¬</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-light tracking-wide text-foreground">
            {l.ctaHeading1}
            <br />
            <span className="italic">{l.ctaHeading2}</span>
          </h2>
          <p className="text-sm text-muted-foreground font-light max-w-sm leading-relaxed">
            {l.ctaSubheading}
          </p>
          <Button size="lg" asChild>
            <Link to="/signup">
              {l.ctaBtn} <ArrowRight size={14} />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-12 px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            {/* Brand */}
            <div className="flex flex-col gap-3 items-start">
              <img src={logoPrincipal} alt="Davions" className="h-6 w-auto object-contain" />
              <p className="text-xs font-light text-muted-foreground max-w-xs leading-relaxed">
                {l.footerTagline}
              </p>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              {[
                { title: l.footerProduct, links: l.footerProductLinks.split(",") },
                { title: l.footerCompany, links: l.footerCompanyLinks.split(",") },
                { title: l.footerSupport, links: l.footerSupportLinks.split(",") },
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
              {l.footerCopyright}
            </p>
            <div className="flex items-center gap-6">
              {[l.footerPrivacy, l.footerTerms].map((item) => (
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
