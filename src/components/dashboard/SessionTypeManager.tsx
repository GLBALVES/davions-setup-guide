import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, Plus, Check, X, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SessionType {
  id: string;
  name: string;
}

interface Props {
  photographerId: string;
  sessionTypes: SessionType[];
  selectedTypeId: string | null;
  onSelect: (id: string | null) => void;
  onRefetch: () => void;
}

const SessionTypeManager = ({ photographerId, sessionTypes, selectedTypeId, onSelect, onRefetch }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = sessionTypes.find((t) => t.id === selectedTypeId);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAddingNew(false);
        setNewName("");
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("session_types")
      .insert({ photographer_id: photographerId, name })
      .select()
      .single();
    if (error) {
      toast({ title: "Error adding type", description: error.message, variant: "destructive" });
    } else {
      onRefetch();
      if (data) onSelect(data.id);
      setAddingNew(false);
      setNewName("");
      setOpen(false);
    }
    setBusy(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (!name) return;
    setBusy(true);
    const { error } = await supabase.from("session_types").update({ name }).eq("id", editingId);
    if (error) {
      toast({ title: "Error updating type", description: error.message, variant: "destructive" });
    } else {
      onRefetch();
      setEditingId(null);
    }
    setBusy(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    const { error } = await supabase.from("session_types").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting type", description: error.message, variant: "destructive" });
    } else {
      if (selectedTypeId === id) onSelect(null);
      onRefetch();
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs tracking-wider uppercase font-light">Session Type</Label>
      <div ref={ref} className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "w-full flex items-center justify-between border border-input rounded-none px-3 py-2 text-xs font-light bg-background hover:border-foreground/40 transition-colors",
            open && "border-foreground/40"
          )}
        >
          <span className={selected ? "text-foreground" : "text-muted-foreground"}>
            {selected ? selected.name : "Select a session type…"}
          </span>
          <div className="flex items-center gap-1.5">
            {selected && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onSelect(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onSelect(null); } }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
          </div>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border shadow-md rounded-none overflow-hidden">
            {sessionTypes.length === 0 && !addingNew && (
              <p className="text-[10px] text-muted-foreground px-3 py-2.5 italic">No types yet.</p>
            )}

            {sessionTypes.map((type) =>
              editingId === type.id ? (
                <div key={type.id} className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-5 flex-1 text-xs border-0 p-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                    autoFocus
                  />
                  <button type="button" onClick={handleSaveEdit} disabled={busy} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
                    <Check className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div
                  key={type.id}
                  className={cn(
                    "group flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors text-xs font-light",
                    selectedTypeId === type.id && "bg-muted/40"
                  )}
                  onClick={() => { onSelect(type.id); setOpen(false); }}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("h-1.5 w-1.5 rounded-full border border-border", selectedTypeId === type.id && "bg-foreground border-foreground")} />
                    <span>{type.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingId(type.id); setEditingName(type.name); setAddingNew(false); }}
                      disabled={busy}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(type.id, e)}
                      disabled={busy}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Add new row */}
            <div className="border-t border-border">
              {addingNew ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAdd();
                      if (e.key === "Escape") { setAddingNew(false); setNewName(""); }
                    }}
                    placeholder="New type…"
                    className="h-5 flex-1 text-xs border-0 p-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                    autoFocus
                  />
                  <button type="button" onClick={handleAdd} disabled={busy || !newName.trim()} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
                    <Check className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => { setAddingNew(false); setNewName(""); }} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAddingNew(true); setEditingId(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[10px] tracking-widest uppercase font-light text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add new type
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionTypeManager;
