import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Server, Network, Layers, Cpu, Wrench, PlusCircle, AlertTriangle,
  ChevronRight, Copy, Check, Terminal,
} from "lucide-react";
import { toast } from "sonner";

type SectionId = "overview" | "architecture" | "services" | "smart-proxy" | "traefik" | "new-app" | "troubleshooting";
interface NavItem { id: SectionId; label: string; icon: React.ElementType; }

const NAV: NavItem[] = [
  { id: "overview", label: "Visão Geral", icon: Server },
  { id: "architecture", label: "Arquitetura", icon: Network },
  { id: "services", label: "Serviços", icon: Layers },
  { id: "smart-proxy", label: "Smart Proxy", icon: Cpu },
  { id: "traefik", label: "Traefik", icon: Network },
  { id: "new-app", label: "Novo App", icon: PlusCircle },
  { id: "troubleshooting", label: "Troubleshooting", icon: Wrench },
];

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative rounded-md overflow-hidden border border-border bg-muted my-3">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary">
        <span className="text-[10px] tracking-widest uppercase text-muted-foreground font-mono">{lang}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="px-4 py-3 text-xs font-mono text-foreground overflow-x-auto leading-relaxed whitespace-pre">
        {code.trim()}
      </pre>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: "green" | "blue" | "yellow" | "muted" }) {
  const styles: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    muted: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={cn("inline-block text-[10px] tracking-wider uppercase font-mono px-2 py-0.5 rounded border", styles[color])}>
      {label}
    </span>
  );
}

function DocSection({ id, title, icon: Icon, children }: { id: SectionId; title: string; icon: React.ElementType; children: React.ReactNode; }) {
  return (
    <section id={`docs-${id}`} className="scroll-mt-4 mb-12">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-7 h-7 rounded-md bg-secondary border border-border flex items-center justify-center shrink-0">
          <Icon size={13} className="text-muted-foreground" />
        </div>
        <h2 className="text-sm font-light text-foreground tracking-wide">{title}</h2>
      </div>
      <div className="pl-9">{children}</div>
    </section>
  );
}

function DocTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border mb-4">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-border bg-secondary">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-2.5 text-[10px] tracking-widest uppercase text-muted-foreground font-light">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={cn("border-b border-border last:border-0", i % 2 === 0 ? "bg-background" : "bg-secondary/50")}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-foreground/70">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs leading-relaxed mb-4 text-yellow-800">
      <AlertTriangle size={13} className="shrink-0 mt-0.5 text-yellow-600" />
      <div>{children}</div>
    </div>
  );
}

export default function AdminVpsDocsContent() {
  const [active, setActive] = useState<SectionId>("overview");

  const scrollTo = (id: SectionId) => {
    setActive(id);
    const el = document.getElementById(`docs-${id}`);
    const container = document.getElementById("vps-docs-scroll");
    if (el && container) {
      container.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" });
    }
  };

  return (
    <div className="-mx-8 -mt-8 flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
      {/* Sticky horizontal nav — always visible */}
      <div className="shrink-0 border-b border-border bg-background">
        <nav className="flex gap-0 overflow-x-auto px-6 pt-3">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 pb-3 text-[11px] font-light tracking-wide transition-colors duration-150 whitespace-nowrap border-b-2 -mb-px",
                active === id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={11} className="shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Scrollable content only */}
      <main id="vps-docs-scroll" className="flex-1 overflow-y-auto px-10 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-1">
              <Terminal size={12} className="text-muted-foreground" />
              <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-light">Documentação de Referência</p>
            </div>
            <h1 className="text-2xl font-light text-foreground">Infraestrutura VPS</h1>
            <p className="text-xs text-muted-foreground mt-1 font-light">Referência técnica de operação do servidor de produção.</p>
          </div>

          <DocSection id="overview" title="Visão Geral" icon={Server}>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: "IP do Servidor", value: "147.93.112.182" },
                { label: "Hostname", value: "srv700943" },
                { label: "Sistema Operacional", value: "Ubuntu 24 LTS" },
                { label: "Gerenciador", value: "Easypanel" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-md border border-border bg-secondary/50 px-4 py-3">
                  <p className="text-[9px] tracking-widest uppercase text-muted-foreground font-light mb-1">{label}</p>
                  <p className="text-sm font-mono text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </DocSection>

          <DocSection id="architecture" title="Arquitetura" icon={Network}>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4 font-light">Fluxo de uma requisição de domínio customizado:</p>
            <div className="flex items-center gap-2 flex-wrap mb-5 text-xs font-mono">
              {["Browser", "DNS", "VPS :443", "Traefik (SSL)", "Smart Proxy :3000", "Supabase"].map((step, i, arr) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="bg-secondary border border-border rounded px-2.5 py-1 text-foreground/70">{step}</span>
                  {i < arr.length - 1 && <ChevronRight size={12} className="text-muted-foreground shrink-0" />}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4 font-light">
              O Smart Proxy consulta o Supabase para resolver o destino, injetando o header{" "}
              <code className="text-blue-600 font-mono text-[11px] bg-blue-50 px-1 rounded">X-Forwarded-Host</code>.
            </p>
            <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 font-light">Lógica de resolução</p>
            <DocTable
              headers={["Condição", "Destino"]}
              rows={[
                ["Domínio em tenant_sites (Gleamhub) com domain_verified=true", "→ gleamhub.app"],
                ["Domínio raiz encontrado no Gleamhub", "→ gleamhub.app"],
                ["Domínio em photographers (Davions)", "→ davions.com"],
                ["Não encontrado", "→ Página neutra \"Domain Not Configured\""],
              ]}
            />
            <div className="flex items-center gap-2 mt-2">
              <Badge label="Cache" color="blue" />
              <span className="text-xs text-muted-foreground font-light">5 minutos por domínio (in-memory Map)</span>
            </div>
          </DocSection>

          <DocSection id="services" title="Serviços em Execução" icon={Layers}>
            <DocTable
              headers={["Serviço", "Porta(s)", "Status"]}
              rows={[
                ["traefik", "80 / 443", "● running"],
                ["smart-proxy", "3000", "● running"],
                ["easypanel", "3000 (interno)", "● running"],
                ["n8n_editor", "5678", "● running"],
                ["n8n_webhook", "5678", "● running"],
                ["postgres", "5432", "● running"],
                ["redis", "6379", "● running"],
              ]}
            />
            <CodeBlock lang="bash" code={`sudo docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"`} />
          </DocSection>

          <DocSection id="smart-proxy" title="Smart Proxy" icon={Cpu}>
            <div className="flex gap-3 mb-4 flex-wrap">
              {[
                { label: "Código", value: "/etc/smart-proxy/server.js" },
                { label: "Container", value: "/etc/smart-proxy/Dockerfile" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded border border-border bg-secondary/50 px-3 py-2">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-light mb-0.5">{label}</p>
                  <code className="text-[11px] font-mono text-foreground/70">{value}</code>
                </div>
              ))}
            </div>
            <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 font-light">Endpoints</p>
            <DocTable
              headers={["Método", "Path", "Descrição"]}
              rows={[
                ["GET", "/api/certs", "Lista certificados SSL do acme.json do Traefik"],
                ["GET", "/docs", "Página de status e documentação inline"],
              ]}
            />
            <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 mt-5 font-light">Rebuild do container</p>
            <CodeBlock code={`cd /etc/smart-proxy
sudo docker build -t smart-proxy .
sudo docker rm -f smart-proxy
sudo docker run -d --name smart-proxy --network easypanel \\
  --mount type=bind,source=/etc/easypanel/traefik/acme.json,destination=/data/acme.json,readonly \\
  --label traefik.enable=true \\
  --label "traefik.http.routers.smart-proxy.rule=HostRegexp(\`.+\`)" \\
  --label traefik.http.routers.smart-proxy.entrypoints=https \\
  --label traefik.http.routers.smart-proxy.tls=true \\
  --label traefik.http.routers.smart-proxy.tls.certresolver=letsencrypt \\
  --label traefik.http.routers.smart-proxy.priority=1 \\
  --label traefik.http.services.smart-proxy.loadbalancer.server.port=3000 \\
  smart-proxy`} />
          </DocSection>

          <DocSection id="traefik" title="Traefik" icon={Network}>
            <Callout>
              Usa <strong>provider file</strong> (<code className="font-mono">main.yaml</code>), não labels Docker.
              Novos routers devem ser adicionados via script Python ao{" "}
              <code className="font-mono">/etc/easypanel/traefik/config/main.yaml</code>.
            </Callout>
            <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 font-light">Reiniciar Traefik</p>
            <CodeBlock code="sudo docker service update --force traefik" />
            <Callout>Se o Traefik não subir: verifique se o Caddy está conflitando nas portas 80/443.</Callout>
            <CodeBlock code={`sudo systemctl stop caddy\nsudo systemctl disable caddy`} />
          </DocSection>

          <DocSection id="new-app" title="Adicionar Novo App" icon={PlusCircle}>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4 font-light">Passos para suportar um terceiro app no Smart Proxy:</p>
            <ol className="flex flex-col gap-3 text-xs text-muted-foreground font-light">
              {[
                "Adicionar NOVOAPP_URL e NOVOAPP_KEY no server.js.",
                "Criar função checkNovoApp(domain) que consulta o banco do novo app.",
                "Criar novoappProxy com createProxyMiddleware apontando para o domínio do novo app.",
                "Adicionar chamada em resolveApp() antes do fallback Davions.",
                "Rebuild do container (ver seção Smart Proxy).",
              ].map((text, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
            <CodeBlock lang="js" code={`async function checkNovoApp(domain) {
  const res = await fetch(\`\${NOVOAPP_URL}/api/domain?host=\${domain}\`);
  return res.ok && (await res.json()).found;
}

const novoappProxy = createProxyMiddleware({
  target: NOVOAPP_URL,
  changeOrigin: true,
  on: { proxyReq: (preq, req) => preq.setHeader("X-Forwarded-Host", req.headers.host) },
});

async function resolveApp(req, res) {
  const host = req.headers.host;
  if (await checkGleamhub(host)) return gleamhubProxy(req, res);
  if (await checkNovoApp(host))  return novoappProxy(req, res); // ← inserir aqui
  return davionsProxy(req, res);
}`} />
          </DocSection>

          <DocSection id="troubleshooting" title="Troubleshooting" icon={Wrench}>
            <div className="flex flex-col gap-5">
              {[
                {
                  title: "\"Domain Not Configured\" inesperado",
                  items: [
                    "Verificar se o domínio está cadastrado no banco correto.",
                    "Confirmar domain_verified = true na tabela do Gleamhub.",
                    "Aguardar expiração do cache (5 min) ou reiniciar o container.",
                  ],
                },
                {
                  title: "Erro SSL 526 (Cloudflare)",
                  items: [
                    "No painel Cloudflare, mudar para DNS Only (nuvem cinza).",
                    "Verificar se o registro A aponta para 147.93.112.182.",
                    "Aguardar propagação DNS (pode levar até 30 min).",
                  ],
                },
              ].map(({ title, items }) => (
                <div key={title} className="rounded-md border border-yellow-200 bg-yellow-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-yellow-200 bg-yellow-100/60">
                    <p className="text-xs font-mono text-yellow-800">⚠ {title}</p>
                  </div>
                  <div className="px-4 py-3 text-xs text-yellow-700 font-light leading-relaxed flex flex-col gap-1.5">
                    {items.map((item, i) => <p key={i}>{i + 1}. {item}</p>)}
                  </div>
                </div>
              ))}
              <div>
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 font-light">Comandos úteis</p>
                <CodeBlock code={`# Ver containers em execução
sudo docker ps

# Logs do Smart Proxy (últimas 50 linhas)
sudo docker logs smart-proxy --tail 50

# Verificar certificados SSL
curl https://davions.giombelli.com.br/api/certs

# Forçar reload do Traefik
sudo docker service update --force traefik`} />
              </div>
            </div>
          </DocSection>
        </div>
      </main>
    </div>
  );
}
