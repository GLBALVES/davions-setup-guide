import { useState, useEffect, useMemo } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPageSeoSettings,
  upsertPageSeo,
  togglePageIndex,
  ensureDefaultPages,
  fetchPageviews,
  type PageSeoSetting,
  type AnalyticsPageview,
} from "@/lib/seo-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart3, Eye, FileText, Globe, Sparkles, TrendingUp, Search } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

/* ═══════════════════════════════════════════════════════
   Analytics Tab
   ═══════════════════════════════════════════════════════ */
function AnalyticsTab({ photographerId }: { photographerId: string }) {
  const [days, setDays] = useState(30);

  const { data: pageviews = [], isLoading } = useQuery({
    queryKey: ["analytics-pageviews", photographerId, days],
    queryFn: () => fetchPageviews(photographerId, days),
  });

  const stats = useMemo(() => {
    const totalVisits = pageviews.length;
    const uniquePaths = new Set(pageviews.map((p) => p.page_path)).size;
    const blogVisits = pageviews.filter((p) => p.page_path.startsWith("/blog")).length;
    const actions = pageviews.reduce<Record<string, number>>((acc, p) => {
      acc[p.action] = (acc[p.action] || 0) + 1;
      return acc;
    }, {});
    return { totalVisits, uniquePaths, blogVisits, actions };
  }, [pageviews]);

  // Daily chart data
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    pageviews.forEach((p) => {
      const day = format(parseISO(p.created_at), "yyyy-MM-dd");
      map.set(day, (map.get(day) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: format(parseISO(date), "MMM dd"), visits: count }));
  }, [pageviews]);

  // Top pages
  const topPages = useMemo(() => {
    const map = new Map<string, number>();
    pageviews.forEach((p) => {
      map.set(p.page_path, (map.get(p.page_path) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));
  }, [pageviews]);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Period:</span>
        {[7, 14, 30, 90].map((d) => (
          <Button key={d} variant={days === d ? "default" : "outline"} size="sm" onClick={() => setDays(d)}>
            {d}d
          </Button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" /> Total Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalVisits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> Pages Visited
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.uniquePaths}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Blog Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.blogVisits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Action Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.actions).map(([action, count]) => (
                <Badge key={action} variant="secondary" className="text-xs">
                  {action}: {count}
                </Badge>
              ))}
              {Object.keys(stats.actions).length === 0 && (
                <span className="text-sm text-muted-foreground">No data yet</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily visits chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Visits</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="visits"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.15)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">
              {isLoading ? "Loading..." : "No visit data for this period."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top pages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Pages</CardTitle>
        </CardHeader>
        <CardContent>
          {topPages.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, topPages.length * 36)}>
              <BarChart data={topPages} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  dataKey="path"
                  type="category"
                  width={180}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">No data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SEO Manager Tab
   ═══════════════════════════════════════════════════════ */
function SeoManagerTab({ photographerId }: { photographerId: string }) {
  const queryClient = useQueryClient();
  const [editPage, setEditPage] = useState<PageSeoSetting | null>(null);
  const [form, setForm] = useState<Partial<PageSeoSetting>>({});
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  // Ensure default pages exist
  useEffect(() => {
    ensureDefaultPages(photographerId);
  }, [photographerId]);

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["page-seo-settings", photographerId],
    queryFn: () => fetchPageSeoSettings(photographerId),
  });

  const saveMutation = useMutation({
    mutationFn: () => upsertPageSeo(photographerId, form.page_path!, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-seo-settings"] });
      setEditPage(null);
      toast.success("SEO settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, noindex }: { id: string; noindex: boolean }) => togglePageIndex(id, noindex),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["page-seo-settings"] }),
  });

  const openEdit = (page: PageSeoSetting) => {
    setForm({ ...page });
    setEditPage(page);
  };

  const handleAI = async (action: "seo_suggest_meta" | "seo_suggest_keywords") => {
    setAiLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("ai-blog-seo", {
        body: {
          action,
          title: form.page_name || form.page_path,
          content: form.meta_description || form.page_name || "",
        },
      });
      if (error) throw error;
      const result = data?.result || "";

      if (action === "seo_suggest_meta") {
        setForm((prev) => ({ ...prev, meta_description: result.replace(/^"|"$/g, "") }));
        toast.success("Meta description generated");
      } else {
        try {
          const cleaned = result.replace(/```json\n?/g, "").replace(/```/g, "").trim();
          const tags = JSON.parse(cleaned);
          if (Array.isArray(tags)) {
            setForm((prev) => ({ ...prev, meta_keywords: tags }));
            toast.success("Keywords generated");
          }
        } catch {
          toast.error("Could not parse AI keywords");
        }
      }
    } catch (e: any) {
      toast.error(e.message || "AI request failed");
    } finally {
      setAiLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading pages…</p>
      ) : pages.length === 0 ? (
        <p className="text-muted-foreground text-sm">No pages configured yet. Reload to create defaults.</p>
      ) : (
        pages.map((page) => (
          <Card key={page.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-2">
              {/* SERP Preview */}
              <div className="border rounded-lg p-3 bg-muted/30 space-y-1">
                <p className="text-xs text-muted-foreground truncate">
                  yoursite.com{page.page_path}
                </p>
                <p className="text-primary text-base font-medium truncate">
                  {page.title || page.page_name}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {page.meta_description || "No meta description set."}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {page.noindex && <Badge variant="destructive" className="text-xs">noindex</Badge>}
                  {page.nofollow && <Badge variant="outline" className="text-xs">nofollow</Badge>}
                  {page.meta_keywords?.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {page.meta_keywords.length} keywords
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Index</span>
                    <Switch
                      checked={!page.noindex}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: page.id, noindex: !checked })
                      }
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEdit(page)}>
                    Edit SEO
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editPage} onOpenChange={(o) => !o && setEditPage(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit SEO — {editPage?.page_name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Page Title</Label>
              <Input
                value={form.title || ""}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Page title for search results"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Meta Description</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!!aiLoading}
                  onClick={() => handleAI("seo_suggest_meta")}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {aiLoading === "seo_suggest_meta" ? "Generating…" : "AI Suggest"}
                </Button>
              </div>
              <Textarea
                value={form.meta_description || ""}
                onChange={(e) => setForm((p) => ({ ...p, meta_description: e.target.value }))}
                placeholder="Brief description for search engines (140-160 chars)"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(form.meta_description || "").length}/160 characters
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Keywords</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!!aiLoading}
                  onClick={() => handleAI("seo_suggest_keywords")}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {aiLoading === "seo_suggest_keywords" ? "Generating…" : "AI Suggest"}
                </Button>
              </div>
              <Input
                value={(form.meta_keywords || []).join(", ")}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    meta_keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean),
                  }))
                }
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>OG Title</Label>
                <Input
                  value={form.og_title || ""}
                  onChange={(e) => setForm((p) => ({ ...p, og_title: e.target.value }))}
                />
              </div>
              <div>
                <Label>OG Image URL</Label>
                <Input
                  value={form.og_image || ""}
                  onChange={(e) => setForm((p) => ({ ...p, og_image: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>OG Description</Label>
              <Textarea
                value={form.og_description || ""}
                onChange={(e) => setForm((p) => ({ ...p, og_description: e.target.value }))}
                rows={2}
              />
            </div>

            <div>
              <Label>Canonical URL</Label>
              <Input
                value={form.canonical_url || ""}
                onChange={(e) => setForm((p) => ({ ...p, canonical_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select
                  value={String(form.priority ?? 0.5)}
                  onValueChange={(v) => setForm((p) => ({ ...p, priority: parseFloat(v) }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((v) => (
                      <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Change Frequency</Label>
                <Select
                  value={form.changefreq || "weekly"}
                  onValueChange={(v) => setForm((p) => ({ ...p, changefreq: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"].map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.noindex || false}
                  onCheckedChange={(c) => setForm((p) => ({ ...p, noindex: c }))}
                />
                <Label>noindex</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.nofollow || false}
                  onCheckedChange={(c) => setForm((p) => ({ ...p, nofollow: c }))}
                />
                <Label>nofollow</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPage(null)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════ */
export default function SiteSeo() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-6 max-w-6xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">Site & SEO</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Monitor traffic analytics and manage SEO settings for your pages.
              </p>
            </div>

            <Tabs defaultValue="analytics">
              <TabsList className="mb-4">
                <TabsTrigger value="analytics" className="gap-1.5">
                  <TrendingUp className="h-4 w-4" /> Analytics
                </TabsTrigger>
                <TabsTrigger value="seo" className="gap-1.5">
                  <Search className="h-4 w-4" /> SEO Manager
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analytics">
                <AnalyticsTab photographerId={user.id} />
              </TabsContent>

              <TabsContent value="seo">
                <SeoManagerTab photographerId={user.id} />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
