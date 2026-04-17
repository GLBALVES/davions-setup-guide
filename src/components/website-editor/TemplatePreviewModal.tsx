import { ExternalLink, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import PublicSiteRenderer, {
  type SiteConfig,
  type Photographer,
  type Session,
  type Gallery,
} from "@/components/store/PublicSiteRenderer";

interface TemplatePreviewModalProps {
  open: boolean;
  onClose: () => void;
  templateId: string;
  templateLabel: string;
  storeSlug: string;
  onApply: (templateId: string) => void;
  isCurrentTemplate: boolean;
  // These are intentionally IGNORED for content — kept in props for API compatibility.
  // The preview is fully isolated from the live site state.
  siteData?: Partial<SiteConfig> | null;
  photographer?: Photographer | null;
  sessions?: Session[];
  galleries?: Gallery[];
}

// Demo placeholders so templates don't render empty on preview
const DEMO_HERO = "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80";
const DEMO_ABOUT = "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80";
const DEMO_SESSION_IMG = "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80";
const DEMO_GALLERY_IMG = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80";

const DEMO_SESSIONS: Session[] = [
  {
    id: "demo-1", slug: null, title: "Editorial Portrait", description: "Refined studio session.",
    tagline: "Signature", price: 45000, duration_minutes: 90, num_photos: 25,
    location: "Studio", cover_image_url: DEMO_SESSION_IMG, category: "Portrait",
  },
  {
    id: "demo-2", slug: null, title: "Wedding Day", description: "Full coverage of your day.",
    tagline: "Premium", price: 250000, duration_minutes: 480, num_photos: 400,
    location: "On location", cover_image_url: DEMO_HERO, category: "Wedding",
  },
  {
    id: "demo-3", slug: null, title: "Family Session", description: "Outdoor lifestyle.",
    tagline: "Lifestyle", price: 35000, duration_minutes: 60, num_photos: 20,
    location: "Park", cover_image_url: DEMO_ABOUT, category: "Family",
  },
];

const DEMO_GALLERIES: Gallery[] = [
  { id: "demo-g1", slug: null, title: "Sofia & Marco", category: "Wedding", cover_image_url: DEMO_HERO },
  { id: "demo-g2", slug: null, title: "Studio Editorial", category: "Portrait", cover_image_url: DEMO_SESSION_IMG },
  { id: "demo-g3", slug: null, title: "Golden Hour", category: "Family", cover_image_url: DEMO_ABOUT },
];

function buildCleanSite(): SiteConfig {
  return {
    site_hero_image_url: DEMO_HERO,
    site_headline: "Your Story, Beautifully Told",
    site_subheadline: "Timeless photography for life's most meaningful moments.",
    cta_text: "Book a Session",
    cta_link: "#sessions",
    logo_url: null,
    tagline: null,
    accent_color: null,
    about_title: "About",
    about_image_url: DEMO_ABOUT,
    instagram_url: null,
    facebook_url: null,
    pinterest_url: null,
    tiktok_url: null,
    youtube_url: null,
    whatsapp: null,
    linkedin_url: null,
    footer_text: null,
    show_about: true,
    show_store: true,
    show_booking: true,
    show_blog: false,
    show_contact: true,
    seo_title: null,
    seo_description: null,
    og_image_url: null,
    site_template: null,
    favicon_url: null,
    quote_text: "Every photograph is a memory crafted to last forever.",
    quote_author: "— Studio",
    experience_title: "The Experience",
    experience_text: "From the first conversation to your final gallery, every detail is handled with care.",
    hero_layout: null,
    about_layout: null,
    testimonials: null,
    testimonials_title: null,
    testimonials_layout: null,
    header_bg_color: null,
    header_text_color: null,
    header_visible_socials: null,
    footer_bg_color: null,
    footer_text_color: null,
    footer_show_logo: true,
    footer_show_socials: false,
    footer_visible_socials: null,
    footer_preset: null,
    hero_bg_color: null,
    hero_text_color: null,
    sessions_bg_color: null,
    sessions_text_color: null,
    portfolio_bg_color: null,
    portfolio_text_color: null,
    about_bg_color: null,
    about_text_color: null,
    quote_bg_color: null,
    quote_text_color: null,
    experience_bg_color: null,
    experience_text_color: null,
    contact_bg_color: null,
    contact_text_color: null,
    testimonials_bg_color: null,
    testimonials_text_color: null,
  };
}

export function TemplatePreviewModal({
  open,
  onClose,
  templateId,
  templateLabel,
  storeSlug,
  onApply,
  isCurrentTemplate,
}: TemplatePreviewModalProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Open Full uses isolated preview mode so the public StorePage also strips
  // live data and only renders the chosen template visually.
  const previewUrl = `/store/${storeSlug}?preview=${templateId}&clean=1`;

  // Always use sanitized data — never inherit live site config.
  const cleanSite = useMemo(() => ({ ...buildCleanSite(), site_template: templateId }), [templateId]);
  const cleanPhotographer: Photographer = useMemo(() => ({
    id: "preview",
    full_name: "Studio",
    email: "studio@example.com",
    store_slug: storeSlug,
    bio: null,
    business_name: "Studio",
  }), [storeSlug]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 flex flex-col border border-border bg-background shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 overflow-hidden"
          style={{ width: "95vw", maxWidth: "95vw", height: "90vh" }}
        >
          <DialogPrimitive.Title className="sr-only">
            {templateLabel} Preview
          </DialogPrimitive.Title>

          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background shrink-0">
            <div className="flex items-center gap-3">
              <p className="text-[11px] tracking-[0.2em] uppercase font-light text-foreground">
                {templateLabel}
              </p>
              <span className="text-[10px] text-muted-foreground font-light">Clean preview</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] tracking-wider uppercase font-light px-3 gap-1.5"
                onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-3 w-3" />
                Open Full
              </Button>

              {!isCurrentTemplate && (
                <Button
                  size="sm"
                  className="h-7 text-[10px] tracking-wider uppercase font-light px-3"
                  onClick={() => { onApply(templateId); onClose(); }}
                >
                  Apply Template
                </Button>
              )}

              <DialogPrimitive.Close asChild>
                <button className="ml-1 p-1 rounded-sm text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Preview area — always inline render, fully isolated */}
          <div className="flex-1 min-h-0 overflow-auto bg-background">
            <PublicSiteRenderer
              photographer={cleanPhotographer}
              site={cleanSite}
              sessions={DEMO_SESSIONS}
              galleries={DEMO_GALLERIES}
              scrolled={scrolled}
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
              seoUrl={`/store/${storeSlug}`}
              sessionHref={() => "#"}
              galleryHref={() => "#"}
              blogHref="#"
              previewTemplate={templateId}
              extraNavLinks={[]}
              visibleSections={null}
              pageSections={[]}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
