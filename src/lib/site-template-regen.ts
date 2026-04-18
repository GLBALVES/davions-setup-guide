import { supabase } from "@/integrations/supabase/client";
import { getTemplateSections } from "@/components/website-editor/page-templates";

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
 * Regenerate Home / Contact / About pages so they match the chosen site template.
 * Custom user pages (any other slug) are preserved untouched.
 * Returns the number of pages regenerated.
 */
export async function regenerateDefaultPagesForTemplate(
  photographerId: string,
  siteTemplate: string,
): Promise<number> {
  const homeTemplateId = getHomeTemplateForSite(siteTemplate);
  const contactTemplateId = getContactTemplateForSite(siteTemplate);

  const { data: existing } = await supabase
    .from("site_pages")
    .select("id, slug, sort_order, is_home, is_visible, parent_id, title")
    .eq("photographer_id", photographerId);

  const defaults = (existing ?? []).filter((p: any) =>
    DEFAULT_PAGE_SLUGS.has((p.slug ?? "").toLowerCase()),
  );

  for (const row of defaults as any[]) {
    const slug = (row.slug ?? "").toLowerCase();
    let templateId = "";
    let label = row.title || "";
    if (slug === "home") {
      templateId = homeTemplateId;
      label = label || "Home";
    } else if (slug === "contact") {
      templateId = contactTemplateId;
      label = label || "Contact";
    } else if (slug === "about") {
      templateId = "about-1";
      label = label || "About";
    }
    if (!templateId) continue;

    const sections = getTemplateSections(templateId);
    const sectionsOrder = sections.map((s: any) => s.type);

    const patch = {
      photographer_id: photographerId,
      title: label,
      slug,
      parent_id: row.parent_id ?? null,
      sort_order: row.sort_order ?? 0,
      is_home: row.is_home === true,
      is_visible: row.is_visible !== false,
      sections_order: JSON.parse(JSON.stringify(sectionsOrder)),
      page_content: JSON.parse(
        JSON.stringify({
          type: "page",
          status: "online",
          showHeaderFooter: true,
          templateId,
          sections,
        }),
      ),
      header_config: null,
    };

    await supabase.from("site_pages").update(patch).eq("id", row.id);
  }

  return defaults.length;
}
