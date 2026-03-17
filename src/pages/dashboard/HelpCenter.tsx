import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BugReportDialog } from "@/components/dashboard/BugReportDialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Camera,
  CalendarDays,
  Images,
  DollarSign,
  Globe,
  Settings,
  Bot,
  Mail,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  Bug,
  BookOpen,
  Zap,
} from "lucide-react";

interface Article {
  q: string;
  a: string;
}

interface Category {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  articles: Article[];
}

const categories: Category[] = [
  {
    id: "getting-started",
    icon: HelpCircle,
    title: "Getting Started",
    description: "Set up your account and understand the basics",
    articles: [
      {
        q: "How do I complete my profile?",
        a: "Go to **Settings → My Profile**. Fill in your name, business name, phone, address, and upload your profile/hero image. A complete profile is required to activate your public store.",
      },
      {
        q: "What is a Store Slug?",
        a: "Your store slug is the unique URL segment for your public booking page (e.g. `davions.app/store/your-slug`). You can set it in **Settings → My Profile**. It cannot contain spaces — use hyphens instead.",
      },
      {
        q: "How do I connect Stripe to accept payments?",
        a: "Go to **Settings → My Profile** and click **Connect Stripe**. You will be redirected to Stripe to create or link an existing account. Once connected, clients can pay at checkout and funds go directly to your Stripe account.",
      },
      {
        q: "Can I invite team members?",
        a: "Yes. Go to **Settings → Access Control** and click **Create Studio User**. Enter their email address and assign the permissions they need. They will receive an invitation email.",
      },
    ],
  },
  {
    id: "sessions",
    icon: CalendarDays,
    title: "Sessions & Bookings",
    description: "Create sessions, manage availability, and receive bookings",
    articles: [
      {
        q: "How do I create a session?",
        a: "Go to **Sessions → New Session**. Fill in the title, price, duration, description, and cover image. Set the availability (specific dates or recurring weekly slots). Publish the session to make it visible on your store.",
      },
      {
        q: "What is a deposit?",
        a: "A deposit is an upfront partial payment clients make when booking. Enable it on the session form, set either a fixed amount or a percentage, and the remaining balance is collected separately.",
      },
      {
        q: "How does availability work?",
        a: "Each session has its own availability calendar. You can add specific one-off dates or recurring weekly time slots. Clients can only book within those slots. Set **booking notice** (minimum advance notice) and **booking window** (how far ahead clients can book).",
      },
      {
        q: "How do I block time off?",
        a: "Go to **Schedule** and click on any day or time slot to open the **Block Time** dialog. You can block full days or specific hours with an optional reason. Blocked times prevent new bookings in those slots.",
      },
      {
        q: "What is a Session Extra?",
        a: "Extras are optional add-ons clients can select at checkout (e.g. rush delivery, additional prints). Add them inside the session form under the **Extras** tab. Each extra has a name, price, and available quantity.",
      },
      {
        q: "How do I send a gallery link after the shoot?",
        a: "Go to **Proof Galleries**, open the gallery, and click **Send Gallery Link**. The client will receive an email with their unique access link. If the gallery has an access code, the code is included in the email.",
      },
    ],
  },
  {
    id: "galleries",
    icon: Images,
    title: "Galleries",
    description: "Upload, organize, and deliver photos to clients",
    articles: [
      {
        q: "What is the difference between Proof and Final galleries?",
        a: "**Proof galleries** are for client selection — clients can favorite photos and you can see their picks. **Final galleries** are for delivering edited photos. Both types support access codes and expiration dates.",
      },
      {
        q: "How do I upload photos to a gallery?",
        a: "Open any gallery from the Galleries page and use the **Lightroom Plugin** or the **web uploader** (drag & drop). The Lightroom Plugin is the fastest option for large batches — download it from **Settings → Personalize**.",
      },
      {
        q: "How do I add a watermark?",
        a: "Go to **Settings → Personalize → Watermarks**. Upload your watermark image (PNG with transparency recommended). Then open any gallery, click the watermark icon, and select the watermark to apply it to all photos.",
      },
      {
        q: "How do I set an expiration date on a gallery?",
        a: "When creating or editing a gallery, set the **Expires at** field. After that date, the gallery will no longer be accessible by clients. You can extend or remove the expiration at any time.",
      },
      {
        q: "Can clients download photos from the gallery?",
        a: "Yes. Clients can download individual photos or a full ZIP of the gallery. The download option appears in the gallery view. You can disable downloads per gallery if needed.",
      },
    ],
  },
  {
    id: "finance",
    icon: DollarSign,
    title: "Finance",
    description: "Track revenue, receivables, payables, and cash flow",
    articles: [
      {
        q: "What is the Finance Dashboard?",
        a: "The Finance Dashboard gives you a real-time overview of your studio's financial health: **total revenue**, **pending receivables**, **cash flow**, and period-over-period comparisons.",
      },
      {
        q: "How do I log a manual transaction?",
        a: "Go to **Finance → Receivables** (for income) or **Finance → Payables** (for expenses). Click **New** and fill in the description, amount, category, and due date. Manual entries supplement automatic Stripe payments.",
      },
      {
        q: "How do Stripe payouts work?",
        a: "Payments collected through your store go to your Stripe account. Stripe processes payouts to your bank account on a rolling schedule (typically 2 business days). You can view your Stripe balance and recent payouts in **Finance → Revenue**.",
      },
    ],
  },
  {
    id: "marketing",
    icon: Globe,
    title: "Website & Marketing",
    description: "Customize your public site, blog, SEO, and email campaigns",
    articles: [
      {
        q: "How do I customize my public website?",
        a: "Go to **Website Settings** and choose a template, set your headline, subheadline, and tagline, upload your hero image, and configure which sections are visible (About, Blog, Store, Booking, Contact).",
      },
      {
        q: "How do I create a blog post?",
        a: "Go to **Blog** and click **New Post**. Use the rich text editor to write your content. You can add a cover image, category, SEO metadata, and schedule the post for future publishing.",
      },
      {
        q: "How do I set up SEO for my site?",
        a: "Go to **SEO** and configure the title, meta description, keywords, and Open Graph image for each page. You can also enable/disable indexing per page and set canonical URLs.",
      },
      {
        q: "How do I connect a custom domain?",
        a: "Go to **Settings → My Profile → Custom Domain**. Enter your domain, then add the required A records and TXT verification record at your domain registrar. DNS propagation can take up to 48 hours. See the **Custom Domain Docs** page for step-by-step instructions.",
      },
      {
        q: "How do email campaigns work?",
        a: "Go to **Emails** and create a new campaign. Write your HTML email, set your sender name and address, choose the audience, and schedule or send immediately. Automated emails are triggered by events like new bookings.",
      },
    ],
  },
  {
    id: "ai",
    icon: Bot,
    title: "AI & Automation",
    description: "AI agents, workflows, and recurring tasks",
    articles: [
      {
        q: "What are AI Agents?",
        a: "AI Agents are configurable chatbots that can handle customer support on your behalf. Each agent has a name, system prompt, knowledge base, and model settings. Agents can run in **auto-reply** or **supervised** mode.",
      },
      {
        q: "What is supervised mode for AI agents?",
        a: "In **supervised mode**, the AI generates a draft reply that you review before it is sent to the client. In **auto-reply mode**, the AI sends the response directly. Switch between modes in the Chat Commander Bar at the top of the Chat page.",
      },
      {
        q: "How do I add knowledge to an agent?",
        a: "Open **AI Agents**, edit an agent, and go to the **Knowledge Base** tab. Add topics with a title and content. This knowledge is injected into the agent's context so it can answer questions specific to your business.",
      },
      {
        q: "What are Recurring Workflows?",
        a: "Recurring Workflows are tasks that repeat on a schedule (daily, weekly, monthly, etc.). Go to **Workflows → Recurring** and create a task with a frequency, start date, and optional owner. The system generates task instances automatically.",
      },
    ],
  },
  {
    id: "settings",
    icon: Settings,
    title: "Settings & Account",
    description: "Billing, permissions, and account management",
    articles: [
      {
        q: "How do I manage my subscription?",
        a: "Go to **Settings → Billing**. You can view your current plan, see past invoices, and manage or upgrade your subscription.",
      },
      {
        q: "How do Access Control permissions work?",
        a: "Owners can invite Studio Users and grant them specific permissions (Sessions, Galleries, Bookings, etc.). Users only see the sections they have been granted access to. This is useful for assistants or second shooters.",
      },
      {
        q: "How do I change my business currency?",
        a: "Go to **Settings → My Profile** and update the **Business Currency** field. This affects how prices are displayed and charged throughout the platform.",
      },
    ],
  },
  {
    id: "lightroom",
    icon: Camera,
    title: "Lightroom Plugin",
    description: "Upload photos directly from Lightroom Classic",
    articles: [
      {
        q: "How do I install the Lightroom plugin?",
        a: "Go to **Settings → Personalize → Galleries** tab and download the DavionsConnect plugin. In Lightroom Classic, go to **File → Plug-in Manager**, click **Add**, and select the downloaded `.lrplugin` folder.",
      },
      {
        q: "How do I upload photos from Lightroom?",
        a: "Select the photos you want to export in Lightroom, then go to **File → Export → Export with Preset → Davions** or use the Publish service. Choose the target gallery and click Export/Publish.",
      },
      {
        q: "The plugin isn't connecting. What do I do?",
        a: "Make sure you are logged in to the platform and that your API key is correctly entered in the plugin settings. You can regenerate your API key in **Settings → Personalize → Galleries**. Check the **LR Plugin Help** page for detailed troubleshooting steps.",
      },
    ],
  },
];

const QUICK_START: Array<{ catId: string; articleIndex: number }> = [
  { catId: "getting-started", articleIndex: 2 }, // Connect Stripe
  { catId: "sessions", articleIndex: 0 },         // Create a session
  { catId: "galleries", articleIndex: 1 },        // Upload photos
  { catId: "ai", articleIndex: 0 },               // AI Agents
];

// Renders a string with **bold** and `code` markdown
function RichText({ text, highlight }: { text: string; highlight?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          const inner = part.slice(2, -2);
          return <strong key={i} className="font-medium text-foreground">{inner}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          const inner = part.slice(1, -1);
          return (
            <code key={i} className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">
              {inner}
            </code>
          );
        }
        if (highlight && part.toLowerCase().includes(highlight.toLowerCase())) {
          const idx = part.toLowerCase().indexOf(highlight.toLowerCase());
          return (
            <span key={i}>
              {part.slice(0, idx)}
              <mark className="bg-yellow-100 dark:bg-yellow-900/40 text-foreground rounded-[2px] px-0.5">
                {part.slice(idx, idx + highlight.length)}
              </mark>
              {part.slice(idx + highlight.length)}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function ArticleRow({ article, highlight }: { article: Article; highlight?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border-b border-border last:border-0 transition-colors ${open ? "bg-muted/20" : ""}`}>
      <button
        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left group hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-normal leading-snug text-foreground">
          <RichText text={article.q} highlight={highlight} />
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 mt-0.5 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            <RichText text={article.a} highlight={highlight} />
          </p>
        </div>
      )}
    </div>
  );
}

const totalArticles = categories.reduce((s, c) => s + c.articles.length, 0);

const HelpCenter = () => {
  const { signOut, user } = useAuth();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [bugReportOpen, setBugReportOpen] = useState(false);

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        articles: cat.articles.filter(
          (a) => a.q.toLowerCase().includes(q) || a.a.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.articles.length > 0);
  }, [query]);

  const displayedCategories = useMemo(() => {
    if (query.trim()) return filteredCategories;
    if (activeCategory) return filteredCategories.filter((c) => c.id === activeCategory);
    return filteredCategories;
  }, [query, activeCategory, filteredCategories]);

  const totalResults = filteredCategories.reduce((s, c) => s + c.articles.length, 0);

  const quickStartArticles = useMemo(() =>
    QUICK_START.flatMap(({ catId, articleIndex }) => {
      const cat = categories.find((c) => c.id === catId);
      if (!cat || !cat.articles[articleIndex]) return [];
      return [{ cat, article: cat.articles[articleIndex] }];
    }),
    []
  );

  const handleCategoryClick = useCallback((id: string) => {
    setActiveCategory((prev) => (prev === id ? null : id));
    setQuery("");
  }, []);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-h-0">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto">

            {/* ── Hero ─────────────────────────────────────────── */}
            <div className="border-b border-border bg-muted/20">
              <div className="max-w-5xl mx-auto px-6 py-10 space-y-5">
                <div className="flex items-center gap-2 text-[10px] tracking-[0.35em] uppercase text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Knowledge Base</span>
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-light tracking-tight">How can we help?</h1>
                  <p className="text-sm text-muted-foreground">
                    {totalArticles} articles across {categories.length} categories
                  </p>
                </div>
                <div className="relative max-w-xl">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search articles…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActiveCategory(null);
                    }}
                    className="pl-10 h-11 text-sm bg-background"
                  />
                </div>
              </div>
            </div>

            {/* ── Body: sidebar + content ───────────────────────── */}
            <div className="max-w-5xl mx-auto px-6 py-8 flex gap-8">

              {/* Category sidebar */}
              <aside className="hidden md:flex flex-col w-52 shrink-0 gap-1">
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-2 px-2">
                  Categories
                </p>
                <button
                  onClick={() => { setActiveCategory(null); setQuery(""); }}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-sm text-sm transition-colors text-left ${
                    !activeCategory && !query
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-light text-[13px]">All</span>
                  </span>
                  <span className="text-[10px] opacity-60 tabular-nums">{totalArticles}</span>
                </button>
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-sm text-sm transition-colors text-left border-l-2 ${
                        isActive
                          ? "bg-muted border-foreground text-foreground"
                          : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-border"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-light text-[13px] truncate">{cat.title}</span>
                      </span>
                      <span className="text-[10px] opacity-50 tabular-nums shrink-0">{cat.articles.length}</span>
                    </button>
                  );
                })}
              </aside>

              {/* Main content */}
              <div className="flex-1 min-w-0 space-y-10">

                {/* Mobile category tabs */}
                <div className="md:hidden flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  <button
                    onClick={() => { setActiveCategory(null); setQuery(""); }}
                    className={`flex-shrink-0 px-3 py-1.5 text-[11px] tracking-wider uppercase font-light border transition-colors rounded-none ${
                      !activeCategory && !query
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`flex-shrink-0 px-3 py-1.5 text-[11px] tracking-wider uppercase font-light border transition-colors rounded-none ${
                        activeCategory === cat.id
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                      }`}
                    >
                      {cat.title}
                    </button>
                  ))}
                </div>

                {/* Search results label */}
                {query && (
                  <p className="text-[11px] text-muted-foreground tracking-wide -mb-4">
                    {totalResults} result{totalResults !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
                  </p>
                )}

                {/* Quick Start — only when "All" and no search */}
                {!query && !activeCategory && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                      <h2 className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground font-light">
                        Quick Start
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {quickStartArticles.map(({ cat, article }, i) => {
                        const Icon = cat.icon;
                        return (
                          <button
                            key={i}
                            onClick={() => setActiveCategory(cat.id)}
                            className="group flex items-start gap-3 p-4 border border-border hover:border-foreground/30 hover:bg-muted/30 transition-all text-left"
                          >
                            <div className="mt-0.5 p-1.5 bg-muted rounded-sm shrink-0">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-muted-foreground mb-0.5">{cat.title}</p>
                              <p className="text-[13px] font-light text-foreground leading-snug">{article.q}</p>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-1 transition-colors" />
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* No results */}
                {displayedCategories.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <p className="text-sm font-light text-muted-foreground">
                      No articles found for &ldquo;{query}&rdquo;
                    </p>
                    <p className="text-[12px] text-muted-foreground/60">
                      Try a different search term or browse by category.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {displayedCategories.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <section key={cat.id}>
                          {/* Category header */}
                          <div className="flex items-start gap-3 mb-0 pb-3 border-b border-border">
                            <div className="p-1.5 bg-muted rounded-sm shrink-0 mt-0.5">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h2 className="text-[11px] tracking-[0.4em] uppercase text-foreground font-light">
                                {cat.title}
                              </h2>
                              {!query && (
                                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                                  {cat.description}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-[10px] font-light shrink-0 mt-0.5">
                              {cat.articles.length} article{cat.articles.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          {/* Articles */}
                          <div className="border border-border border-t-0">
                            {cat.articles.map((article, i) => (
                              <ArticleRow key={i} article={article} highlight={query || undefined} />
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}

                {/* Footer CTA */}
                <div className="border border-border p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-light">Still need help?</p>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">
                        Can't find what you're looking for? Report a bug or reach out and we'll get back to you.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setBugReportOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 text-[12px] border border-border hover:border-foreground/50 hover:bg-muted/30 transition-colors"
                    >
                      <Bug className="h-3.5 w-3.5" />
                      Report a Bug
                    </button>
                    <a
                      href="mailto:support@davions.app"
                      className="flex items-center gap-2 px-4 py-2 text-[12px] border border-border hover:border-foreground/50 hover:bg-muted/30 transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email Support
                    </a>
                  </div>
                </div>

              </div>
            </div>
          </main>
        </div>
      </div>
      <BugReportDialog open={bugReportOpen} onOpenChange={setBugReportOpen} />
    </SidebarProvider>
  );
};

export default HelpCenter;
