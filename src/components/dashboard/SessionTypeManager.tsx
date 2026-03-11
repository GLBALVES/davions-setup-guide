import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";

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

const SessionTypeManager = ({ photographerId, sessionTypes, onRefetch }: Props) => {
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const { error } = await supabase
      .from("session_types")
      .insert({ photographer_id: photographerId, name });
    if (error) {
      toast({ title: "Error adding type", description: error.message, variant: "destructive" });
    } else {
      onRefetch();
      setAddingNew(false);
      setNewName("");
    }
    setBusy(false);
  };

  const startEdit = (type: SessionType) => {
    setEditingId(type.id);
    setEditingName(type.name);
    setAddingNew(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (!name) return;
    setBusy(true);
    const { error } = await supabase
      .from("session_types")
      .update({ name })
      .eq("id", editingId);
    if (error) {
      toast({ title: "Error updating type", description: error.message, variant: "destructive" });
    } else {
      onRefetch();
      setEditingId(null);
    }
    setBusy(false);
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    const { error } = await supabase.from("session_types").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting type", description: error.message, variant: "destructive" });
    } else {
      onRefetch();
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Tags */}
      {sessionTypes.map((type) =>
        editingId === type.id ? (
          <div
            key={type.id}
            className="flex items-center gap-1 border border-border rounded-sm px-2 py-1 bg-background"
          >
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") setEditingId(null);
              }}
              className="h-5 text-xs border-0 p-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 w-24"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={busy}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div
            key={type.id}
            className="group flex items-center gap-1.5 border border-border rounded-sm px-2.5 py-1 bg-muted/30 hover:bg-muted/60 transition-colors"
          >
            <span className="text-xs font-light tracking-wide">{type.name}</span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => startEdit(type)}
                disabled={busy}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Edit"
              >
                <Pencil className="h-2.5 w-2.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(type.id)}
                disabled={busy}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Delete"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        )
      )}

      {/* Add new inline */}
      {addingNew ? (
        <div className="flex items-center gap-1 border border-primary/50 rounded-sm px-2 py-1 bg-background">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setAddingNew(false); setNewName(""); }
            }}
            placeholder="New type…"
            className="h-5 text-xs border-0 p-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 w-24 placeholder:text-muted-foreground/50"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy || !newName.trim()}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => { setAddingNew(false); setNewName(""); }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setAddingNew(true); setEditingId(null); }}
          className="flex items-center gap-1 border border-dashed border-border rounded-sm px-2.5 py-1 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
        >
          <Plus className="h-3 w-3" />
          <span className="text-[10px] tracking-widest uppercase font-light">Add</span>
        </button>
      )}
    </div>
  );
};

export default SessionTypeManager;
