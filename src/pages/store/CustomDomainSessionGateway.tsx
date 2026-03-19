/**
 * Resolves the photographer's store_slug from the custom domain hostname,
 * then delegates to SessionDetailPage by injecting the slug via context so
 * the existing booking logic is reused without duplication.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentHostname } from "@/lib/custom-domain";
import SessionDetailPage from "./SessionDetailPage";
import { CustomDomainSlugContext } from "@/contexts/CustomDomainSlugContext";
import CustomDomainLoader from "@/components/store/CustomDomainLoader";

interface PhotographerMeta {
  store_slug: string | null;
  full_name: string | null;
  business_name: string | null;
  hero_image_url: string | null;
}

const CustomDomainSessionGateway = () => {
  const { sessionSlug } = useParams<{ sessionSlug: string }>();
  const navigate = useNavigate();
  const [photographer, setPhotographer] = useState<PhotographerMeta | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const resolve = async () => {
      const hostname = getCurrentHostname();

      const { data } = await supabase
        .from("photographers")
        .select("store_slug, full_name, business_name, hero_image_url")
        .eq("custom_domain", hostname)
        .single();

      if (!data?.store_slug) {
        setNotFound(true);
      } else {
        setPhotographer(data as PhotographerMeta);
        setSlug(data.store_slug);
      }
      setLoading(false);
    };

    resolve();
  }, []);

  if (loading) {
    return <BrandedLoader photographer={photographer} />;
  }

  if (notFound || !slug) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 px-6">
        <img
          src={logoPreto}
          alt="Davions"
          className="h-5 object-contain invert opacity-40 mb-10"
        />
        <p className="text-sm font-light text-white/50">Session not found.</p>
        <button
          onClick={() => navigate("/")}
          className="text-xs tracking-wider uppercase text-white/30 hover:text-white/60 transition-colors"
        >
          ← Back to store
        </button>
        <div className="mt-12 flex flex-col items-center gap-3">
          <div className="w-6 h-px bg-white/10" />
          <p className="text-[9px] tracking-widest uppercase text-white/20">
            Powered by Davions
          </p>
        </div>
      </div>
    );
  }

  // Provide the resolved slug so SessionDetailPage can use it for back-navigation
  return (
    <CustomDomainSlugContext.Provider value={slug}>
      <SessionDetailPage />
    </CustomDomainSlugContext.Provider>
  );
};

export default CustomDomainSessionGateway;
