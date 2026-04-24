// ── Blog default copy (i18n) ────────────────────────────────────────────────
import type { Lang } from "@/lib/i18n/translations";

export interface BlogDefaults {
  pageTitle: string;
  pageDescription: string;
  navLabel: string;
  empty: string;
  backHome: string;
  readMore: string;
  minRead: string;
  relatedPosts: string;
  share: string;
  shareCopied: string;
  publishedOn: string;
  allPosts: string;
  byKeyword: string;
  notFoundTitle: string;
  notFoundDescription: string;
}

const DEFAULTS: Record<Lang, BlogDefaults> = {
  en: {
    pageTitle: "Blog",
    pageDescription: "Stories, tips & inspiration from behind the lens.",
    navLabel: "Blog",
    empty: "New stories are on the way.",
    backHome: "Back to home",
    readMore: "Read more",
    minRead: "min read",
    relatedPosts: "Related posts",
    share: "Share",
    shareCopied: "Link copied to clipboard",
    publishedOn: "Published on",
    allPosts: "All",
    byKeyword: "Topic",
    notFoundTitle: "Post not found",
    notFoundDescription: "The article you're looking for doesn't exist or was removed.",
  },
  pt: {
    pageTitle: "Blog",
    pageDescription: "Histórias, dicas e inspiração de quem está por trás das lentes.",
    navLabel: "Blog",
    empty: "Em breve novidades por aqui.",
    backHome: "Voltar para o início",
    readMore: "Ler mais",
    minRead: "min de leitura",
    relatedPosts: "Posts relacionados",
    share: "Compartilhar",
    shareCopied: "Link copiado para a área de transferência",
    publishedOn: "Publicado em",
    allPosts: "Todos",
    byKeyword: "Tema",
    notFoundTitle: "Post não encontrado",
    notFoundDescription: "O artigo que você procura não existe ou foi removido.",
  },
  es: {
    pageTitle: "Blog",
    pageDescription: "Historias, consejos e inspiración detrás de la lente.",
    navLabel: "Blog",
    empty: "Pronto habrá nuevas historias por aquí.",
    backHome: "Volver al inicio",
    readMore: "Leer más",
    minRead: "min de lectura",
    relatedPosts: "Publicaciones relacionadas",
    share: "Compartir",
    shareCopied: "Enlace copiado al portapapeles",
    publishedOn: "Publicado el",
    allPosts: "Todos",
    byKeyword: "Tema",
    notFoundTitle: "Publicación no encontrada",
    notFoundDescription: "El artículo que buscas no existe o fue eliminado.",
  },
};

export function getBlogDefaults(lang: Lang): BlogDefaults {
  return DEFAULTS[lang] ?? DEFAULTS.en;
}

const LOCALES: Record<Lang, string> = { en: "en-US", pt: "pt-BR", es: "es-ES" };

export function formatBlogDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(LOCALES[lang] ?? "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/** Strip HTML tags + collapse whitespace, then truncate to N chars (word-aware). */
export function htmlExcerpt(html: string | null | undefined, max = 140): string {
  if (!html) return "";
  const txt = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (txt.length <= max) return txt;
  const cut = txt.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut) + "…";
}
