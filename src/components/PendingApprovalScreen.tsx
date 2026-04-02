import { Clock, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const messages = {
  en: {
    title: "Account Pending Approval",
    description: "Your account is being reviewed by our team. You'll receive access once approved.",
    logout: "Sign Out",
  },
  pt: {
    title: "Conta Pendente de Aprovação",
    description: "Sua conta está sendo analisada pela nossa equipe. Você terá acesso assim que for aprovado.",
    logout: "Sair",
  },
  es: {
    title: "Cuenta Pendiente de Aprobación",
    description: "Tu cuenta está siendo revisada por nuestro equipo. Tendrás acceso una vez aprobada.",
    logout: "Cerrar Sesión",
  },
};

export default function PendingApprovalScreen() {
  const { signOut } = useAuth();
  const { lang } = useLanguage();
  const t = messages[language as keyof typeof messages] || messages.en;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
        <Clock className="h-8 w-8 text-yellow-600" />
      </div>
      <div>
        <h1 className="text-xl font-light mb-2">{t.title}</h1>
        <p className="text-sm text-muted-foreground max-w-sm">{t.description}</p>
      </div>
      <button
        onClick={signOut}
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mt-4"
      >
        <LogOut size={14} />
        {t.logout}
      </button>
    </div>
  );
}
