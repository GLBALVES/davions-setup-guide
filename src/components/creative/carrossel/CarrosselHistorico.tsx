import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { CarrosselData } from "@/pages/dashboard/creative/CarrosselPage";

interface HistoricoItem {
  id: string;
  tema: string;
  created_at: string;
  slides_json: CarrosselData;
}

interface Props {
  onLoad: (data: CarrosselData) => void;
  refreshKey?: number;
}

const CarrosselHistorico = ({ onLoad, refreshKey }: Props) => {
  const { user } = useAuth();
  const photographerId = user?.id ?? null;
  const [items, setItems] = useState<HistoricoItem[]>([]);

  useEffect(() => {
    if (!photographerId) return;
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("carousel_historico")
        .select("id, tema, created_at, slides_json")
        .eq("photographer_id", photographerId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) {
        setItems(data as unknown as HistoricoItem[]);
      }
    };
    fetchHistory();
  }, [photographerId, refreshKey]);

  if (items.length === 0) return null;

  return (
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
                <p className="font-medium text-sm text-foreground truncate">{item.tema}</p>
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
              <Button variant="outline" size="sm" onClick={() => onLoad(item.slides_json)}>
                Carregar
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CarrosselHistorico;
