import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const PrivacyPolicy = () => {
  const { t } = useLanguage();
  const p = t.lgpd.privacy;

  return (
    <>
      <SEOHead title={p.title} description={p.metaDesc} />
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-8 tracking-wider uppercase font-light">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.common.back}
          </Link>

          <h1 className="text-2xl font-light tracking-wide mb-2">{p.title}</h1>
          <p className="text-xs text-muted-foreground mb-10">{p.lastUpdated}: 2026-04-13</p>

          <article className="prose prose-sm max-w-none text-foreground/90 font-light leading-relaxed [&_h2]:text-sm [&_h2]:tracking-widest [&_h2]:uppercase [&_h2]:font-light [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:text-xs [&_p]:mb-4 [&_ul]:text-xs [&_li]:mb-1">
            <h2>{p.dataCollectedTitle}</h2>
            <p>{p.dataCollectedText}</p>
            <ul>
              {p.dataCollectedItems.map((item: string, i: number) => <li key={i}>• {item}</li>)}
            </ul>

            <h2>{p.purposeTitle}</h2>
            <p>{p.purposeText}</p>

            <h2>{p.legalBasisTitle}</h2>
            <p>{p.legalBasisText}</p>

            <h2>{p.rightsTitle}</h2>
            <p>{p.rightsText}</p>
            <ul>
              {p.rightsItems.map((item: string, i: number) => <li key={i}>• {item}</li>)}
            </ul>

            <h2>{p.retentionTitle}</h2>
            <p>{p.retentionText}</p>

            <h2>{p.sharingTitle}</h2>
            <p>{p.sharingText}</p>

            <h2>{p.cookiesTitle}</h2>
            <p>{p.cookiesText}</p>

            <h2>{p.contactTitle}</h2>
            <p>{p.contactText}</p>
          </article>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;
