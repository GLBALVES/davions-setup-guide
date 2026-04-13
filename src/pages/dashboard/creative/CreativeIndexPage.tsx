import { Link } from "react-router-dom";
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
          <div className="flex flex-col items-center justify-center h-28 p-6 border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer text-center">
            <Layers className="h-8 w-8 mb-2 text-foreground" />
            <span className="text-sm font-medium text-foreground">Gerador de Carrossel</span>
            <span className="text-xs text-muted-foreground mt-1">Posts para Instagram com IA</span>
          </div>
        </Link>
        <Link to="/dashboard/creative/meta-config">
          <div className="flex flex-col items-center justify-center h-28 p-6 border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer text-center">
            <Instagram className="h-8 w-8 mb-2 text-foreground" />
            <span className="text-sm font-medium text-foreground">Config Meta</span>
            <span className="text-xs text-muted-foreground mt-1">Integração Instagram</span>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default CreativeIndexPage;
