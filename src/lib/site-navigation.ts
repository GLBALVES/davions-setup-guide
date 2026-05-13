export interface PublicSiteNavPage {
  id: string;
  title: string;
  slug: string | null;
  parent_id: string | null;
  sort_order: number;
  is_home: boolean;
  is_visible: boolean;
}

export interface PublicSiteNavLink {
  label: string;
  href: string;
}

export function getTopLevelHomePage<T extends PublicSiteNavPage>(pages: T[]): T | null {
  const topLevel = pages.filter((page) => !page.parent_id);

  return (
    topLevel.find((page) => page.is_home) ??
    topLevel.find((page) => (page.slug || "").toLowerCase() === "home") ??
    topLevel.find((page) => (page.title || "").toLowerCase() === "home") ??
    topLevel[0] ??
    null
  );
}

export function buildPublicSiteNavLinks<T extends PublicSiteNavPage>(params: {
  pages: T[];
  homeHref: string;
  makePageHref: (page: T) => string;
  homeFallbackLabel?: string;
}): PublicSiteNavLink[] {
  const { pages, homeHref, makePageHref, homeFallbackLabel = "Home" } = params;
  const homePage = getTopLevelHomePage(pages);

  const otherPageLinks = pages
    .filter((page) => page.is_visible && !page.parent_id && page.id !== homePage?.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((page) => ({
      label: page.title,
      href: makePageHref(page),
    }));

  if (!homePage || homePage.is_visible === false) {
    return otherPageLinks;
  }

  return [
    {
      label: homePage.title || homeFallbackLabel,
      href: homeHref,
    },
    ...otherPageLinks,
  ];
}

/**
 * Inserts Shop and Blog nav links right after the Home link (or at the start
 * when no Home is present). Mutates a copy of `links` and returns it.
 */
export function injectShopAndBlogNavLinks(params: {
  links: PublicSiteNavLink[];
  homeHref: string;
  shop?: { enabled: boolean; label: string; href: string };
  blog?: { enabled: boolean; label: string; href: string };
}): PublicSiteNavLink[] {
  const { links, homeHref, shop, blog } = params;
  const insert: PublicSiteNavLink[] = [];
  if (shop?.enabled) insert.push({ label: shop.label, href: shop.href });
  if (blog?.enabled) insert.push({ label: blog.label, href: blog.href });
  if (insert.length === 0) return links;

  const out = [...links];
  if (out.length > 0 && out[0].href === homeHref) {
    out.splice(1, 0, ...insert);
  } else {
    out.unshift(...insert);
  }
  return out;
}
