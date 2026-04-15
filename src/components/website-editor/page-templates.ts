// ── Page Section Types & Template Definitions ───────────────────────────────
// Each template produces an array of sections that the page editor can render.

export type SectionType =
  | "hero"
  | "text"
  | "image-text"
  | "text-image"
  | "gallery-grid"
  | "gallery-masonry"
  | "contact-form"
  | "map"
  | "cta"
  | "pricing-table"
  | "faq-accordion"
  | "timeline"
  | "testimonials"
  | "stats"
  | "team"
  | "spacer"
  | "divider"
  | "video"
  | "columns-2"
  | "columns-3"
  | "slideshow"
  | "carousel"
  | "instagram-feed"
  | "social-links"
  | "embed"
  | "logo-strip";

export interface PageSection {
  id: string;
  type: SectionType;
  label: string;
  /** Placeholder content — editor fills in real data */
  props: Record<string, unknown>;
}

let _counter = 0;
const uid = () => `sec-${Date.now()}-${++_counter}`;

// ── Helper builders ──────────────────────────────────────────────────────────

const hero = (headline: string, subtitle: string): PageSection => ({
  id: uid(),
  type: "hero",
  label: "Hero",
  props: { headline, subtitle, backgroundImage: "", ctaText: "", ctaLink: "" },
});

const text = (label: string, body: string): PageSection => ({
  id: uid(),
  type: "text",
  label,
  props: { body },
});

const imageText = (label: string): PageSection => ({
  id: uid(),
  type: "image-text",
  label,
  props: { image: "", title: "", body: "" },
});

const textImage = (label: string): PageSection => ({
  id: uid(),
  type: "text-image",
  label,
  props: { image: "", title: "", body: "" },
});

const galleryGrid = (label = "Gallery Grid"): PageSection => ({
  id: uid(),
  type: "gallery-grid",
  label,
  props: { columns: 3, images: [] },
});

const galleryMasonry = (label = "Gallery Masonry"): PageSection => ({
  id: uid(),
  type: "gallery-masonry",
  label,
  props: { columns: 3, images: [] },
});

const contactForm = (): PageSection => ({
  id: uid(),
  type: "contact-form",
  label: "Contact Form",
  props: { fields: ["name", "email", "message"], submitLabel: "Send" },
});

const mapSection = (): PageSection => ({
  id: uid(),
  type: "map",
  label: "Map",
  props: { address: "", lat: 0, lng: 0 },
});

const cta = (headline: string, buttonText: string): PageSection => ({
  id: uid(),
  type: "cta",
  label: "Call to Action",
  props: { headline, buttonText, buttonLink: "" },
});

const pricingTable = (): PageSection => ({
  id: uid(),
  type: "pricing-table",
  label: "Pricing",
  props: {
    plans: [
      { name: "Basic", price: "", features: [""] },
      { name: "Standard", price: "", features: [""] },
      { name: "Premium", price: "", features: [""] },
    ],
  },
});

const faqAccordion = (): PageSection => ({
  id: uid(),
  type: "faq-accordion",
  label: "FAQ",
  props: {
    items: [
      { question: "What is included?", answer: "" },
      { question: "How do I book?", answer: "" },
      { question: "What is the turnaround time?", answer: "" },
    ],
  },
});

const timeline = (label = "Timeline"): PageSection => ({
  id: uid(),
  type: "timeline",
  label,
  props: {
    events: [
      { year: "", title: "", description: "" },
      { year: "", title: "", description: "" },
      { year: "", title: "", description: "" },
    ],
  },
});

const testimonials = (): PageSection => ({
  id: uid(),
  type: "testimonials",
  label: "Testimonials",
  props: {
    items: [
      { quote: "", author: "", role: "" },
      { quote: "", author: "", role: "" },
    ],
  },
});

const stats = (): PageSection => ({
  id: uid(),
  type: "stats",
  label: "Stats",
  props: {
    items: [
      { value: "500+", label: "Sessions" },
      { value: "10+", label: "Years" },
      { value: "100%", label: "Satisfaction" },
    ],
  },
});

const team = (): PageSection => ({
  id: uid(),
  type: "team",
  label: "Team",
  props: { members: [{ name: "", role: "", photo: "" }] },
});

const spacer = (): PageSection => ({
  id: uid(),
  type: "spacer",
  label: "Spacer",
  props: { height: 60 },
});

const divider = (): PageSection => ({
  id: uid(),
  type: "divider",
  label: "Divider",
  props: {},
});

const video = (): PageSection => ({
  id: uid(),
  type: "video",
  label: "Video",
  props: { url: "", autoplay: false },
});

const columns2 = (): PageSection => ({
  id: uid(),
  type: "columns-2",
  label: "Two Columns",
  props: { left: "", right: "" },
});

const columns3 = (): PageSection => ({
  id: uid(),
  type: "columns-3",
  label: "Three Columns",
  props: { col1: "", col2: "", col3: "" },
});

const slideshow = (label = "Slideshow"): PageSection => ({
  id: uid(),
  type: "slideshow",
  label,
  props: { images: [], autoplay: true, interval: 5000, variant: "fullwidth" },
});

const carouselSection = (label = "Carousel"): PageSection => ({
  id: uid(),
  type: "carousel",
  label,
  props: { images: [], itemsVisible: 3, variant: "scroll" },
});

const instagramFeed = (): PageSection => ({
  id: uid(),
  type: "instagram-feed",
  label: "Instagram Feed",
  props: { count: 9, columns: 3, clickAction: "open-instagram", variant: "grid-3x3" },
});

const socialLinks = (): PageSection => ({
  id: uid(),
  type: "social-links",
  label: "Social Links",
  props: { links: [], style: "icons" },
});

const embed = (): PageSection => ({
  id: uid(),
  type: "embed",
  label: "Custom Code",
  props: { code: "", height: 400 },
});

const logoStrip = (): PageSection => ({
  id: uid(),
  type: "logo-strip",
  label: "Logo Strip",
  props: { title: "As Seen On", logos: [] },
});

// ── Template Definitions ─────────────────────────────────────────────────────


export function getTemplateSections(templateId: string): PageSection[] {
  _counter = 0; // reset for deterministic IDs within a call

  switch (templateId) {
    // ── Blank ──
    case "blank":
      return [text("Content", "Start writing here…")];

    // ── About ──
    case "about-1":
      return [
        hero("About Me", "The story behind the lens"),
        imageText("My Story"),
        stats(),
        testimonials(),
        cta("Let's work together", "Get in Touch"),
      ];
    case "about-2":
      return [
        hero("Our Studio", "Crafting visual stories since 2010"),
        textImage("Who We Are"),
        timeline("Our Journey"),
        team(),
        cta("Ready to create?", "Book Now"),
      ];
    case "about-3":
      return [
        hero("Meet the Photographer", "Passion. Art. Connection."),
        text("Bio", ""),
        galleryGrid("Featured Work"),
        testimonials(),
        contactForm(),
      ];

    // ── Contact ──
    case "contact-1":
      return [
        hero("Get in Touch", "I'd love to hear from you"),
        columns2(),
        contactForm(),
        mapSection(),
      ];
    case "contact-2":
      return [
        hero("Contact", "Let's start something beautiful"),
        contactForm(),
        text("Studio Hours", ""),
        mapSection(),
      ];

    // ── Gallery ──
    case "gallery-1":
      return [
        hero("Portfolio", "A curated collection"),
        galleryGrid("Gallery"),
        cta("Love what you see?", "Book a Session"),
      ];
    case "gallery-2":
      return [
        hero("Gallery", "Moments captured forever"),
        galleryMasonry("Gallery"),
        testimonials(),
        cta("Let's create yours", "Get in Touch"),
      ];
    case "gallery-3":
      return [
        galleryMasonry("Featured"),
        spacer(),
        galleryGrid("Recent Work"),
        divider(),
        cta("Want photos like these?", "Book Now"),
      ];

    // ── Homepage ──
    case "homepage-1":
      return [
        hero("Welcome", "Professional photography for life's greatest moments"),
        galleryGrid("Featured Work"),
        imageText("About"),
        testimonials(),
        cta("Book your session", "Get Started"),
      ];
    case "homepage-2":
      return [
        hero("Studio Name", "Timeless portraits. Authentic stories."),
        video(),
        columns3(),
        galleryMasonry("Latest Work"),
        stats(),
        cta("Ready?", "Contact Us"),
      ];

    // ── Portfolio ──
    case "portfolio-1":
      return [
        hero("Portfolio", "Selected works"),
        galleryMasonry("Projects"),
        spacer(),
        cta("Interested?", "Let's Talk"),
      ];
    case "portfolio-2":
      return [
        galleryGrid("Weddings"),
        divider(),
        galleryGrid("Portraits"),
        divider(),
        galleryGrid("Events"),
        cta("See something you love?", "Book a Session"),
      ];

    // ── Story ──
    case "story-1":
      return [
        hero("Our Story", "Every photo tells a story"),
        timeline("Milestones"),
        imageText("The Beginning"),
        textImage("Today"),
        testimonials(),
        cta("Be part of the story", "Get in Touch"),
      ];

    // ── Others ──
    case "other-1": // Pricing
      return [
        hero("Investment", "Transparent pricing for every occasion"),
        pricingTable(),
        faqAccordion(),
        cta("Have questions?", "Contact Me"),
      ];
    case "other-2": // FAQ
      return [
        hero("Frequently Asked Questions", "Everything you need to know"),
        faqAccordion(),
        cta("Still have questions?", "Send a Message"),
      ];

    default:
      return [text("Content", "Start writing here…")];
  }
}

/** Factory: create a single section by type (used by AddBlockPicker) */
export function createSection(type: SectionType): PageSection {
  switch (type) {
    case "hero": return hero("Headline", "Subtitle");
    case "text": return text("Text", "");
    case "image-text": return imageText("Image + Text");
    case "text-image": return textImage("Text + Image");
    case "gallery-grid": return galleryGrid();
    case "gallery-masonry": return galleryMasonry();
    case "contact-form": return contactForm();
    case "map": return mapSection();
    case "cta": return cta("Ready?", "Get Started");
    case "pricing-table": return pricingTable();
    case "faq-accordion": return faqAccordion();
    case "timeline": return timeline();
    case "testimonials": return testimonials();
    case "stats": return stats();
    case "team": return team();
    case "spacer": return spacer();
    case "divider": return divider();
    case "video": return video();
    case "columns-2": return columns2();
    case "columns-3": return columns3();
    case "slideshow": return slideshow();
    case "carousel": return carouselSection();
    case "instagram-feed": return instagramFeed();
    case "social-links": return socialLinks();
    case "embed": return embed();
    case "logo-strip": return logoStrip();
    default: return text("Content", "");
  }
}
