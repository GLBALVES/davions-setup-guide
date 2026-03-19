/**
 * Shared branded loading screen for custom domain gateways.
 *
 * Stage 1 (photographer = null): dark bg + Davions logo + dots
 * Stage 2 (photographer resolved): hero image bg + photographer name + dots
 */

import logoPreto from "@/assets/logo_principal_preto.png";

interface PhotographerBranding {
  full_name?: string | null;
  business_name?: string | null;
  hero_image_url?: string | null;
  email?: string | null;
}

interface Props {
  photographer: PhotographerBranding | null;
}

const CustomDomainLoader = ({ photographer }: Props) => {
  const displayName =
    photographer?.business_name ||
    photographer?.full_name ||
    photographer?.email ||
    "";

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden">
      {/* Hero background — always mounted so CSS opacity transition works */}
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

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Stage 1 logo — collapses when photographer resolves */}
        <div
          className="transition-opacity duration-500"
          style={{
            opacity: photographer ? 0 : 1,
            height: photographer ? 0 : "auto",
            overflow: "hidden",
          }}
        >
          <img
            src={logoPreto}
            alt="Davions"
            className="h-5 object-contain invert opacity-40 mb-14"
          />
        </div>

        {photographer ? (
          /* Stage 2 — photographer known */
          <div className="flex flex-col items-center animate-in fade-in duration-500">
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
          </div>
        ) : (
          /* Stage 1 — resolving */
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

      {/* Footer */}
      <div className="absolute bottom-8 flex flex-col items-center gap-3">
        <div className="w-6 h-px bg-white/10" />
        <p className="text-[9px] tracking-widest uppercase text-white/20">
          Powered by Davions
        </p>
      </div>
    </div>
  );
};

export default CustomDomainLoader;
