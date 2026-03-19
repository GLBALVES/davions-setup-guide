/**
 * Resolves the photographer from the custom domain hostname,
 * validates the gallery slug belongs to that photographer,
 * then delegates to GalleryView — same pattern as CustomDomainSessionGateway.
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentHostname } from "@/lib/custom-domain";
import { Camera } from "lucide-react";
import GalleryView from "@/pages/gallery/GalleryView";
import logoPreto from "@/assets/logo_principal_preto.png";

interface PhotographerMeta {
  id: string;
  full_name: string | null;
  business_name: string | null;
  hero_image_url: string | null;
}

/* ── Branded loading / error shell ── */
const BrandedLoader = ({ photographer }: { photographer: PhotographerMeta | null }) => {
  const displayName =
    photographer?.business_name || photographer?.full_name || "";

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: photographer?.hero_image_url ? 1 : 0 }}
      >
        {photographer?.hero_image_url && (
          <>
            <img
              src={photographer.hero_image_url}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/65" />
          </>
        )}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div
          className="transition-opacity duration-500"
          style={{ opacity: photographer ? 0 : 1, height: photographer ? 0 : "auto", overflow: "hidden" }}
        >
          <img
            src={logoPreto}
            alt="Davions"
            className="h-5 object-contain invert opacity-40 mb-14"
          />
        </div>

        {photographer ? (
          <>
            <p className="text-[9px] tracking-[0.5em] uppercase text-white/50 mb-3">
              Photography by
            </p>
            <h1 className="text-3xl md:text-4xl font-light tracking-[0.15em] uppercase text-white mb-6 text-center">
              {displayName}
            </h1>
            <div className="w-8 h-px bg-white/30 mb-6" />
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-white/40 animate-pulse"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-white/30 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-8 flex flex-col items-center gap-3">
        <div className="w-6 h-px bg-white/10" />
        <p className="text-[9px] tracking-widest uppercase text-white/20">
          Powered by Davions
        </p>
      </div>
    </div>
  );
};

const CustomDomainGalleryGateway = () => {
  const { slug } = useParams<{ slug: string }>();
  const [photographer, setPhotographer] = useState<PhotographerMeta | null>(null);
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    const validate = async () => {
      const hostname = getCurrentHostname();

      // 1. Resolve photographer by custom domain
      const { data: photoData } = await supabase
        .from("photographers")
        .select("id, full_name, business_name, hero_image_url")
        .eq("custom_domain", hostname)
        .single();

      if (!photoData?.id) {
        setValid(false);
        return;
      }

      setPhotographer(photoData as PhotographerMeta);

      // 2. Verify the gallery slug belongs to this photographer and is published
      const { data: gallery } = await supabase
        .from("galleries")
        .select("id")
        .eq("slug", slug ?? "")
        .eq("photographer_id", photoData.id)
        .eq("status", "published")
        .single();

      setValid(!!gallery?.id);
    };

    validate();
  }, [slug]);

  // Stage 1 (no data yet) or Stage 2 (photographer resolved, validating gallery)
  if (valid === null) {
    return <BrandedLoader photographer={photographer} />;
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
        <img
          src={logoPreto}
          alt="Davions"
          className="h-6 object-contain invert opacity-70 mb-16"
        />

        <div className="relative mb-10">
          <div className="absolute inset-0 rounded-full border border-white/5 scale-150" />
          <div className="absolute inset-0 rounded-full border border-white/5 scale-[2.5]" />
          <Camera className="h-10 w-10 text-white/10 relative z-10" />
        </div>

        <h1 className="text-sm font-light tracking-[0.2em] uppercase text-white/60 mb-3 text-center">
          Gallery not found
        </h1>
        <p className="text-[11px] text-white/30 font-light text-center max-w-xs leading-relaxed">
          This gallery does not exist or is not available on this domain.
        </p>

        <div className="mt-16 flex flex-col items-center gap-4">
          <div className="w-16 h-px bg-white/10" />
          <p className="text-[9px] tracking-widest uppercase text-white/20">
            Powered by Davions
          </p>
        </div>
      </div>
    );
  }

  return <GalleryView />;
};

export default CustomDomainGalleryGateway;
