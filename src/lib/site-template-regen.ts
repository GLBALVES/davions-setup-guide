import { supabase } from "@/integrations/supabase/client";
import { loadStudioContent, enrichSectionsWithContent } from "@/lib/site-template-content";
import type { PageSection } from "@/components/website-editor/page-templates";

// Map the visual site template (chosen in Website Settings) to a homepage page-template.
const SITE_TEMPLATE_TO_HOME_TEMPLATE: Record<string, string> = {
  editorial: "homepage-1",
  sierra: "homepage-1",
  canvas: "homepage-1",
  seville: "homepage-1",
  clean: "homepage-1",
  grid: "homepage-2",
  magazine: "homepage-2",
  avery: "homepage-2",
  milo: "homepage-2",
};

const SITE_TEMPLATE_TO_CONTACT_TEMPLATE: Record<string, string> = {
  editorial: "contact-1",
  sierra: "contact-1",
  canvas: "contact-1",
  seville: "contact-1",
  clean: "contact-1",
  grid: "contact-2",
  magazine: "contact-2",
  avery: "contact-2",
  milo: "contact-2",
};

export const getHomeTemplateForSite = (siteTemplate?: string | null) =>
  SITE_TEMPLATE_TO_HOME_TEMPLATE[siteTemplate ?? ""] ?? "homepage-1";

export const getContactTemplateForSite = (siteTemplate?: string | null) =>
  SITE_TEMPLATE_TO_CONTACT_TEMPLATE[siteTemplate ?? ""] ?? "contact-1";

const DEFAULT_PAGE_SLUGS = new Set(["home", "contact", "about"]);

/**
 * Apply the new site template to existing default pages WITHOUT destroying content.
 *
 * Strategy:
 *  - Update only `page_content.templateId` so the page is tagged with the new visual template.
 *  - Keep all existing `sections` (texts, images, props) intact.
 *  - Custom user pages remain untouched.
 *
 * The visual style (fonts, colors, hero variant) comes from `photographer_site.site_template`,
 * which is updated separately by the caller.
 *
 * Returns the number of pages touched.
 */
export async function regenerateDefaultPagesForTemplate(
  photographerId: string,
  siteTemplate: string,
): Promise<number> {
  const homeTemplateId = getHomeTemplateForSite(siteTemplate);
  const contactTemplateId = getContactTemplateForSite(siteTemplate);

  const { data: existing } = await supabase
    .from("site_pages")
    .select("id, slug, page_content")
    .eq("photographer_id", photographerId);

  const defaults = (existing ?? []).filter((p: any) =>
    DEFAULT_PAGE_SLUGS.has((p.slug ?? "").toLowerCase()),
  );

  let touched = 0;

  // Load real studio content once for all default pages.
  const studioContent = await loadStudioContent(photographerId);

  for (const row of defaults as any[]) {
    const slug = (row.slug ?? "").toLowerCase();
    let templateId = "";
    if (slug === "home") templateId = homeTemplateId;
    else if (slug === "contact") templateId = contactTemplateId;
    else if (slug === "about") templateId = "about-1";
    if (!templateId) continue;

    const currentContent =
      row.page_content && typeof row.page_content === "object" ? row.page_content : {};

    // Enrich existing sections: only fills props that are still empty —
    // user-edited texts/images are always preserved.
    const currentSections: PageSection[] = Array.isArray((currentContent as any).sections)
      ? ((currentContent as any).sections as PageSection[])
      : [];
    const enrichedSections = enrichSectionsWithContent(currentSections, studioContent);

    const nextContent = {
      ...currentContent,
      templateId,
      sections: enrichedSections,
    };

    await supabase
      .from("site_pages")
      .update({ page_content: JSON.parse(JSON.stringify(nextContent)) })
      .eq("id", row.id);

    touched++;
  }

  return touched;
}
