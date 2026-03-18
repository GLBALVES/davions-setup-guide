import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Save } from "lucide-react";

const MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (default)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5" },
];

const DEFAULT_PROMPT = `You are Davions Assistant, an intelligent helper embedded inside the Davions platform — a professional studio management tool for photographers.

Your role is to guide photographers through all features of the platform clearly and concisely. Be helpful, friendly, and direct.

Keep answers concise (2–4 sentences unless a step-by-step is needed). Use bullet points for multi-step instructions. Never mention underlying technologies like Supabase or Lovable.`;

export default function AdminHelpAssistant() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [model, setModel] = useState("google/gemini-3-flash-preview");
  const [temperature, setTemperature] = useState(0.5);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("help_assistant_config")
        .select("*")
        .maybeSingle();
      if (data) {
        setId(data.id);
        setModel(data.model || "google/gemini-3-flash-preview");
        setTemperature(data.temperature ?? 0.5);
        setSystemPrompt(data.system_prompt || DEFAULT_PROMPT);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const save = async () => {
    setSaving(true);
    const payload = { model, temperature, system_prompt: systemPrompt };
    let error;
    if (id) {
      ({ error } = await (supabase as any)
        .from("help_assistant_config")
        .update(payload)
        .eq("id", id));
    } else {
      const { data, error: e } = await (supabase as any)
        .from("help_assistant_config")
        .insert(payload)
        .select()
        .single();
      error = e;
      if (data) setId(data.id);
    }
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings saved" });
    }
  };

  return (
    <AdminLayout>
      <div className="px-8 py-8 max-w-3xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[11px] tracking-[0.3em] uppercase font-light text-muted-foreground">Admin</h1>
            <p className="text-2xl font-light mt-1">Help Assistant</p>
            <p className="text-sm text-muted-foreground font-light mt-1">
              Configure the AI assistant that appears in the dashboard header for all users.
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-background" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={18} />
          </div>
        ) : (
          <div className="flex flex-col gap-8">

            {/* Model */}
            <div className="flex flex-col gap-3">
              <Label className="text-[11px] tracking-[0.3em] uppercase font-light">AI Model</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MODELS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setModel(m.value)}
                    className={`flex items-center gap-2 px-4 py-3 border text-left text-[12px] font-light transition-colors ${
                      model === m.value
                        ? "border-foreground bg-foreground/[0.03]"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <div className={`h-2 w-2 rounded-full shrink-0 ${model === m.value ? "bg-foreground" : "bg-border"}`} />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Temperature */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] tracking-[0.3em] uppercase font-light">Temperature</Label>
                <span className="text-[11px] font-mono text-muted-foreground">{temperature.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-foreground"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Precise (0.0)</span>
                <span>Creative (1.0)</span>
              </div>
            </div>

            {/* System Prompt */}
            <div className="flex flex-col gap-3">
              <Label className="text-[11px] tracking-[0.3em] uppercase font-light">System Prompt</Label>
              <p className="text-[11px] text-muted-foreground -mt-1">
                Defines the assistant's persona, knowledge, and behavior. Leave blank to use the default Davions prompt.
              </p>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={16}
                className="w-full border border-input bg-background px-3 py-2.5 text-[12px] font-light font-mono text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-ring resize-none"
              />
              <button
                onClick={() => setSystemPrompt(DEFAULT_PROMPT)}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors w-fit"
              >
                Reset to default prompt
              </button>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <Button onClick={save} disabled={saving} className="gap-2 text-xs tracking-wider uppercase font-light">
                {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</> : <><Save className="h-3.5 w-3.5" />Save Settings</>}
              </Button>
            </div>

          </div>
        )}
      </div>
    </AdminLayout>
  );
}
