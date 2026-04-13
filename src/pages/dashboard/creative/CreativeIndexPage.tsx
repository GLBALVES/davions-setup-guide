import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Layers, Instagram } from "lucide-react";

const CreativeIndexPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Creative Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">Ferramentas criativas com inteligência artificial</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
        <Link to="/dashboard/creative/carrossel">
          <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
            <Layers className="h-6 w-6" />
            <span className="text-sm font-medium">Gerador de Carrossel</span>
            <span className="text-xs text-muted-foreground">Posts para Instagram com IA</span>
          </Button>
        </Link>
        <Link to="/dashboard/creative/meta-config">
          <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
            <Instagram className="h-6 w-6" />
            <span className="text-sm font-medium">Config Meta</span>
            <span className="text-xs text-muted-foreground">Integração Instagram</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default CreativeIndexPage;
