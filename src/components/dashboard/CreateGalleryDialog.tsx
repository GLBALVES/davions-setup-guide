import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "@/hooks/use-toast";

interface CreateGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  defaultCategory?: string;
}

export function CreateGalleryDialog({ open, onOpenChange, onCreated, defaultCategory = "proof" }: CreateGalleryDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [loading, setLoading] = useState(false);

  // Sync category when defaultCategory changes (e.g. switching Proof/Final in sidebar)
  useEffect(() => {
    setCategory(defaultCategory);
  }, [defaultCategory, open]);

  const handleCreate = async () => {
    if (!title.trim() || !user) return;
    setLoading(true);

    const { error } = await supabase.from("galleries").insert([{
      photographer_id: user.id,
      title: title.trim(),
      category,
    }] as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Gallery created" });
      setTitle("");
      setCategory("proof");
      onOpenChange(false);
      onCreated();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-none border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-light tracking-wide">New Gallery</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 pt-2">
          <div className="flex flex-col gap-2">
            <Label className="text-xs tracking-widest uppercase text-muted-foreground font-light">
              Gallery Name
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Wedding — Ana & Pedro"
              className="rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs tracking-widest uppercase text-muted-foreground font-light">
              Type
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="rounded-none border-border focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="proof">Proof Gallery</SelectItem>
                <SelectItem value="final">Final Gallery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleCreate}
            disabled={!title.trim() || loading}
            className="w-full mt-2"
            size="lg"
          >
            {loading ? "Creating…" : "Create Gallery"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
