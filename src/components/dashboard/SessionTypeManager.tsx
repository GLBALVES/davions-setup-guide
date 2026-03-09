import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const SessionTypeManager = ({
  photographerId,
  sessionTypes,
  selectedTypeId,
  onSelect,
  onRefetch,
}: Props) => {
  const { toast } = useToast();

  // UI state
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
    const { data, error } = await supabase
      .from("session_types")
      .insert({ photographer_id: photographerId, name })
      .select("id")
      .single();
    if (error) {
      toast({ title: "Error adding type", description: error.message, variant: "destructive" });
    } else {
      onSelect(data.id);
      onRefetch();
      setAddingNew(false);
      setNewName("");
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
      if (selectedTypeId === id) onSelect(null);
      onRefetch();
    }
    setBusy(false);
  };

  const selectedType = sessionTypes.find((t) => t.id === selectedTypeId);

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs tracking-wider uppercase font-light">
        Session Type
      </Label>

      <div className="flex items-center gap-2">
        {/* Dropdown */}
        <Select
          value={selectedTypeId ?? ""}
          onValueChange={(v) => onSelect(v || null)}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a type…" />
          </SelectTrigger>
          <SelectContent>
            {sessionTypes.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Edit selected */}
        {selectedType && editingId !== selectedType.id && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => startEdit(selectedType)}
            disabled={busy}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Delete selected */}
        {selectedType && editingId !== selectedType.id && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleDelete(selectedType.id)}
            disabled={busy}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* New type button */}
        {!addingNew && editingId === null && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 h-9 text-[10px] tracking-widest uppercase font-light gap-1.5"
            onClick={() => {
              setAddingNew(true);
              setEditingId(null);
            }}
          >
            <Plus className="h-3 w-3" />
            New
          </Button>
        )}
      </div>

      {/* Inline edit field */}
      {editingId !== null && (
        <div className="flex items-center gap-2 mt-1">
          <Input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
            className="h-8 text-sm flex-1"
            autoFocus
          />
          <Button
            type="button"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleSaveEdit}
            disabled={busy}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => setEditingId(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Inline new type field */}
      {addingNew && (
        <div className="flex items-center gap-2 mt-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Type name…"
            className="h-8 text-sm flex-1"
            autoFocus
          />
          <Button
            type="button"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleAdd}
            disabled={busy || !newName.trim()}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => { setAddingNew(false); setNewName(""); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default SessionTypeManager;
