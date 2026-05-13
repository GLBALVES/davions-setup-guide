// ── Shop default copy (i18n) ────────────────────────────────────────────────
import type { Lang } from "@/lib/i18n/translations";

export interface ShopDefaults {
  pageTitle: string;
  pageDescription: string;
  navLabel: string;
  allTab: string;
  sessionsTab: string;
  galleriesTab: string;
  viewDetails: string;
  startingAt: string;
  badgeSession: string;
  badgeGallery: string;
  emptyTitle: string;
  emptyDescription: string;
  onRequest: string;
  perPhoto: string;
  loading: string;
  notFound: string;
  pageNotFound: string;
  contactNav: string;
  contactSubmit: string;
}

const DEFAULTS: Record<Lang, ShopDefaults> = {
  en: {
    pageTitle: "Showcase",
    pageDescription: "Sessions & galleries available for booking and purchase.",
    navLabel: "Showcase",
    allTab: "All",
    sessionsTab: "Sessions",
    galleriesTab: "Galleries",
    viewDetails: "View details",
    startingAt: "From",
    badgeSession: "Session",
    badgeGallery: "Gallery",
    emptyTitle: "Coming soon",
    emptyDescription: "New offerings will be available here shortly.",
    onRequest: "On request",
    perPhoto: "/ photo",
  },
  pt: {
    pageTitle: "Vitrine",
    pageDescription: "Sessões e galerias disponíveis para agendamento e compra.",
    navLabel: "Vitrine",
    allTab: "Todos",
    sessionsTab: "Sessões",
    galleriesTab: "Galerias",
    viewDetails: "Ver detalhes",
    startingAt: "A partir de",
    badgeSession: "Sessão",
    badgeGallery: "Galeria",
    emptyTitle: "Em breve",
    emptyDescription: "Em breve novidades estarão disponíveis por aqui.",
    onRequest: "Sob consulta",
    perPhoto: "/ foto",
  },
  es: {
    pageTitle: "Vitrina",
    pageDescription: "Sesiones y galerías disponibles para reservar y comprar.",
    navLabel: "Vitrina",
    allTab: "Todos",
    sessionsTab: "Sesiones",
    galleriesTab: "Galerías",
    viewDetails: "Ver detalles",
    startingAt: "Desde",
    badgeSession: "Sesión",
    badgeGallery: "Galería",
    emptyTitle: "Próximamente",
    emptyDescription: "Pronto habrá novedades disponibles aquí.",
    onRequest: "A consultar",
    perPhoto: "/ foto",
  },
};

export function getShopDefaults(lang: Lang): ShopDefaults {
  return DEFAULTS[lang] ?? DEFAULTS.en;
}
