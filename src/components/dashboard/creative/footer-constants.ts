import {
  Instagram, Facebook, Linkedin, Twitter, Youtube, Globe,
  Heart, Share2, Send, ArrowRight, ArrowLeft, ArrowUp,
  Phone, Mail, MapPin, Star, MessageCircle, ExternalLink,
  Plus, Bookmark, ThumbsUp,
} from "lucide-react";

export const FOOTER_ICONS = [
  { name: "Instagram", icon: Instagram, lucideName: "Instagram" },
  { name: "Facebook", icon: Facebook, lucideName: "Facebook" },
  { name: "LinkedIn", icon: Linkedin, lucideName: "Linkedin" },
  { name: "Twitter", icon: Twitter, lucideName: "Twitter" },
  { name: "YouTube", icon: Youtube, lucideName: "Youtube" },
  { name: "Website", icon: Globe, lucideName: "Globe" },
  { name: "Heart", icon: Heart, lucideName: "Heart" },
  { name: "Share", icon: Share2, lucideName: "Share2" },
  { name: "Send", icon: Send, lucideName: "Send" },
  { name: "ArrowRight", icon: ArrowRight, lucideName: "ArrowRight" },
  { name: "ArrowLeft", icon: ArrowLeft, lucideName: "ArrowLeft" },
  { name: "ArrowUp", icon: ArrowUp, lucideName: "ArrowUp" },
  { name: "Phone", icon: Phone, lucideName: "Phone" },
  { name: "Mail", icon: Mail, lucideName: "Mail" },
  { name: "MapPin", icon: MapPin, lucideName: "MapPin" },
  { name: "Star", icon: Star, lucideName: "Star" },
  { name: "Message", icon: MessageCircle, lucideName: "MessageCircle" },
  { name: "Link", icon: ExternalLink, lucideName: "ExternalLink" },
  { name: "Plus", icon: Plus, lucideName: "Plus" },
  { name: "Bookmark", icon: Bookmark, lucideName: "Bookmark" },
  { name: "Like", icon: ThumbsUp, lucideName: "ThumbsUp" },
] as const;

export interface FooterIconInstance {
  id: string;
  name: string;
  x: number;
  y: number;
  size: number;
  color: string;
  bgColor: string;
  bgRadius: number;
}

export interface FooterConfig {
  icons: FooterIconInstance[];
  footerText: string;
  textX: number;
  textY: number;
  bgColor: string;
  bgOpacity: number;
  textColor: string;
  textSize: number;
  footerHeight: number;
  selectedIcons?: string[];
  iconSpacing?: number;
  iconBgColor?: string;
  iconBgRadius?: number;
}

export const FOOTER_PRESETS = [
  { label: "Follow us", text: "Follow us on social media" },
  { label: "Share", text: "Share with your friends" },
  { label: "Learn more", text: "Learn more on our website" },
  { label: "Book now", text: "Book your session today" },
];

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  icons: [],
  footerText: "Follow us on social media",
  textX: -1,
  textY: 15,
  bgColor: "#000000",
  bgOpacity: 80,
  textColor: "#ffffff",
  textSize: 22,
  footerHeight: 120,
};

export function migrateFooterConfig(cfg: any): FooterConfig {
  if (cfg.icons && Array.isArray(cfg.icons) && cfg.icons.length > 0 && cfg.icons[0]?.id) {
    return cfg as FooterConfig;
  }

  const selectedIcons: string[] = cfg.selectedIcons || [];
  const iconSpacing = cfg.iconSpacing || 50;
  const footerHeight = cfg.footerHeight || 120;
  const iconCount = selectedIcons.length;
  const startX = 540 / 2 - ((iconCount * iconSpacing) / 2);

  const icons: FooterIconInstance[] = selectedIcons.map((name, i) => ({
    id: crypto.randomUUID(),
    name,
    x: startX + i * iconSpacing,
    y: footerHeight / 2 + 10,
    size: 28,
    color: cfg.textColor || "#ffffff",
    bgColor: cfg.iconBgColor || "transparent",
    bgRadius: cfg.iconBgRadius ?? 999,
  }));

  return {
    icons,
    footerText: cfg.footerText || "",
    textX: cfg.textX ?? -1,
    textY: cfg.textY ?? 15,
    bgColor: cfg.bgColor || "#000000",
    bgOpacity: cfg.bgOpacity ?? 80,
    textColor: cfg.textColor || "#ffffff",
    textSize: cfg.textSize || 22,
    footerHeight,
  };
}
