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