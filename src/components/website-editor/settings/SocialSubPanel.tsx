import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Instagram, Facebook, Youtube, Linkedin } from "lucide-react";

const SOCIALS: Array<{ key: string; label: string; placeholder: string; Icon: any }> = [
  { key: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/...", Icon: Instagram },
  { key: "facebook_url", label: "Facebook", placeholder: "https://facebook.com/...", Icon: Facebook },
  { key: "youtube_url", label: "YouTube", placeholder: "https://youtube.com/@...", Icon: Youtube },
  { key: "tiktok_url", label: "TikTok", placeholder: "https://tiktok.com/@...", Icon: () => <span className="text-xs font-bold">TT</span> },
  { key: "pinterest_url", label: "Pinterest", placeholder: "https://pinterest.com/...", Icon: () => <span className="text-xs font-bold">P</span> },
  { key: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/in/...", Icon: Linkedin },
  { key: "whatsapp", label: "WhatsApp", placeholder: "+1234567890", Icon: () => <span className="text-xs font-bold">W</span> },
];

export default function SocialSubPanel({
  site,
  onSiteChange,
}: {
  site: Record<string, any> | null;
  onSiteChange: (patch: Record<string, any>) => void;
}) {
  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full">
      <p className="text-[11px] text-muted-foreground mb-3">
        Social links shown in the header and footer of your public site.
      </p>

      {SOCIALS.map(({ key, label, placeholder, Icon }) => (
        <div key={key} className="space-y-1">
          <Label className="text-xs flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Label>
          <Input
            value={site?.[key] || ""}
            onChange={(e) => onSiteChange({ [key]: e.target.value || null })}
            placeholder={placeholder}
            className="h-8 text-xs"
          />
        </div>
      ))}
    </div>
  );
}
