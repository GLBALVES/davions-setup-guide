import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, RefreshCw, Check, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { GeneratedTheme } from "./creative-types";

interface Props {
  onSelectTheme: (tema: string) => void;
}

export default function CreativeThemeGenerator({ onSelectTheme }: Props) {
  const [themes, setThemes] = useState<GeneratedTheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [nicho, setNicho] = useState("");

  const generateThemes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-creative", {
        body: { type: "themes", nicho: nicho || "photography" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.temas) {
        setThemes(data.temas.map((t: any) => ({ ...t, id: crypto.randomUUID() })));
      }
    } catch (e: any) {
      toast({ title: "Error generating themes", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const startEdit = (theme: GeneratedTheme) => {
    setEditingId(theme.id);
    setEditValue(theme.titulo);
  };

  const saveEdit = (id: string) => {
    setThemes((prev) => prev.map((t) => (t.id === id ? { ...t, titulo: editValue } : t)));
    setEditingId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={nicho} onChange={(e) => setNicho(e.target.value)} placeholder="Niche (e.g. photography)" className="flex-1 h-8 text-xs" />
        <Button size="sm" onClick={generateThemes} disabled={loading} className="gap-1 text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Generate
        </Button>
      </div>

      {themes.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {themes.map((theme) => (
            <Card key={theme.id} className="p-2.5 space-y-1">
              {editingId === theme.id ? (
                <div className="flex gap-1">
                  <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 text-xs flex-1" />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(theme.id)}><Check className="h-3 w-3" /></Button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{theme.titulo}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{theme.descricao}</p>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(theme)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="default" className="h-6 text-[10px] px-2" onClick={() => onSelectTheme(theme.titulo)}>Use</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
          <Button size="sm" variant="outline" onClick={generateThemes} disabled={loading} className="w-full gap-1 text-xs">
            <RefreshCw className="h-3 w-3" /> Generate new
          </Button>
        </div>
      )}
    </div>
  );
}
