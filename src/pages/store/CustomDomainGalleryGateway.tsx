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
import CustomDomainLoader from "@/components/store/CustomDomainLoader";

interface PhotographerMeta {
  id: string;
  full_name: string | null;
  business_name: string | null;
  hero_image_url: string | null;
}

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
