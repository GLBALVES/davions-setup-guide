import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const TermsOfService = () => {
  const { t } = useLanguage();
  const s = t.lgpd.terms;

  return (
    <>
      <SEOHead title={s.title} description={s.metaDesc} />
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-8 tracking-wider uppercase font-light">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.common.back}
          </Link>

          <h1 className="text-2xl font-light tracking-wide mb-2">{s.title}</h1>
          <p className="text-xs text-muted-foreground mb-10">{s.lastUpdated}: 2026-04-13</p>

          <article className="prose prose-sm max-w-none text-foreground/90 font-light leading-relaxed [&_h2]:text-sm [&_h2]:tracking-widest [&_h2]:uppercase [&_h2]:font-light [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:text-xs [&_p]:mb-4 [&_ul]:text-xs [&_li]:mb-1">
            <h2>{s.acceptanceTitle}</h2>
            <p>{s.acceptanceText}</p>

            <h2>{s.serviceTitle}</h2>
            <p>{s.serviceText}</p>

            <h2>{s.accountTitle}</h2>
            <p>{s.accountText}</p>

            <h2>{s.paymentTitle}</h2>
            <p>{s.paymentText}</p>

            <h2>{s.intellectualPropertyTitle}</h2>
            <p>{s.intellectualPropertyText}</p>

            <h2>{s.limitationTitle}</h2>
            <p>{s.limitationText}</p>

            <h2>{s.terminationTitle}</h2>
            <p>{s.terminationText}</p>

            <h2>{s.governingLawTitle}</h2>
            <p>{s.governingLawText}</p>

            <h2>{s.contactTitle}</h2>
            <p>{s.contactText}</p>
          </article>
        </div>
      </div>
    </>
  );
};

export default TermsOfService;
