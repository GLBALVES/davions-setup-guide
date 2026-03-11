export type CreativeFormat =
  | "post_1080"
  | "portrait_1080"
  | "story_1080"
  | "landscape_1200"
  | "landscape_1350"
  | "landscape_1920"
  | "twitter_1600"
  | "pinterest_1000"
  | "carrossel";

export type BackgroundType = "ia" | "solid" | "gradient";

export interface GeneratedTexts {
  titulo: string;
  subtitulo: string;
  cta: string;
  hashtags: string[];
  slides?: { titulo: string; subtitulo: string }[];
}

export interface GeneratedTheme {
  id: string;
  titulo: string;
  descricao: string;
}

export interface CanvasElement {
  id: string;
  type: "text" | "icon" | "image" | "container";
  content: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily?: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  iconName?: string;
  iconColor?: string;
  iconBgColor?: string;
  iconBgShape?: "square" | "circle" | "rounded";
  iconSize?: number;
  imageUrl?: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  bgColor?: string;
  opacity?: number;
  zIndex?: number;
  borderColor?: string;
  borderWidth?: number;
  textBgColor?: string;
  textBgRadius?: number;
  iconBgRadius?: number;
  locked?: boolean;
}

export interface Slide {
  background_url: string;
  background_color?: string;
  background_gradient?: string;
  background_position?: string;
  elements: CanvasElement[];
}

export const DIMS: Record<CreativeFormat, { w: number; h: number }> = {
  post_1080: { w: 1080, h: 1080 },
  portrait_1080: { w: 1080, h: 1350 },
  story_1080: { w: 1080, h: 1920 },
  landscape_1200: { w: 1200, h: 628 },
  landscape_1350: { w: 1350, h: 1080 },
  landscape_1920: { w: 1920, h: 1080 },
  twitter_1600: { w: 1600, h: 900 },
  pinterest_1000: { w: 1000, h: 1500 },
  carrossel: { w: 1080, h: 1350 },
};

export const FONT_LIST = [
  "Inter", "Roboto", "Open Sans", "Montserrat", "Lato", "Poppins",
  "Raleway", "Oswald", "Playfair Display", "Merriweather", "Nunito",
  "Ubuntu", "PT Sans", "Source Sans 3", "Rubik", "Work Sans",
  "DM Sans", "Manrope", "Outfit", "Space Grotesk", "Bebas Neue",
  "Anton", "Archivo", "Barlow", "Cabin", "Quicksand", "Mulish",
  "Fira Sans", "IBM Plex Sans", "Josefin Sans",
];

export const PLATFORM_DIMS: Record<string, { w: number; h: number; label: string }> = {
  instagram: { w: 1080, h: 1080, label: "Instagram Feed" },
  instagram_story: { w: 1080, h: 1920, label: "Instagram Story" },
  facebook: { w: 1200, h: 630, label: "Facebook" },
  linkedin: { w: 1200, h: 627, label: "LinkedIn" },
  twitter: { w: 1600, h: 900, label: "Twitter / X" },
  tiktok: { w: 1080, h: 1920, label: "TikTok" },
};

export const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter / X" },
  { value: "tiktok", label: "TikTok" },
];
