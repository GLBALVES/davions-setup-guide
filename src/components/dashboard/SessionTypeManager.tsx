import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Check, X, Tag } from "lucide-react";

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

const SessionTypeManager = ({
  photographerId,
  sessionTypes,
  onRefetch,
}: Props) => {
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  // ── Add ──────────────────────────────────────
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
      toast({ title: "Session type added" });
    }
    setBusy(false);
  };

  // ── Edit ─────────────────────────────────────
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

  // ── Delete ───────────────────────────────────
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
    <div className="flex flex-col gap-1">
      {/* List */}
      {sessionTypes.length === 0 && !addingNew && (
        <p className="text-xs text-muted-foreground py-3 text-center">
          No session types yet. Add one below.
        </p>
      )}

      {sessionTypes.map((type) => (
        <div
          key={type.id}
          className="flex items-center gap-2 group px-2 py-1.5 rounded-sm hover:bg-muted/50 transition-colors"
        >
          {editingId === type.id ? (
            <>
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="h-7 text-xs flex-1"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={busy}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                aria-label="Save"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <Tag className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              <span className="flex-1 text-xs font-light tracking-wide truncate">
                {type.name}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => startEdit(type)}
                  disabled={busy}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(type.id)}
                  disabled={busy}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      {/* Add new row */}
      {addingNew ? (
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Tag className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setAddingNew(false); setNewName(""); }
            }}
            placeholder="Type name…"
            className="h-7 text-xs flex-1"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy || !newName.trim()}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            aria-label="Confirm"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { setAddingNew(false); setNewName(""); }}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setAddingNew(true); setEditingId(null); }}
          className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-sm hover:bg-muted/50 transition-colors w-full mt-0.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="tracking-wider uppercase font-light text-[10px]">Add type</span>
        </button>
      )}
    </div>
  );
};

export default SessionTypeManager;
