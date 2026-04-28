import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type NavMenuStyle =
  | "logo-left"
  | "logo-left-hamburger"
  | "logo-center-links-below"
  | "centered-split"
  | "links-left-logo-left"
  | "logo-center-only";

interface MenuStyleOption {
  id: NavMenuStyle;
  label: string;
  // Renders a tiny diagram of the style inside a card
  preview: React.ReactNode;
}

const dot = <span className="block h-1.5 w-1.5 rounded-full bg-foreground/70" />;
const line = <span className="block h-px w-2 bg-foreground/40" />;
const lineLong = <span className="block h-px w-3 bg-foreground/40" />;

const STYLES: MenuStyleOption[] = [
  {
    id: "logo-left",
    label: "Logo left, links right",
    preview: (
      <div className="flex items-center justify-between w-full">
        {dot}
        <div className="flex items-center gap-1">{line}{line}{line}{line}</div>
      </div>
    ),
  },
  {
    id: "logo-left-hamburger",
    label: "Logo left, hamburger right",
    preview: (
      <div className="flex items-center justify-between w-full">
        {dot}
        <div className="flex flex-col gap-0.5">
          <span className="block h-px w-3 bg-foreground/60" />
          <span className="block h-px w-3 bg-foreground/60" />
        </div>
      </div>
    ),
  },
  {
    id: "logo-center-links-below",
    label: "Logo top, links below",
    preview: (
      <div className="flex flex-col items-center gap-1.5 w-full">
        {dot}
        <div className="flex items-center gap-1">{line}{line}{line}{line}</div>
      </div>
    ),
  },
  {
    id: "centered-split",
    label: "Links split around logo",
    preview: (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1">{line}{line}</div>
        {dot}
        <div className="flex items-center gap-1">{line}{line}</div>
      </div>
    ),
  },
  {
    id: "links-left-logo-left",
    label: "Logo + links inline left",
    preview: (
      <div className="flex items-center gap-2 w-full">
        {dot}
        <div className="flex items-center gap-1">{line}{line}{line}{line}</div>
      </div>
    ),
  },
  {
    id: "logo-center-only",
    label: "Logo centered, no links",
    preview: (
      <div className="flex items-center justify-center w-full">
        <div className="flex flex-col items-center gap-0.5">
          {dot}
          {lineLong}
        </div>
      </div>
    ),
  },
];

export default function NavigationSubPanel({
  menuStyle,
  stickyHeader,
  onMenuStyleChange,
  onStickyHeaderChange,
}: {
  menuStyle: NavMenuStyle;
  stickyHeader: boolean;
  onMenuStyleChange: (s: NavMenuStyle) => void;
  onStickyHeaderChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-6 p-4">
      {/* Menu Style */}
      <section className="space-y-2.5">
        <h4 className="text-xs font-semibold text-foreground">Menu Style</h4>
        <div className="grid grid-cols-2 gap-2.5">
          {STYLES.map((opt) => {
            const active = opt.id === menuStyle;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onMenuStyleChange(opt.id)}
                title={opt.label}
                className={cn(
                  "h-14 rounded-md border bg-background px-3 flex items-center transition-all",
                  active
                    ? "border-primary ring-1 ring-primary"
                    : "border-border hover:border-foreground/30"
                )}
              >
                {opt.preview}
              </button>
            );
          })}
        </div>
      </section>

      {/* Sticky header */}
      <section className="space-y-2">
        <h4 className="text-xs font-semibold text-foreground">Sticky header</h4>
        <div className="flex items-center gap-2">
          <Switch
            checked={stickyHeader}
            onCheckedChange={onStickyHeaderChange}
          />
          <span className="text-xs text-muted-foreground">
            {stickyHeader ? "On" : "Off"}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
          Sticky header is only visible in preview or the public site after publishing.
        </p>
      </section>
    </div>
  );
}
