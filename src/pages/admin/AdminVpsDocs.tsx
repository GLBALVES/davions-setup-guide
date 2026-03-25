import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";
import {
  Server, Network, Layers, Cpu, Wrench, PlusCircle, AlertTriangle,
  ChevronRight, Copy, Check, Terminal,
} from "lucide-react";
import { toast } from "sonner";

/* ─── Types ─── */
type SectionId =
  | "overview"
  | "architecture"
  | "services"
  | "smart-proxy"
  | "traefik"
  | "new-app"
  | "troubleshooting";

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ElementType;
}

/* ─── Nav config ─── */
const NAV: NavItem[] = [
  { id: "overview", label: "Visão Geral", icon: Server },
  { id: "architecture", label: "Arquitetura", icon: Network },
  { id: "services", label: "Serviços", icon: Layers },
  { id: "smart-proxy", label: "Smart Proxy", icon: Cpu },
  { id: "traefik", label: "Traefik", icon: Network },
  { id: "new-app", label: "Novo App", icon: PlusCircle },
  { id: "troubleshooting", label: "Troubleshooting", icon: Wrench },
];

/* ─── Code Block ─── */
function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-[#0d1117] my-3">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <span className="text-[10px] tracking-widest uppercase text-white/40 font-mono">{lang}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/70 transition-colors"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="px-4 py-3 text-xs font-mono text-[#e6edf3] overflow-x-auto leading-relaxed whitespace-pre">
        {code.trim()}
      </pre>
    </div>
  );
}

/* ─── Badge ─── */
function Badge({ label, color }: { label: string; color: "green" | "blue" | "yellow" | "muted" }) {
  const styles: Record<string, string> = {
    green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    blue:  "bg-blue-500/15 text-blue-400 border-blue-500/20",
    yellow:"bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    muted: "bg-white/5 text-white/50 border-white/10",
  };
  return (
    <span className={cn("inline-block text-[10px] tracking-wider uppercase font-mono px-2 py-0.5 rounded border", styles[color])}>
      {label}
    </span>
  );
}

/* ─── Section wrapper ─── */
function Section({ id, title, icon: Icon, children }: {
  id: SectionId; title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 mb-12">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <Icon size={13} className="text-white/50" />
        </div>
        <h2 className="text-base font-light text-white/90 tracking-wide">{title}</h2>
      </div>
      <div className="pl-9">{children}</div>
    </section>
  );
}

/* ─── Table ─── */
function DocTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10 mb-4">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-2.5 text-[10px] tracking-widest uppercase text-white/40 font-light">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={cn("border-b border-white/5 last:border-0", i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]")}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-white/70">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Callout ─── */
function Callout({ children, type = "warn" }: { children: React.ReactNode; type?: "warn" | "info" }) {
  return (
    <div className={cn(
      "flex gap-3 rounded-lg border px-4 py-3 text-xs leading-relaxed mb-4",
      type === "warn"
        ? "bg-yellow-500/5 border-yellow-500/20 text-yellow-200/80"
        : "bg-blue-500/5 border-blue-500/20 text-blue-200/80"
    )}>
      <AlertTriangle size={13} className="shrink-0 mt-0.5 text-yellow-400/70" />
      <div>{children}</div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function AdminVpsDocs() {
  const [active, setActive] = useState<SectionId>("overview");

  const scrollTo = (id: SectionId) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-56px)] bg-[#0a0c10] text-white">

        {/* ── Left nav ── */}
        <aside className="w-52 shrink-0 border-r border-white/8 flex flex-col py-5 sticky top-0 h-full overflow-y-auto">
          <p className="text-[9px] tracking-[0.35em] uppercase text-white/30 px-5 mb-3 font-light">Seções</p>
          <nav className="flex flex-col gap-0.5 px-3">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px] font-light tracking-wide transition-colors duration-150 text-left",
                  active === id
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                )}
              >
                <Icon size={12} className="shrink-0" />
                {label}
                {active === id && <ChevronRight size={10} className="ml-auto text-white/30" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Content ── */}
        <main className="flex-1 overflow-y-auto px-10 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-1">
              <Terminal size={12} className="text-white/30" />
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/30 font-light">Admin · VPS Docs</p>
            </div>
            <h1 className="text-2xl font-light text-white/90">Documentação Técnica VPS</h1>
            <p className="text-xs text-white/30 mt-1 font-light">Referência de infraestrutura e operação do servidor de produção.</p>
          </div>

          {/* ── 1. Visão Geral ── */}
          <Section id="overview" title="Visão Geral" icon={Server}>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: "IP do Servidor", value: "147.93.112.182" },
                { label: "Hostname", value: "srv700943" },
                { label: "Sistema Operacional", value: "Ubuntu 24 LTS" },
                { label: "Gerenciador", value: "Easypanel" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-[9px] tracking-widest uppercase text-white/30 font-light mb-1">{label}</p>
                  <p className="text-sm font-mono text-white/80">{value}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── 2. Arquitetura ── */}
          <Section id="architecture" title="Arquitetura" icon={Network}>
            <p className="text-xs text-white/50 leading-relaxed mb-4 font-light">
              O fluxo de uma requisição de domínio customizado percorre os seguintes estágios:
            </p>

            {/* Flow diagram */}
            <div className="flex items-center gap-2 flex-wrap mb-5 text-xs font-mono">
              {["Browser", "DNS", "VPS :443", "Traefik (SSL)", "Smart Proxy :3000", "Supabase"].map((step, i, arr) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="bg-white/5 border border-white/10 rounded px-2.5 py-1 text-white/70">{step}</span>
                  {i < arr.length - 1 && <ChevronRight size={12} className="text-white/20 shrink-0" />}
                </span>
              ))}
            </div>

            <p className="text-xs text-white/50 leading-relaxed mb-4 font-light">
              O Smart Proxy recebe todas as requisições HTTPS via Traefik e consulta o Supabase para resolver
              o destino correto, injetando o header <code className="text-blue-300 font-mono text-[11px]">X-Forwarded-Host</code> antes
              de fazer o proxy reverso.
            </p>

            <p className="text-[10px] tracking-widest uppercase text-white/30 mb-2 font-light">Lógica de resolução de domínio</p>
            <DocTable
              headers={["Condição", "Destino"]}
              rows={[
                ["Domínio em tenant_sites (Gleamhub) com domain_verified=true", "→ gleamhub.app"],
                ["Domínio raiz encontrado no Gleamhub", "→ gleamhub.app"],
                ["Domínio em photographers (Davions)", "→ davions.com"],
                ["Não encontrado em nenhum app", "→ Página neutra \"Domain Not Configured\""],
              ]}
            />

            <div className="flex items-center gap-2 mt-2">
              <Badge label="Cache" color="blue" />
              <span className="text-xs text-white/40 font-light">5 minutos por domínio (in-memory Map)</span>
            </div>
          </Section>

          {/* ── 3. Serviços ── */}
          <Section id="services" title="Serviços em Execução" icon={Layers}>
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
          </Section>

          {/* ── 4. Smart Proxy ── */}
          <Section id="smart-proxy" title="Smart Proxy" icon={Cpu}>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="rounded border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-[9px] text-white/30 uppercase tracking-widest font-light mb-0.5">Código</p>
                <code className="text-[11px] font-mono text-white/70">/etc/smart-proxy/server.js</code>
              </div>
              <div className="rounded border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-[9px] text-white/30 uppercase tracking-widest font-light mb-0.5">Container</p>
                <code className="text-[11px] font-mono text-white/70">/etc/smart-proxy/Dockerfile</code>
              </div>
            </div>

            <p className="text-[10px] tracking-widest uppercase text-white/30 mb-2 font-light">Endpoints</p>
            <DocTable
              headers={["Método", "Path", "Descrição"]}
              rows={[
                ["GET", "/api/certs", "Lista certificados SSL do acme.json do Traefik"],
                ["GET", "/docs", "Página de status e documentação inline"],
              ]}
            />

            <p className="text-[10px] tracking-widest uppercase text-white/30 mb-2 mt-5 font-light">Rebuild do container</p>
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
          </Section>

          {/* ── 5. Traefik ── */}
          <Section id="traefik" title="Traefik" icon={Network}>
            <Callout>
              Usa <strong>provider file</strong> (<code className="font-mono">main.yaml</code>), não labels Docker.
              Novos routers devem ser adicionados via script Python ao arquivo{" "}
              <code className="font-mono">/etc/easypanel/traefik/config/main.yaml</code>.
            </Callout>

            <p className="text-[10px] tracking-widest uppercase text-white/30 mb-2 font-light">Reiniciar Traefik</p>
            <CodeBlock code="sudo docker service update --force traefik" />

            <Callout>
              Se o Traefik não subir: verifique se o Caddy está conflitando nas portas 80/443.
            </Callout>
            <CodeBlock code={`sudo systemctl stop caddy
sudo systemctl disable caddy`} />
          </Section>

          {/* ── 6. Novo App ── */}
          <Section id="new-app" title="Adicionar Novo App" icon={PlusCircle}>
            <p className="text-xs text-white/50 leading-relaxed mb-4 font-light">
              Passos para suportar um terceiro app no Smart Proxy:
            </p>
            <ol className="flex flex-col gap-3 text-xs text-white/60 font-light">
              {[
                { step: "1", text: "Adicionar NOVOAPP_URL e NOVOAPP_KEY no server.js (variáveis de ambiente ou constantes)." },
                { step: "2", text: "Criar função checkNovoApp(domain) que consulta o banco do novo app e retorna boolean." },
                { step: "3", text: "Criar novoappProxy com createProxyMiddleware apontando para o domínio do novo app." },
                { step: "4", text: "Adicionar chamada em resolveApp() antes do fallback Davions: if (await checkNovoApp(host)) return novoappProxy(req, res);" },
                { step: "5", text: "Rebuild do container (ver seção Smart Proxy)." },
              ].map(({ step, text }) => (
                <li key={step} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-white/40 shrink-0 mt-0.5">
                    {step}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
            <CodeBlock lang="js" code={`// server.js — exemplo de estrutura
const NOVOAPP_URL = process.env.NOVOAPP_URL;

async function checkNovoApp(domain) {
  // consulta banco do novo app
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
  if (await checkNovoApp(host))  return novoappProxy(req, res);  // ← inserir aqui
  return davionsProxy(req, res);
}`} />
          </Section>

          {/* ── 7. Troubleshooting ── */}
          <Section id="troubleshooting" title="Troubleshooting" icon={Wrench}>
            <div className="flex flex-col gap-5">
              {/* Issue 1 */}
              <div className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 bg-white/[0.03]">
                  <p className="text-xs font-mono text-yellow-300/80">⚠ "Domain Not Configured" inesperado</p>
                </div>
                <div className="px-4 py-3 text-xs text-white/50 font-light leading-relaxed flex flex-col gap-1.5">
                  <p>1. Verificar se o domínio está cadastrado no banco correto (photographers ou tenant_sites).</p>
                  <p>2. Confirmar <code className="font-mono text-blue-300/70">domain_verified = true</code> na tabela do Gleamhub.</p>
                  <p>3. Aguardar expiração do cache (5 minutos) ou reiniciar o container para limpar imediatamente.</p>
                </div>
              </div>

              {/* Issue 2 */}
              <div className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 bg-white/[0.03]">
                  <p className="text-xs font-mono text-red-300/80">⚠ Erro SSL 526 (Cloudflare)</p>
                </div>
                <div className="px-4 py-3 text-xs text-white/50 font-light leading-relaxed flex flex-col gap-1.5">
                  <p>1. No painel Cloudflare, mudar o modo de proxy para <Badge label="DNS Only" color="muted" /> (nuvem cinza).</p>
                  <p>2. Verificar se o registro A aponta para <code className="font-mono text-emerald-300/70">147.93.112.182</code>.</p>
                  <p>3. Aguardar propagação DNS (pode levar até 30 min).</p>
                </div>
              </div>

              {/* Commands */}
              <div>
                <p className="text-[10px] tracking-widest uppercase text-white/30 mb-2 font-light">Comandos úteis</p>
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
          </Section>
        </main>
      </div>
    </AdminLayout>
  );
}
