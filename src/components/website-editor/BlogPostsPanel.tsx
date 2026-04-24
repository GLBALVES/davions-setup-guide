import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Plus, Settings, MoreHorizontal, Eye, ExternalLink, FileText, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { formatBlogDate } from "@/lib/blog-defaults";
import { cn } from "@/lib/utils";

const STR = {
  en: {
    title: "Blog Posts",
    newPost: "New post",
    settings: "Blog settings",
    search: "Search posts…",
    all: "All",
    published: "Published",
    drafts: "Drafts",
    loading: "Loading posts…",
    emptyTitle: "No posts yet",
    emptyDesc: "Create your first article to start growing your audience.",
    emptyCta: "Create with AI",
    edit: "Edit post",
    publish: "Publish",
    unpublish: "Unpublish",
    duplicate: "Duplicate",
    viewLive: "View on site",
    delete: "Delete",
    confirmTitle: "Delete this post?",
    confirmDesc: "This action cannot be undone. The post will be permanently removed.",
    cancel: "Cancel",
    deleteBtn: "Delete",
    previewBlog: "Preview blog",
    manageAll: "Manage all",
    draftBadge: "DRAFT",
    publishedBadge: "PUBLISHED",
    toastPublished: "Post published",
    toastUnpublished: "Post moved to drafts",
    toastDuplicated: "Post duplicated",
    toastDeleted: "Post deleted",
    toastError: "Something went wrong",
    copySuffix: "(copy)",
  },
  pt: {
    title: "Posts do Blog",
    newPost: "Novo post",
    settings: "Configurações do blog",
    search: "Buscar posts…",
    all: "Todos",
    published: "Publicados",
    drafts: "Rascunhos",
    loading: "Carregando posts…",
    emptyTitle: "Nenhum post ainda",
    emptyDesc: "Crie seu primeiro artigo para começar a crescer sua audiência.",
    emptyCta: "Criar com IA",
    edit: "Editar post",
    publish: "Publicar",
    unpublish: "Despublicar",
    duplicate: "Duplicar",
    viewLive: "Ver no site",
    delete: "Excluir",
    confirmTitle: "Excluir este post?",
    confirmDesc: "Esta ação não pode ser desfeita. O post será removido permanentemente.",
    cancel: "Cancelar",
    deleteBtn: "Excluir",
    previewBlog: "Ver blog",
    manageAll: "Gerenciar tudo",
    draftBadge: "RASCUNHO",
    publishedBadge: "PUBLICADO",
    toastPublished: "Post publicado",
    toastUnpublished: "Post movido para rascunhos",
    toastDuplicated: "Post duplicado",
    toastDeleted: "Post excluído",
    toastError: "Algo deu errado",
    copySuffix: "(cópia)",
  },
  es: {
    title: "Entradas del Blog",
    newPost: "Nueva entrada",
    settings: "Configuración del blog",
    search: "Buscar entradas…",
    all: "Todas",
    published: "Publicadas",
    drafts: "Borradores",
    loading: "Cargando entradas…",
    emptyTitle: "Aún no hay entradas",
    emptyDesc: "Crea tu primer artículo para empezar a crecer tu audiencia.",
    emptyCta: "Crear con IA",
    edit: "Editar entrada",
    publish: "Publicar",
    unpublish: "Despublicar",
    duplicate: "Duplicar",
    viewLive: "Ver en el sitio",
    delete: "Eliminar",
    confirmTitle: "¿Eliminar esta entrada?",
    confirmDesc: "Esta acción no se puede deshacer. La entrada se eliminará permanentemente.",
    cancel: "Cancelar",
    deleteBtn: "Eliminar",
    previewBlog: "Ver blog",
    manageAll: "Gestionar todo",
    draftBadge: "BORRADOR",
    publishedBadge: "PUBLICADA",
    toastPublished: "Entrada publicada",
    toastUnpublished: "Entrada movida a borradores",
    toastDuplicated: "Entrada duplicada",
    toastDeleted: "Entrada eliminada",
    toastError: "Algo salió mal",
    copySuffix: "(copia)",
  },
};

type BlogRow = {
  id: string;
  title: string;
  slug: string | null;
  status: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  updated_at: string | null;
  keyword: string | null;
  content: string | null;
  cover_image_alt: string | null;
  middle_image_url: string | null;
  middle_image_alt: string | null;
  reading_time_minutes: number | null;
  cta_text: string | null;
  secondary_keywords: string[] | null;
};

type TabKey = "all" | "published" | "drafts";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

interface Props {
  storeSlug?: string | null;
}

export default function BlogPostsPanel({ storeSlug }: Props) {
  const { photographerId } = useAuth();
  const { lang } = useLanguage();
  const t = STR[lang as keyof typeof STR] ?? STR.en;

  const [posts, setPosts] = useState<BlogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!photographerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("blogs")
      .select(
        "id, title, slug, status, cover_image_url, published_at, updated_at, keyword, content, cover_image_alt, middle_image_url, middle_image_alt, reading_time_minutes, cta_text, secondary_keywords",
      )
      .eq("photographer_id", photographerId)
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ title: t.toastError, description: error.message, variant: "destructive" });
      setPosts([]);
    } else {
      setPosts((data as BlogRow[]) ?? []);
    }
    setLoading(false);
  }, [photographerId, t.toastError]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    let list = posts;
    if (tab === "published") list = list.filter((p) => p.status === "published");
    else if (tab === "drafts") list = list.filter((p) => p.status !== "published");
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.title?.toLowerCase().includes(q));
    return list;
  }, [posts, tab, query]);

  const counts = useMemo(
    () => ({
      all: posts.length,
      published: posts.filter((p) => p.status === "published").length,
      drafts: posts.filter((p) => p.status !== "published").length,
    }),
    [posts],
  );

  const openInNewTab = (path: string) => window.open(path, "_blank", "noopener,noreferrer");

  const openEditor = (id: string) => {
    sessionStorage.setItem("current_blog_id", id);
    openInNewTab("/dashboard/blog/gerador");
  };

  const openSettingsTab = () => {
    // Switch the editor's outer Settings tab via custom event
    window.dispatchEvent(new CustomEvent("editor:open-settings", { detail: { panel: "blog" } }));
  };

  const handlePublishToggle = async (post: BlogRow) => {
    const isPublishing = post.status !== "published";
    const patch: Record<string, any> = {
      status: isPublishing ? "published" : "draft",
    };
    if (isPublishing && !post.published_at) patch.published_at = new Date().toISOString();
    const { error } = await supabase.from("blogs").update(patch).eq("id", post.id);
    if (error) {
      toast({ title: t.toastError, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: isPublishing ? t.toastPublished : t.toastUnpublished });
    reload();
  };

  const handleDuplicate = async (post: BlogRow) => {
    if (!photographerId) return;
    const newTitle = `${post.title} ${t.copySuffix}`;
    const newSlug = `${slugify(post.title)}-${Date.now().toString(36)}`;
    const { error } = await supabase.from("blogs").insert({
      photographer_id: photographerId,
      title: newTitle,
      slug: newSlug,
      status: "draft",
      content: post.content,
      keyword: post.keyword,
      cover_image_url: post.cover_image_url,
      cover_image_alt: post.cover_image_alt,
      middle_image_url: post.middle_image_url,
      middle_image_alt: post.middle_image_alt,
      reading_time_minutes: post.reading_time_minutes,
      cta_text: post.cta_text,
      secondary_keywords: post.secondary_keywords,
    });
    if (error) {
      toast({ title: t.toastError, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t.toastDuplicated });
    reload();
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    const { error } = await supabase.from("blogs").delete().eq("id", confirmId);
    setConfirmId(null);
    if (error) {
      toast({ title: t.toastError, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t.toastDeleted });
    reload();
  };

  const viewLive = (post: BlogRow) => {
    if (post.status !== "published") return;
    const slugPart = post.slug || post.id;
    const path = storeSlug ? `/store/${storeSlug}/blog/${slugPart}` : `/blog/${slugPart}`;
    openInNewTab(path);
  };

  const previewBlog = () => {
    const path = storeSlug ? `/store/${storeSlug}/blog` : `/blog`;
    openInNewTab(path);
  };

  return (
    <div className="flex flex-col h-full normal-case tracking-normal">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">{t.title}</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowSearch((s) => !s)}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
              title={t.search}
            >
              <Search className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={openSettingsTab}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
              title={t.settings}
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => openInNewTab("/dashboard/blog/temas")}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md bg-foreground text-background hover:opacity-90"
              title={t.newPost}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {showSearch && (
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            className="h-8 text-xs"
          />
        )}

        {/* Tabs */}
        <div className="flex items-center gap-4 -mb-1">
          {(["all", "published", "drafts"] as TabKey[]).map((k) => {
            const label = k === "all" ? t.all : k === "published" ? t.published : t.drafts;
            const isActive = tab === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={cn(
                  "relative pb-2 text-xs font-medium transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                <span className="ml-1 text-[10px] opacity-60">({counts[k]})</span>
                {isActive && (
                  <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-foreground rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-14 w-14 rounded-md bg-muted shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 w-4/5 bg-muted rounded" />
                  <div className="h-2.5 w-1/3 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">{t.emptyTitle}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.emptyDesc}</p>
            <Button
              size="sm"
              className="mt-4 text-xs normal-case tracking-normal h-9 px-4"
              onClick={() => openInNewTab("/dashboard/blog/temas")}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {t.emptyCta}
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((post) => {
              const isPublished = post.status === "published";
              return (
                <li
                  key={post.id}
                  className="group flex gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => openEditor(post.id)}
                >
                  {/* Thumb */}
                  <div className="h-14 w-14 rounded-md overflow-hidden bg-muted shrink-0 relative">
                    {post.cover_image_url ? (
                      <img
                        src={post.cover_image_url}
                        alt={post.cover_image_alt || post.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20 text-xs font-medium text-muted-foreground">
                        {(post.title || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
                      {post.title || "Untitled"}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      {isPublished ? (
                        <span className="text-[10px] text-muted-foreground">
                          {formatBlogDate(post.published_at || post.updated_at, lang as any)}
                        </span>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="h-4 px-1.5 text-[9px] font-semibold tracking-wider rounded-sm"
                        >
                          {t.draftBadge}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-background opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 normal-case tracking-normal">
                        <DropdownMenuItem onClick={() => openEditor(post.id)} className="text-xs">
                          {t.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePublishToggle(post)} className="text-xs">
                          {isPublished ? t.unpublish : t.publish}
                        </DropdownMenuItem>
                        {isPublished && (
                          <DropdownMenuItem onClick={() => viewLive(post)} className="text-xs">
                            <Eye className="h-3.5 w-3.5 mr-2" />
                            {t.viewLive}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDuplicate(post)} className="text-xs">
                          {t.duplicate}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setConfirmId(post.id)}
                          className="text-xs text-destructive focus:text-destructive"
                        >
                          {t.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-3 grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs normal-case tracking-normal h-9"
          onClick={previewBlog}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          {t.previewBlog}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs normal-case tracking-normal h-9"
          onClick={() => openInNewTab("/dashboard/blog")}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          {t.manageAll}
        </Button>
      </div>

      {/* Confirm delete */}
      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.deleteBtn}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
