import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LinkItem {
  image?: string;
  label: string;
  sublabel?: string;
  href: string;
}

const safeHref = (href?: string) => href || "#";
const isExternal = (href?: string) => !!href && /^https?:\/\//i.test(href);

function ItemLink({ href, children, className }: { href?: string; children: React.ReactNode; className?: string }) {
  const ext = isExternal(href);
  return (
    <a
      href={safeHref(href)}
      {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn("group block", className)}
    >
      {children}
    </a>
  );
}

function PlaceholderImage({ className, label }: { className?: string; label?: string }) {
  return (
    <div
      className={cn(
        "w-full h-full bg-muted flex items-center justify-center text-[10px] uppercase tracking-widest text-muted-foreground/60",
        className
      )}
    >
      {label || "Image"}
    </div>
  );
}

function ImageBox({ src, alt, className, label }: { src?: string; alt?: string; className?: string; label?: string }) {
  if (src) {
    return <img src={src} alt={alt || ""} className={cn("w-full h-full object-cover", className)} loading="lazy" />;
  }
  return <PlaceholderImage className={className} label={label} />;
}

// ── Image Links ────────────────────────────────────────────────────────────

export function ImageLinksBlock({
  variant = "overlay-bottom-left",
  links = [],
}: {
  variant?: string;
  links?: LinkItem[];
}) {
  if (!links.length) return null;

  if (variant === "overlay-center" || variant === "overlay-bottom-left") {
    const isCenter = variant === "overlay-center";
    return (
      <section className="py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {links.map((l, i) => (
            <ItemLink key={i} href={l.href} className="relative block overflow-hidden">
              <div className="relative w-full aspect-[16/7]">
                <ImageBox src={l.image} alt={l.label} />
                <div
                  className={cn(
                    "absolute inset-0 flex flex-col text-white",
                    isCenter ? "items-center justify-center text-center" : "items-start justify-end p-8 sm:p-12"
                  )}
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.05))" }}
                >
                  <h3 className="text-2xl sm:text-3xl font-light tracking-wide">{l.label}</h3>
                  {l.sublabel && (
                    <p className="mt-1 text-[11px] tracking-[0.25em] uppercase opacity-90">{l.sublabel}</p>
                  )}
                  <ArrowRight className="mt-3 h-4 w-4 opacity-80 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </ItemLink>
          ))}
        </div>
      </section>
    );
  }

  if (variant === "side-by-side") {
    return (
      <section className="py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {links.map((l, i) => (
            <ItemLink key={i} href={l.href} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="aspect-[4/3] overflow-hidden">
                <ImageBox src={l.image} alt={l.label} className="transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="md:px-6">
                <h3 className="text-2xl font-light tracking-wide text-foreground">{l.label}</h3>
                {l.sublabel && (
                  <p className="mt-2 text-[11px] tracking-[0.25em] uppercase text-muted-foreground">{l.sublabel}</p>
                )}
                <ArrowRight className="mt-4 h-4 w-4 text-foreground/70 transition-transform group-hover:translate-x-1" />
              </div>
            </ItemLink>
          ))}
        </div>
      </section>
    );
  }

  if (variant === "row-3") {
    return (
      <section className="py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {links.map((l, i) => (
            <ItemLink key={i} href={l.href}>
              <div className="aspect-[4/5] overflow-hidden">
                <ImageBox src={l.image} alt={l.label} className="transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="mt-3 text-center">
                <h4 className="text-sm font-medium tracking-wide text-foreground">{l.label}</h4>
                {l.sublabel && (
                  <p className="mt-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{l.sublabel}</p>
                )}
              </div>
            </ItemLink>
          ))}
        </div>
      </section>
    );
  }

  // grid-3-portrait (default fallback)
  return (
    <section className="py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
        {links.map((l, i) => (
          <ItemLink key={i} href={l.href} className="relative">
            <div className="relative aspect-[3/4] overflow-hidden">
              <ImageBox src={l.image} alt={l.label} className="transition-transform duration-500 group-hover:scale-105" />
              <div
                className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-4"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.05))" }}
              >
                <h4 className="text-lg font-light tracking-wide">{l.label}</h4>
                {l.sublabel && (
                  <p className="mt-1 text-[10px] tracking-[0.25em] uppercase opacity-90">{l.sublabel}</p>
                )}
              </div>
            </div>
          </ItemLink>
        ))}
      </div>
    </section>
  );
}

// ── Text Links ─────────────────────────────────────────────────────────────

export function TextLinksBlock({
  variant = "centered-3",
  title,
  links = [],
}: {
  variant?: string;
  title?: string;
  links?: LinkItem[];
}) {
  if (!links.length && !title) return null;

  if (variant === "boxed-3") {
    return (
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto border-y border-border py-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {links.map((l, i) => (
            <ItemLink key={i} href={l.href}>
              <h4 className="text-sm tracking-[0.3em] uppercase text-foreground">{l.label}</h4>
              {l.sublabel && (
                <p className="mt-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{l.sublabel}</p>
              )}
              <ArrowRight className="mx-auto mt-3 h-3.5 w-3.5 text-foreground/60 transition-transform group-hover:translate-x-1" />
            </ItemLink>
          ))}
        </div>
      </section>
    );
  }

  if (variant === "underlined-3") {
    return (
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {links.map((l, i) => (
            <ItemLink key={i} href={l.href}>
              <h4 className="text-sm tracking-[0.3em] uppercase text-foreground inline-block border-b border-foreground/40 pb-1 group-hover:border-foreground transition-colors">
                {l.label}
              </h4>
              {l.sublabel && (
                <p className="mt-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{l.sublabel}</p>
              )}
            </ItemLink>
          ))}
        </div>
      </section>
    );
  }

  if (variant === "featured-in") {
    return (
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground mb-6">
            {title || "As Featured In"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {links.map((l, i) => (
              <ItemLink key={i} href={l.href}>
                <span className="text-sm text-foreground/80 hover:text-foreground transition-colors">{l.label}</span>
              </ItemLink>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "vendors-2col") {
    return (
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-12 gap-y-6">
          <h3 className="text-2xl font-light tracking-wide text-foreground">{title || "The Vendors"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {links.map((l, i) => (
              <ItemLink key={i} href={l.href}>
                <span className="text-sm text-foreground/80 hover:text-foreground transition-colors">{l.label}</span>
              </ItemLink>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "sponsors-stack") {
    return (
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-md mx-auto text-center space-y-2">
          <p className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground mb-4">
            {title || "Sponsored By"}
          </p>
          {links.map((l, i) => (
            <div key={i}>
              <ItemLink href={l.href}>
                <span className="text-sm text-foreground/80 hover:text-foreground transition-colors">{l.label}</span>
              </ItemLink>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // centered-3 default
  return (
    <section className="py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        {links.map((l, i) => (
          <ItemLink key={i} href={l.href}>
            <h4 className="text-sm tracking-[0.3em] uppercase text-foreground">{l.label}</h4>
            {l.sublabel && (
              <p className="mt-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{l.sublabel}</p>
            )}
            <ArrowRight className="mx-auto mt-3 h-3.5 w-3.5 text-foreground/60 transition-transform group-hover:translate-x-1" />
          </ItemLink>
        ))}
      </div>
    </section>
  );
}

// ── Image Grid Links ───────────────────────────────────────────────────────

export function ImageGridLinksBlock({
  variant = "feature-plus-2",
  links = [],
}: {
  variant?: string;
  links?: LinkItem[];
}) {
  if (!links.length) return null;

  const renderCard = (l: LinkItem, opts?: { aspect?: string; overlay?: boolean }) => {
    const aspect = opts?.aspect || "aspect-[4/3]";
    const overlay = opts?.overlay !== false;
    return (
      <ItemLink href={l.href} className="relative block overflow-hidden">
        <div className={cn("relative w-full overflow-hidden", aspect)}>
          <ImageBox src={l.image} alt={l.label} className="transition-transform duration-500 group-hover:scale-105" />
          {overlay && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-4"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.4), rgba(0,0,0,0.05))" }}
            >
              <h4 className="text-lg sm:text-xl font-light tracking-wide">{l.label}</h4>
              {l.sublabel && (
                <p className="mt-1 text-[10px] tracking-[0.25em] uppercase opacity-90">{l.sublabel}</p>
              )}
            </div>
          )}
        </div>
      </ItemLink>
    );
  };

  if (variant === "feature-plus-2") {
    const [first, ...rest] = links;
    return (
      <section className="py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3">
          {first && renderCard(first, { aspect: "aspect-[4/5] md:aspect-auto md:h-full" })}
          <div className="grid grid-rows-2 gap-3">
            {rest.slice(0, 2).map((l, i) => (
              <div key={i}>{renderCard(l, { aspect: "aspect-[16/9]" })}</div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "2-up") {
    return (
      <section className="py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {links.slice(0, 2).map((l, i) => (
            <div key={i}>{renderCard(l, { aspect: "aspect-[4/3]" })}</div>
          ))}
        </div>
      </section>
    );
  }

  if (variant === "1-feature") {
    const l = links[0];
    return (
      <section className="py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {renderCard(l, { aspect: "aspect-[16/7]" })}
        </div>
      </section>
    );
  }

  // 3-up default
  return (
    <section className="py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
        {links.slice(0, 3).map((l, i) => (
          <div key={i}>{renderCard(l, { aspect: "aspect-[3/4]", overlay: false })}</div>
        ))}
      </div>
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-center">
        {links.slice(0, 3).map((l, i) => (
          <div key={i}>
            <ItemLink href={l.href}>
              <h4 className="text-xs tracking-[0.3em] uppercase text-foreground">{l.label}</h4>
              {l.sublabel && (
                <p className="mt-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{l.sublabel}</p>
              )}
            </ItemLink>
          </div>
        ))}
      </div>
    </section>
  );
}
