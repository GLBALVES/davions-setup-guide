import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Mail, Plus, Pencil, Trash2 } from "lucide-react";

interface FollowupTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
}

const DEFAULT_FOLLOWUP_HTML = `<p>Olá {{client_name}},</p>
<p>Já faz um tempinho desde a sua sessão <strong>{{session_type}}</strong> e queria muito te ver de novo na frente das câmeras!</p>
<p>Como um carinho especial, preparei uma <strong>oferta exclusiva</strong> para você reservar uma nova sessão.</p>
<p>Bora marcar?</p>
<p>Com carinho,<br/>{{photographer_name}}<br/>{{studio_name}}</p>`;

export default function FollowupEmailTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<FollowupTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FollowupTemplate | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("followup_email_templates")
      .select("id, name, subject, html_content")
      .eq("photographer_id", user.id)
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Erro ao carregar templates", description: error.message, variant: "destructive" });
    } else {
      setItems(data ?? []);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openNew = () => {
    setEditing({ id: "", name: "", subject: "", html_content: DEFAULT_FOLLOWUP_HTML });
    setOpen(true);
  };

  const openEdit = (t: FollowupTemplate) => {
    setEditing({ ...t });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!user || !editing) return;
    if (!editing.name.trim()) {
      toast({ title: "Dê um nome ao template", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      photographer_id: user.id,
      name: editing.name,
      subject: editing.subject,
      html_content: editing.html_content,
    };
    const { error } = editing.id
      ? await (supabase as any).from("followup_email_templates").update(payload).eq("id", editing.id)
      : await (supabase as any).from("followup_email_templates").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Template salvo" });
    setOpen(false);
    setEditing(null);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este template?")) return;
    const { error } = await (supabase as any).from("followup_email_templates").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    fetchItems();
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
            <span className="inline-block w-4 h-px bg-border" />
            Followup
          </p>
          <h2 className="text-base font-light tracking-wide mt-1 ml-7 flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Templates de email de followup
          </h2>
          <p className="text-[10px] text-muted-foreground mt-1 ml-7">
            Modelos reutilizáveis para reativar clientes meses após a sessão. Selecione um deles na aba de Confirmação da sessão.
          </p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-2 text-xs tracking-wider uppercase font-light">
          <Plus className="h-3.5 w-3.5" />
          Novo template
        </Button>
      </div>

      {loading ? (
        <div className="border border-border p-8 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border p-8 text-center">
          <p className="text-xs text-muted-foreground font-light">
            Nenhum template de followup criado ainda.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {items.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 border border-border border-b-0 last:border-b p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-light tracking-wide truncate">{t.name}</p>
                {t.subject && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{t.subject}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(t)} className="gap-1.5 text-[11px]">
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="gap-1.5 text-[11px] text-destructive hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl rounded-none border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-light tracking-wide">
              {editing?.id ? "Editar template" : "Novo template de followup"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] tracking-widest uppercase text-muted-foreground font-light">Nome</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Ex: Reativação 6 meses"
                  className="h-9 text-sm font-light"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] tracking-widest uppercase text-muted-foreground font-light">Assunto</Label>
                <Input
                  value={editing.subject}
                  onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                  placeholder="Que tal uma nova sessão, {{client_name}}?"
                  className="h-9 text-sm font-light"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] tracking-widest uppercase text-muted-foreground font-light">Conteúdo (HTML)</Label>
                <Textarea
                  value={editing.html_content}
                  onChange={(e) => setEditing({ ...editing, html_content: e.target.value })}
                  rows={12}
                  className="text-sm font-light font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Variáveis disponíveis: <code>{"{{client_name}}"}</code>, <code>{"{{session_type}}"}</code>, <code>{"{{photographer_name}}"}</code>, <code>{"{{studio_name}}"}</code>.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-xs tracking-wider uppercase font-light">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2 text-xs tracking-wider uppercase font-light">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
