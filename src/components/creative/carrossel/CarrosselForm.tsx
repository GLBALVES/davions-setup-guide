import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";
import type { FormData } from "@/pages/dashboard/creative/CarrosselPage";

interface Props {
  onGenerate: (data: FormData) => void;
  isLoading: boolean;
  progress: number;
}

const CarrosselForm = ({ onGenerate, isLoading, progress }: Props) => {
  const [tema, setTema] = useState("");
  const [tom, setTom] = useState("Educativo");
  const [nicho, setNicho] = useState("");
  const [quantidade, setQuantidade] = useState(7);
  const [marca, setMarca] = useState("");
  const [cta, setCta] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tema.trim()) return;
    onGenerate({ tema, tom, nicho, quantidade, marca, cta });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Configuração do Carrossel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="tema">Tema ou ideia principal</Label>
            <Textarea
              id="tema"
              placeholder="Ex: 5 erros que afastam clientes na hora do pagamento"
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tom de voz</Label>
              <Select value={tom} onValueChange={setTom}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Educativo">Educativo</SelectItem>
                  <SelectItem value="Vendas">Vendas</SelectItem>
                  <SelectItem value="Autoridade">Autoridade</SelectItem>
                  <SelectItem value="Provocativo">Provocativo</SelectItem>
                  <SelectItem value="Inspiracional">Inspiracional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="nicho">Nicho / área</Label>
              <Input id="nicho" placeholder="Ex: SaaS, saúde, RH..." value={nicho} onChange={(e) => setNicho(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label>Quantidade de slides</Label>
              <Select value={String(quantidade)} onValueChange={(v) => setQuantidade(Number(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 slides</SelectItem>
                  <SelectItem value="7">7 slides</SelectItem>
                  <SelectItem value="9">9 slides</SelectItem>
                  <SelectItem value="10">10 slides</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="marca">Nome da marca (opcional)</Label>
              <Input id="marca" placeholder="Ex: Minha Marca" value={marca} onChange={(e) => setMarca(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label htmlFor="cta">CTA final</Label>
            <Input id="cta" placeholder="Ex: Siga para mais dicas" value={cta} onChange={(e) => setCta(e.target.value)} className="mt-1" />
          </div>

          {isLoading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">Gerando carrossel com IA...</p>
            </div>
          )}

          <Button type="submit" disabled={isLoading || !tema.trim()} className="w-full">
            {isLoading ? <>Gerando...</> : <><Sparkles className="h-4 w-4 mr-2" />Gerar carrossel com IA</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CarrosselForm;
