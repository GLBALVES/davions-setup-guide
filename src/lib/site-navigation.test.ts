import { describe, expect, it } from "vitest";
import { buildPublicSiteNavLinks, getTopLevelHomePage } from "@/lib/site-navigation";

const pages = [
  { id: "1", title: "HOME", slug: "home", parent_id: null, sort_order: 0, is_home: true, is_visible: true },
  { id: "2", title: "Services", slug: "services", parent_id: null, sort_order: 1, is_home: false, is_visible: true },
  { id: "3", title: "Contact", slug: "contact", parent_id: null, sort_order: 2, is_home: false, is_visible: true },
];

describe("site navigation", () => {
  it("detects the home page among top-level pages", () => {
    expect(getTopLevelHomePage(pages)?.id).toBe("1");
  });

  it("prepends HOME to published nav links when visible", () => {
    expect(
      buildPublicSiteNavLinks({
        pages,
        homeHref: "/",
        makePageHref: (page) => `/page/${page.slug}`,
      })
    ).toEqual([
      { label: "HOME", href: "/" },
      { label: "Services", href: "/page/services" },
      { label: "Contact", href: "/page/contact" },
    ]);
  });

  it("omits HOME when the home page is hidden", () => {
    expect(
      buildPublicSiteNavLinks({
        pages: [{ ...pages[0], is_visible: false }, pages[1], pages[2]],
        homeHref: "/",
        makePageHref: (page) => `/page/${page.slug}`,
      })
    ).toEqual([
      { label: "Services", href: "/page/services" },
      { label: "Contact", href: "/page/contact" },
    ]);
  });
});