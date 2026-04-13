import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CarrosselData } from "@/pages/dashboard/creative/CarrosselPage";
import type { BackgroundConfig } from "@/components/creative/carrossel/CarrosselBackgroundEditor";

interface HistoricoItem {
  id: string;
  tema: string;
  created_at: string;
  slides_json: CarrosselData;
  layout_model: string | null;
  background_config: BackgroundConfig | null;
}

const LAYOUT_LABELS: Record<string, string> = {
  model1: "Modelo 1",
  model2: "Modelo 2",
  model3: "Modelo 3",
};

interface Props {
  onLoad: (data: CarrosselData, layoutModel?: string, background?: BackgroundConfig) => void;
  refreshKey?: number;
}

const CarrosselHistorico = ({ onLoad, refreshKey }: Props) => {
  const { user } = useAuth();
  const photographerId = user?.id ?? null;
  const [items, setItems] = useState<HistoricoItem[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!photographerId) return;
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("carousel_historico")
        .select("id, tema, created_at, slides_json, layout_model, background_config")
        .eq("photographer_id", photographerId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) {
        setItems(data as unknown as HistoricoItem[]);
      }
    };
    fetchHistory();
  }, [photographerId, refreshKey]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("carousel_historico")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast.error("Erro ao deletar item do histórico");
      console.error(error);
    } else {
      setItems((prev) => prev.filter((item) => item.id !== deleteId));
      toast.success("Item deletado com sucesso");
    }
    setDeleteId(null);
  };

  if (items.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Histórico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-foreground truncate">{item.tema}</p>
                    {item.layout_model && LAYOUT_LABELS[item.layout_model] && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {LAYOUT_LABELS[item.layout_model]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLoad(
                      item.slides_json,
                      item.layout_model ?? undefined,
                      item.background_config ?? undefined,
                    )}
                  >
                    Carregar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar carrossel?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O carrossel será removido permanentemente do histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CarrosselHistorico;
