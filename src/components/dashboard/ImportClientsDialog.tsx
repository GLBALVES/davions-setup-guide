import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

interface ParsedRow {
  email: string;
  full_name?: string;
  phone?: string;
  instagram?: string;
  notes?: string;
  company?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Detect delimiter
  const first = lines[0];
  const delim = first.includes(";") && !first.includes(",") ? ";" : ",";

  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === delim && !inQuotes) {
        out.push(cur); cur = "";
      } else { cur += ch; }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  type Field = "email" | "full_name" | "first_name" | "last_name" | "phone" | "instagram" | "notes" | "company" | "address_street" | "address_street2" | "address_city" | "address_state" | "address_zip" | "address_country";

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/^"|"$/g, "").trim());
  const norm = (h: string): Field | null => {
    if (["email", "e-mail", "mail", "correo"].includes(h)) return "email";
    if (["first name", "firstname", "first_name", "nome", "primer nombre"].includes(h)) return "first_name";
    if (["last name", "lastname", "last_name", "sobrenome", "apellido"].includes(h)) return "last_name";
    if (["name", "full_name", "fullname", "full name", "nombre", "client", "cliente"].includes(h)) return "full_name";
    if (["phone", "telefone", "celular", "telefono", "tel"].includes(h)) return "phone";
    if (["instagram", "ig"].includes(h)) return "instagram";
    if (["notes", "note", "obs", "observacao", "observação", "notas"].includes(h)) return "notes";
    if (["company", "empresa", "compañia", "compania"].includes(h)) return "company";
    if (["address line 1", "address", "address_street", "street", "endereco", "endereço", "direccion", "dirección"].includes(h)) return "address_street";
    if (["address line 2", "address2", "complement", "complemento"].includes(h)) return "address_street2";
    if (["city", "cidade", "ciudad"].includes(h)) return "address_city";
    if (["state", "province", "state/province", "estado", "provincia"].includes(h)) return "address_state";
    if (["zip", "postal code", "zip/postal code", "zip code", "cep", "codigo postal", "código postal"].includes(h)) return "address_zip";
    if (["country", "pais", "país"].includes(h)) return "address_country";
    if (["type", "tipo"].includes(h)) return null;
    return null;
  };
  const mapped = headers.map(norm);

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const row: any = {};
    cols.forEach((v, idx) => {
      const key = mapped[idx];
      if (!key) return;
      const clean = v.replace(/^"|"$/g, "").trim();
      if (!clean) return;
      if (key === "address_street2") {
        row.address_street = row.address_street ? `${row.address_street}, ${clean}` : clean;
      } else {
        row[key] = clean;
      }
    });
    if (row.email && /\S+@\S+\.\S+/.test(row.email)) {
      const composedName =
        row.full_name ||
        [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
        row.email.split("@")[0];
      rows.push({
        email: row.email.toLowerCase(),
        full_name: composedName,
        phone: row.phone || undefined,
        instagram: row.instagram || undefined,
        notes: row.notes || undefined,
        company: row.company || undefined,
        address_street: row.address_street || undefined,
        address_city: row.address_city || undefined,
        address_state: row.address_state || undefined,
        address_zip: row.address_zip || undefined,
        address_country: row.address_country || undefined,
      });
    }
  }
  return rows;
}


interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImported?: () => void;
}

export function ImportClientsDialog({ open, onOpenChange, onImported }: Props) {
  const { photographerId } = useAuth();
  const { t } = useLanguage();
  const cl = t.clients;
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [rawLineCount, setRawLineCount] = useState(0);

  const rows = useMemo(() => parseCSV(text), [text]);
  const invalid = Math.max(0, rawLineCount - rows.length);

  const onFile = async (f: File | null) => {
    if (!f) return;
    const content = await f.text();
    setText(content);
    setRawLineCount(Math.max(0, content.split(/\r?\n/).filter((l) => l.trim()).length - 1));
  };

  const onPaste = (v: string) => {
    setText(v);
    setRawLineCount(Math.max(0, v.split(/\r?\n/).filter((l) => l.trim()).length - 1));
  };

  const submit = async () => {
    if (!photographerId || rows.length === 0) return;
    setLoading(true);
    try {
      const payload = rows.map((r) => ({
        photographer_id: photographerId,
        email: r.email,
        full_name: r.full_name || "",
        phone: r.phone ?? null,
        instagram: r.instagram ?? null,
        notes: r.notes ?? null,
      }));
      const { error } = await (supabase as any)
        .from("clients")
        .upsert(payload, { onConflict: "photographer_id,email" });
      if (error) throw error;
      toast({ title: cl.importSuccess.replace("{count}", String(rows.length)) });
      onImported?.();
      onOpenChange(false);
      setText("");
      setRawLineCount(0);
    } catch (e: any) {
      toast({ title: cl.importError, description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-light tracking-wide">{cl.importTitle}</DialogTitle>
          <DialogDescription className="text-xs">{cl.importDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2">
              {cl.importUpload}
            </label>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2">
              {cl.importPaste}
            </label>
            <Textarea
              value={text}
              onChange={(e) => onPaste(e.target.value)}
              rows={6}
              placeholder="email,name,phone,instagram,notes&#10;jane@example.com,Jane Doe,..."
              className="font-mono text-xs"
            />
          </div>

          {(rows.length > 0 || invalid > 0) && (
            <div className="border border-border p-3 text-xs space-y-1">
              <p className="text-foreground">{cl.importRowsFound.replace("{count}", String(rows.length))}</p>
              {invalid > 0 && (
                <p className="text-muted-foreground">{cl.importInvalidRows.replace("{count}", String(invalid))}</p>
              )}
              {rows.slice(0, 3).map((r, i) => (
                <p key={i} className="text-muted-foreground truncate">· {r.full_name} — {r.email}</p>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            {t.emailMarketing?.cancel ?? "Cancel"}
          </Button>
          <Button onClick={submit} disabled={loading || rows.length === 0}>
            <Upload className="h-3.5 w-3.5 mr-2" />
            {loading ? cl.importing : cl.importConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
