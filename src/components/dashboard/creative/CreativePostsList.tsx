import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Copy, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface PostItem {
  id: string;
  name: string;
  platform: string;
  post_type: string;
  status: string;
  caption: string | null;
  hashtags: string[] | null;
  created_at: string;
  media_urls: any;
}

interface Props {
  onEdit: (post: PostItem) => void;
  onDownload?: (post: PostItem) => void;
}

export default function CreativePostsList({ onEdit, onDownload }: Props) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchPosts = async () => {
    setLoading(true);
    let q = (supabase as any).from("mkt_social_posts").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data } = await q;
    setPosts((data as PostItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, [filter, search]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this creative?")) return;
    await (supabase as any).from("mkt_social_posts").delete().eq("id", id);
    toast({ title: "Deleted" });
    fetchPosts();
  };

  const handleDuplicate = async (post: PostItem) => {
    if (!user) return;
    await (supabase as any).from("mkt_social_posts").insert({
      name: `${post.name} (copy)`,
      platform: post.platform,
      post_type: post.post_type,
      caption: post.caption,
      hashtags: post.hashtags,
      media_urls: post.media_urls,
      status: "draft",
      photographer_id: user.id,
    });
    toast({ title: "Duplicated!" });
    fetchPosts();
  };

  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-blue-100 text-blue-700",
    published: "bg-green-100 text-green-700",
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs flex-1" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : posts.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No creatives found.</p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {posts.map((post) => (
            <Card key={post.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{post.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className="text-[10px]">{post.platform}</Badge>
                  <Badge className={`text-[10px] ${statusColor[post.status] || ""}`}>{post.status}</Badge>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(post)}><Pencil className="h-3 w-3" /></Button>
                {onDownload && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDownload(post)}><Download className="h-3 w-3" /></Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDuplicate(post)}><Copy className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(post.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
