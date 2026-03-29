import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminEmailManager from "@/components/admin/AdminEmailManager";

export default function AdminEmail() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <div className="h-12 border-b flex items-center px-4 shrink-0">
        <Button variant="ghost" size="sm" className="gap-1.5 text-sm" onClick={() => navigate("/admin")}>
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <AdminEmailManager />
      </div>
    </div>
  );
}
