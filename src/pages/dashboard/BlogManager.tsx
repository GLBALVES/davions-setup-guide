import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { fetchBlogPosts, deleteBlogPost, togglePublishPost, fetchBlogThemes, deleteBlogTheme, updateBlogThemeStatus, upsertBlogTheme } from "@/lib/blog-api";
import { FileText, Plus, Search, Eye, EyeOff, Trash2, Edit, Star, Lightbulb, Wand2 } from "lucide-react";
import { format } from "date-fns";

export default function BlogManager() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const b = t.blog;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [themeFilter, setThemeFilter] = useState<"pending" | "used" | "discarded">("pending");
  const [editingTheme, setEditingTheme] = useState<any>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts-admin"],
    queryFn: () => fetchBlogPosts(false),
  });

  const { data: themes = [], isLoading: themesLoading } = useQuery({
    queryKey: ["blog-themes-all"],
    queryFn: () => fetchBlogThemes(),
  });

  const deleteMut = useMutation({
    mutationFn: deleteBlogPost,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["blog-posts-admin"] }); toast({ title: b.postDeleted }); },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, pub }: { id: string; pub: boolean }) => togglePublishPost(id, pub),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["blog-posts-admin"] }); toast({ title: b.statusUpdated }); },
  });

  const deleteThemeMut = useMutation({
    mutationFn: deleteBlogTheme,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["blog-themes-all"] }); toast({ title: b.themeDeleted }); },
  });

  const upsertThemeMut = useMutation({
    mutationFn: upsertBlogTheme,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["blog-themes-all"] }); setEditingTheme(null); toast({ title: b.themeUpdated }); },
  });

  const discardThemeMut = useMutation({
    mutationFn: (id: string) => updateBlogThemeStatus(id, "discarded"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["blog-themes-all"] }); toast({ title: b.themeDiscarded }); },
  });

  const filtered = posts.filter((p: any) => {
    const matchSearch = p.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || (statusFilter === "published" ? p.published : !p.published);
    return matchSearch && matchStatus;
  });

  const totalPublished = posts.filter((p: any) => p.published).length;
  const totalDraft = posts.filter((p: any) => !p.published).length;
  const pendingThemes = themes.filter((t: any) => t.status === "pending");
  const usedThemes = themes.filter((t: any) => t.status === "used");
  const discardedThemes = themes.filter((t: any) => t.status === "discarded");
  const filteredThemes = themes.filter((t: any) => t.status === themeFilter);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-7 w-7" />
                  <div>
                    <h1 className="text-2xl font-light tracking-wide">{b.title}</h1>
                    <p className="text-sm text-muted-foreground font-light">{b.subtitle}</p>
                  </div>
                </div>
                <Button onClick={() => navigate("/dashboard/blog/new")}>
                  <Plus className="mr-2 h-4 w-4" /> {b.newPost}
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-light">{b.total}</CardTitle></CardHeader><CardContent><p className="text-2xl font-light">{posts.length}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-light">{b.published}</CardTitle></CardHeader><CardContent><p className="text-2xl font-light">{totalPublished}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-light">{b.drafts}</CardTitle></CardHeader><CardContent><p className="text-2xl font-light">{totalDraft}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-light flex items-center gap-1"><Lightbulb className="h-3 w-3" /> {b.pendingThemes}</CardTitle></CardHeader><CardContent><p className="text-2xl font-light">{pendingThemes.length}</p></CardContent></Card>
              </div>

              <Tabs defaultValue="posts">
                <TabsList>
                  <TabsTrigger value="posts"><FileText className="h-4 w-4 mr-1" /> {b.postsTab}</TabsTrigger>
                  <TabsTrigger value="themes"><Lightbulb className="h-4 w-4 mr-1" /> {b.themesTab} ({pendingThemes.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="posts" className="space-y-4 mt-4">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder={b.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{b.all}</SelectItem>
                        <SelectItem value="published">{b.published}</SelectItem>
                        <SelectItem value="draft">{b.drafts}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{b.titleLabel}</TableHead>
                          <TableHead>{b.category}</TableHead>
                          <TableHead>{b.status}</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">{b.actions}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-8">{b.loading}</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{b.noPostsFound}</TableCell></TableRow>
                        ) : (
                          filtered.map((p: any) => (
                            <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/dashboard/blog/${p.id}`)}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {p.featured && <Star className="h-4 w-4 text-foreground fill-foreground" />}
                                  <span className="font-light">{p.title}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-light">{p.category || "—"}</TableCell>
                              <TableCell>
                                <Badge variant={p.published ? "default" : "secondary"}>{p.published ? b.published : b.draft}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(p.created_at), "MMM dd, yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button size="icon" variant="ghost" onClick={() => toggleMut.mutate({ id: p.id, pub: !p.published })}>
                                    {p.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => navigate(`/dashboard/blog/${p.id}`)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm(b.deletePost)) deleteMut.mutate(p.id); }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>

                <TabsContent value="themes" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground font-light">{b.aiThemesDesc}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant={themeFilter === "pending" ? "default" : "outline"} onClick={() => setThemeFilter("pending")}>{b.createPostBtn} ({pendingThemes.length})</Button>
                    <Button size="sm" variant={themeFilter === "used" ? "default" : "outline"} onClick={() => setThemeFilter("used")}>{b.used} ({usedThemes.length})</Button>
                    <Button size="sm" variant={themeFilter === "discarded" ? "default" : "outline"} onClick={() => setThemeFilter("discarded")}>{b.discarded} ({discardedThemes.length})</Button>
                  </div>
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{b.theme}</TableHead>
                          <TableHead>{b.description}</TableHead>
                          <TableHead>{b.category}</TableHead>
                          <TableHead>{b.status}</TableHead>
                          <TableHead className="text-right">{b.actions}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {themesLoading ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-8">{b.loading}</TableCell></TableRow>
                        ) : filteredThemes.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{b.noThemesInCategory}</TableCell></TableRow>
                        ) : (
                          filteredThemes.map((t: any) => (
                            <TableRow key={t.id}>
                              <TableCell className="font-light max-w-[200px] truncate">{t.theme}</TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">{t.description}</TableCell>
                              <TableCell><Badge variant="outline">{t.category || "—"}</Badge></TableCell>
                              <TableCell><Badge variant={t.status === "pending" ? "default" : "secondary"}>{t.status}</Badge></TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => setEditingTheme({ ...t })}><Edit className="h-4 w-4" /></Button>
                                  {t.status === "pending" && (
                                    <>
                                      <Button size="sm" variant="ghost" onClick={() => navigate("/dashboard/blog/new")}><Wand2 className="h-4 w-4 mr-1" /> {b.createPostBtn}</Button>
                                      <Button size="icon" variant="ghost" onClick={() => discardThemeMut.mutate(t.id)}><EyeOff className="h-4 w-4" /></Button>
                                    </>
                                  )}
                                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm(b.deleteTheme)) deleteThemeMut.mutate(t.id); }}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <Dialog open={!!editingTheme} onOpenChange={(open) => { if (!open) setEditingTheme(null); }}>
              <DialogContent>
                <DialogHeader><DialogTitle>{b.editTheme}</DialogTitle></DialogHeader>
                {editingTheme && (
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>{b.theme}</Label><Input value={editingTheme.theme} onChange={(e) => setEditingTheme({ ...editingTheme, theme: e.target.value })} /></div>
                    <div className="space-y-2"><Label>{b.description}</Label><Textarea value={editingTheme.description || ""} onChange={(e) => setEditingTheme({ ...editingTheme, description: e.target.value })} rows={3} /></div>
                    <div className="space-y-2"><Label>{b.category}</Label><Input value={editingTheme.category || ""} onChange={(e) => setEditingTheme({ ...editingTheme, category: e.target.value })} /></div>
                    <div className="space-y-2">
                      <Label>{b.status}</Label>
                      <Select value={editingTheme.status} onValueChange={(v) => setEditingTheme({ ...editingTheme, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{b.pending}</SelectItem>
                          <SelectItem value="used">{b.used}</SelectItem>
                          <SelectItem value="discarded">{b.discarded}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditingTheme(null)}>{b.cancel}</Button>
                      <Button onClick={() => upsertThemeMut.mutate({ id: editingTheme.id, theme: editingTheme.theme, description: editingTheme.description, category: editingTheme.category, status: editingTheme.status })} disabled={upsertThemeMut.isPending}>
                        {upsertThemeMut.isPending ? b.saving : b.save}
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
