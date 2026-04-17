import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

export default function BlogSubPanel({
  site,
  onSiteChange,
}: {
  site: Record<string, any> | null;
  onSiteChange: (patch: Record<string, any>) => void;
}) {
  const navigate = useNavigate();
  const enabled = site?.show_blog ?? false;

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-3 p-3 border border-border rounded-md">
        <div className="min-w-0">
          <Label className="text-xs font-medium">Show blog on site</Label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Adds a /blog section to your public website.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => onSiteChange({ show_blog: v })}
        />
      </div>

      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between text-xs"
          onClick={() => navigate("/dashboard/blog")}
        >
          Manage blog posts
          <ExternalLink className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between text-xs"
          onClick={() => navigate("/dashboard/blog/config")}
        >
          Blog settings & themes
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground/70 pt-2">
        Full blog management (posts, AI generation, SEO) lives in the Blog module.
      </p>
    </div>
  );
}
