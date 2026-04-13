import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Save, TestTube, ArrowLeft, Instagram, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const MetaConfigPage = () => {
  const { user } = useAuth();
  const photographerId = user?.id ?? null;

  const [appId, setAppId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [igAccountId, setIgAccountId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    if (photographerId) loadConfig();
  }, [photographerId]);

  const loadConfig = async () => {
    if (!photographerId) return;
    const { data } = await supabase
      .from("carousel_meta_config")
      .select("*")
      .eq("photographer_id", photographerId)
      .limit(1)
      .maybeSingle();

    if (data) {
      setConfigId(data.id);
      setAppId(data.app_id || "");
      setAccessToken(data.access_token || "");
      setIgAccountId(data.ig_account_id || "");
    }
  };

  const handleSave = async () => {
    if (!photographerId) return;
    setIsSaving(true);
    try {
      if (configId) {
        const { error } = await supabase
          .from("carousel_meta_config")
          .update({ app_id: appId, access_token: accessToken, ig_account_id: igAccountId, updated_at: new Date().toISOString() })
          .eq("id", configId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("carousel_meta_config")
          .insert({ app_id: appId, access_token: accessToken, ig_account_id: igAccountId, photographer_id: photographerId })
          .select()
          .single();
        if (error) throw error;
        setConfigId(data.id);
      }
      toast.success("Configurações salvas!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!accessToken || !igAccountId) {
      toast.error("Preencha o Access Token e o Instagram Account ID");
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}?fields=id,username&access_token=${accessToken}`
      );
      const data = await res.json();
      if (data.error) {
        toast.error(`Erro: ${data.error.message}`);
      } else {
        toast.success(`Conectado! Conta: @${data.username}`);
      }
    } catch {
      toast.error("Erro ao testar conexão");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/dashboard/creative/carrossel">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Instagram className="h-6 w-6" /> Configuração Meta
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure a integração com o Instagram para postagem automática
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como obter as credenciais</CardTitle>
          <CardDescription>Siga os passos abaixo para configurar a integração com o Meta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="font-medium text-foreground">1. Crie um App no Meta for Developers</p>
            <p>
              Acesse{" "}
              <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                developers.facebook.com <ExternalLink className="h-3 w-3" />
              </a>{" "}
              e crie um app do tipo "Business".
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">2. Configure o Instagram Graph API</p>
            <p>No seu app, adicione o produto "Instagram Graph API" e configure as permissões necessárias.</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">3. Gere um Access Token</p>
            <p>
              No Graph API Explorer, gere um token com as permissões:{" "}
              <code className="bg-muted px-1 rounded">instagram_basic</code>,{" "}
              <code className="bg-muted px-1 rounded">instagram_content_publish</code>,{" "}
              <code className="bg-muted px-1 rounded">pages_show_list</code>,{" "}
              <code className="bg-muted px-1 rounded">pages_read_engagement</code>.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">4. Encontre o Instagram Business Account ID</p>
            <p>
              Use a chamada <code className="bg-muted px-1 rounded">GET /me/accounts</code> para obter o page ID, depois{" "}
              <code className="bg-muted px-1 rounded">{"GET /{page-id}?fields=instagram_business_account"}</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Credenciais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appId">App ID</Label>
            <Input id="appId" placeholder="Ex: 1234567890" value={appId} onChange={(e) => setAppId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessToken">Access Token</Label>
            <Input id="accessToken" type="password" placeholder="Cole seu access token aqui" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="igAccountId">Instagram Business Account ID</Label>
            <Input id="igAccountId" placeholder="Ex: 17841400000000000" value={igAccountId} onChange={(e) => setIgAccountId(e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
              <TestTube className="h-4 w-4 mr-1" />
              {isTesting ? "Testando..." : "Testar Conexão"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetaConfigPage;
