import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Globe, Server, Shield, Clock, CheckCircle2, AlertTriangle, ExternalLink, ChevronRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Go to Project Settings → Domains",
    description:
      "In your dashboard, open Settings and navigate to the Domains section. Click Connect Domain and type your domain name (e.g. booking.mystudio.com).",
  },
  {
    number: "02",
    title: "Add DNS records at your registrar",
    description:
      "Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add the following records exactly as shown.",
  },
  {
    number: "03",
    title: "Wait for DNS propagation",
    description:
      "DNS changes can take up to 48 hours to propagate worldwide. Once verified, SSL is provisioned automatically and your domain goes live.",
  },
];

const records = [
  { type: "A", name: "@", value: "185.158.133.1", purpose: "Root domain (yourdomain.com)" },
  { type: "A", name: "www", value: "185.158.133.1", purpose: "WWW subdomain" },
  { type: "TXT", name: "_lovable", value: "lovable_verify=<provided>", purpose: "Domain ownership verification" },
];

const statuses = [
  { label: "Action required", color: "text-orange-500", icon: AlertTriangle, desc: "Setup was started but not completed. Return to Domains and click Complete Setup." },
  { label: "Verifying", color: "text-yellow-500", icon: Clock, desc: "Waiting for DNS propagation. No action needed — this can take up to 48 h." },
  { label: "Setting up", color: "text-blue-500", icon: Server, desc: "Verification succeeded and SSL is being provisioned. Transitions automatically." },
  { label: "Active", color: "text-green-500", icon: CheckCircle2, desc: "Your domain is live and serving your store." },
  { label: "Offline", color: "text-red-500", icon: AlertTriangle, desc: "DNS changed and no longer matches. Fix the A records at your registrar." },
  { label: "Failed", color: "text-red-500", icon: AlertTriangle, desc: "SSL could not be provisioned. Click Retry after verifying DNS records." },
];

const faqs = [
  {
    q: "Do I need to add both root and www?",
    a: "Yes. Add both yourdomain.com and www.yourdomain.com as separate entries so visitors using either form are directed to your store.",
  },
  {
    q: "Can I use a subdomain (e.g. book.mystudio.com)?",
    a: "Absolutely. Type the full subdomain in the domain input. Add an A record with name book pointing to 185.158.133.1 at your registrar.",
  },
  {
    q: "Will HTTPS / SSL work automatically?",
    a: "Yes. SSL certificates are provisioned automatically once ownership is verified. No manual certificate installation is required.",
  },
  {
    q: "My domain isn't verifying after 48 hours. What do I do?",
    a: "Double-check that there are no conflicting A or CNAME records for the same name. Use a tool like DNSChecker.org to inspect current DNS values, then remove any conflicting records.",
  },
  {
    q: "Can I move a domain from one store to another?",
    a: "Yes. Prove ownership again in the Domains settings of the destination project and the domain will transfer over.",
  },
];

const CustomDomainDocs = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-h-0">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-12 space-y-14">

              {/* Hero */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] tracking-[0.35em] uppercase text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Settings</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>Custom Domain</span>
                </div>
                <h1 className="text-2xl font-light tracking-wide">Custom Domain Setup</h1>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                  Point your own domain (e.g.{" "}
                  <span className="font-mono text-[12px] bg-muted px-1.5 py-0.5 rounded">booking.mystudio.com</span>)
                  at your store so clients see your brand, not a generic URL.
                </p>
              </div>

              {/* Steps */}
              <section className="space-y-4">
                <h2 className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground">How it works</h2>
                <div className="space-y-px">
                  {steps.map((step) => (
                    <div key={step.number} className="flex gap-5 p-5 border border-border bg-card">
                      <span className="text-2xl font-light text-muted-foreground/30 shrink-0 w-8 text-right leading-none mt-0.5">
                        {step.number}
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-light">{step.title}</p>
                        <p className="text-[12px] text-muted-foreground leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* DNS Records */}
              <section className="space-y-4">
                <h2 className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground">DNS Records</h2>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  Add these records in your domain registrar's DNS management panel. The exact values are also shown inside the Domains settings flow.
                </p>
                <div className="border border-border overflow-hidden">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 font-light text-muted-foreground tracking-wide">Type</th>
                        <th className="text-left px-4 py-3 font-light text-muted-foreground tracking-wide">Name</th>
                        <th className="text-left px-4 py-3 font-light text-muted-foreground tracking-wide">Value</th>
                        <th className="text-left px-4 py-3 font-light text-muted-foreground tracking-wide hidden sm:table-cell">Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px] text-foreground">{r.type}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-foreground">{r.name}</td>
                          <td className="px-4 py-3 font-mono text-foreground break-all">{r.value}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-start gap-2.5 p-4 border border-border bg-muted/20">
                  <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    Remove any conflicting A records or CNAME records for the same name before adding these. Conflicting records are the most common cause of verification failure.
                  </p>
                </div>
              </section>

              {/* Domain Statuses */}
              <section className="space-y-4">
                <h2 className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground">Domain Statuses</h2>
                <div className="space-y-px">
                  {statuses.map((s) => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="flex items-start gap-3 p-4 border border-border bg-card">
                        <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${s.color}`} />
                        <div className="space-y-0.5">
                          <span className="text-[12px] font-light">{s.label}</span>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* SSL */}
              <section className="space-y-4">
                <h2 className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground">SSL / HTTPS</h2>
                <div className="flex items-start gap-3 p-5 border border-border bg-card">
                  <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-light">Automatic SSL provisioning</p>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      Once domain ownership is verified, an SSL certificate is issued automatically via Let's Encrypt. No manual installation is needed. If your registrar uses CAA records, ensure they permit Let's Encrypt as a certificate authority.
                    </p>
                  </div>
                </div>
              </section>

              {/* FAQ */}
              <section className="space-y-4">
                <h2 className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground">Frequently Asked Questions</h2>
                <div className="space-y-px">
                  {faqs.map((faq, i) => (
                    <div key={i} className="p-5 border border-border bg-card space-y-2">
                      <p className="text-[13px] font-light">{faq.q}</p>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Troubleshooting */}
              <section className="space-y-4">
                <h2 className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground">Troubleshooting</h2>
                <div className="p-5 border border-border bg-card space-y-3 text-[12px] text-muted-foreground leading-relaxed">
                  <p>If your domain isn't verifying after 48 hours, try the following:</p>
                  <ul className="space-y-2 list-none">
                    {[
                      "Confirm the A record for both the root domain and www point to 185.158.133.1.",
                      "Check for conflicting A records or CNAME records with the same name and remove them.",
                      "Use DNSChecker.org to see the current DNS values propagated worldwide.",
                      "If you have CAA records, add letsencrypt.org as an allowed authority.",
                      "DNS changes can take up to 72 hours in rare cases — wait and retry.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="shrink-0 text-muted-foreground/40 font-mono">{i + 1}.</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <a
                  href="https://dnschecker.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-fit"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open DNSChecker.org
                </a>
              </section>

            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CustomDomainDocs;
