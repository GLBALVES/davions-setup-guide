import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, ChevronDown, ChevronUp, Info } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TemplateRow {
  id?: string;
  stage_trigger: string;
  subject: string;
  html_content: string;
  enabled: boolean;
  auto_send: boolean;
}

const STAGE_TRIGGERS = [
  "shot_to_editing",
  "editing_to_review",
  "review_to_delivered",
  "delivered_to_done",
  "gallery_linked",
] as const;

const VARIABLES = [
  "{{client_name}}",
  "{{project_title}}",
  "{{session_type}}",
  "{{photographer_name}}",
  "{{shoot_date}}",
  "{{gallery_link}}",
];

export default function WorkflowEmailTemplates() {
  const { photographerId } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Record<string, TemplateRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedTrigger, setExpandedTrigger] = useState<string | null>(null);

  const triggerMeta: Record<string, { label: string; desc: string }> = {
    shot_to_editing: { label: t.personalize.shotToEditing, desc: t.personalize.shotToEditingDesc },
    editing_to_review: { label: t.personalize.editingToReview, desc: t.personalize.editingToReviewDesc },
    review_to_delivered: { label: t.personalize.reviewToDelivered, desc: t.personalize.reviewToDeliveredDesc },
    delivered_to_done: { label: t.personalize.deliveredToDone, desc: t.personalize.deliveredToDoneDesc },
    gallery_linked: { label: t.personalize.galleryLinked, desc: t.personalize.galleryLinkedDesc },
  };

  const fetchTemplates = useCallback(async () => {
    if (!photographerId) return;
    const { data } = await (supabase as any)
      .from("workflow_email_templates")
      .select("*")
      .eq("photographer_id", photographerId);

    const map: Record<string, TemplateRow> = {};
    STAGE_TRIGGERS.forEach((trigger) => {
      const existing = data?.find((d: any) => d.stage_trigger === trigger);
      map[trigger] = existing ?? {
        stage_trigger: trigger,
        subject: "",
        html_content: "",
        enabled: false,
        auto_send: false,
      };
    });
    setTemplates(map);
    setLoading(false);
  }, [photographerId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSave = async (trigger: string) => {
    if (!photographerId) return;
    setSaving(trigger);
    const tpl = templates[trigger];
    const payload = {
      photographer_id: photographerId,
      stage_trigger: trigger,
      subject: tpl.subject,
      html_content: tpl.html_content,
      enabled: tpl.enabled,
      auto_send: tpl.auto_send,
    };

    if (tpl.id) {
      await (supabase as any)
        .from("workflow_email_templates")
        .update(payload)
        .eq("id", tpl.id);
    } else {
      const { data } = await (supabase as any)
        .from("workflow_email_templates")
        .upsert(payload, { onConflict: "photographer_id,stage_trigger" })
        .select()
        .single();
      if (data) {
        setTemplates((prev) => ({ ...prev, [trigger]: { ...prev[trigger], id: data.id } }));
      }
    }
    setSaving(null);
    toast({ title: t.personalize.templateSaved });
  };

  const updateField = (trigger: string, field: keyof TemplateRow, value: any) => {
    setTemplates((prev) => ({
      ...prev,
      [trigger]: { ...prev[trigger], [field]: value },
    }));
  };

  if (loading) {
    return <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">{t.personalize.loading}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] tracking-[0.25em] uppercase font-light mb-0.5">
          {t.personalize.workflowEmailTemplates}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {t.personalize.workflowEmailTemplatesDesc}
        </p>
      </div>

      {/* Variables reference */}
      <div className="border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[10px] tracking-wider uppercase font-light text-muted-foreground">
            {t.personalize.availableVariables}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map((v) => (
            <code key={v} className="text-[10px] px-2 py-0.5 bg-background border border-border text-muted-foreground font-mono">
              {v}
            </code>
          ))}
        </div>
      </div>

      {/* Template cards */}
      {STAGE_TRIGGERS.map((trigger) => {
        const tpl = templates[trigger];
        const meta = triggerMeta[trigger];
        const isExpanded = expandedTrigger === trigger;

        return (
          <div key={trigger} className="border border-border">
            {/* Header */}
            <button
              type="button"
              onClick={() => setExpandedTrigger(isExpanded ? null : trigger)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-light">{meta.label}</p>
                  <p className="text-[10px] text-muted-foreground">{meta.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {tpl.enabled && (
                  <span className="text-[9px] tracking-wider uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    {tpl.auto_send ? t.personalize.autoSendLabel : t.personalize.confirmBeforeSend}
                  </span>
                )}
                <div
                  className={`h-2 w-2 rounded-full ${tpl.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                />
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-border px-5 py-5 flex flex-col gap-5">
                {/* Enable + auto-send toggles */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={tpl.enabled}
                      onCheckedChange={(v) => updateField(trigger, "enabled", v)}
                    />
                    <Label className="text-[11px] tracking-wider uppercase font-light">
                      {t.personalize.enableTemplate}
                    </Label>
                  </div>
                  {tpl.enabled && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={tpl.auto_send}
                        onCheckedChange={(v) => updateField(trigger, "auto_send", v)}
                      />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label className="text-[11px] tracking-wider uppercase font-light cursor-help">
                              {t.personalize.autoSendLabel}
                            </Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{t.personalize.autoSendDesc}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[11px] tracking-wider uppercase font-light">
                    {t.personalize.templateSubject}
                  </Label>
                  <Input
                    value={tpl.subject}
                    onChange={(e) => updateField(trigger, "subject", e.target.value)}
                    placeholder={t.personalize.templateSubjectPlaceholder}
                    className="h-9 text-sm font-light"
                  />
                </div>

                {/* Content */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[11px] tracking-wider uppercase font-light">
                    {t.personalize.templateContent}
                  </Label>
                  <div className="border border-input min-h-[200px]">
                    <RichTextEditor
                      content={tpl.html_content}
                      onChange={(val) => updateField(trigger, "html_content", val)}
                      placeholder={t.personalize.noTemplateContent}
                    />
                  </div>
                </div>

                {/* Save button */}
                <Button
                  onClick={() => handleSave(trigger)}
                  disabled={saving === trigger}
                  size="sm"
                  className="gap-2 text-xs tracking-wider uppercase font-light w-fit"
                >
                  {saving === trigger && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving === trigger ? t.personalize.saving : t.personalize.saveChanges}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
