import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, ArrowLeft, Share2, Facebook, Linkedin, Copy, Check } from "lucide-react";
import { formatBlogDate, type BlogDefaults } from "@/lib/blog-defaults";
import type { Lang } from "@/lib/i18n/translations";
import BlogList, { type BlogListItem } from "./BlogList";
import { toast } from "@/components/ui/sonner";

export interface BlogPost extends BlogListItem {
  middle_image_url?: string | null;
  middle_image_alt?: string | null;
  cover_image_alt?: string | null;
  cta_text?: string | null;
  secondary_keywords?: string[] | null;
}

interface BlogPostViewProps {
  post: BlogPost;
  related: BlogListItem[];
  baseHref: string; // for related links + back link
  authorName: string;
  lang: Lang;
  t: BlogDefaults;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2H21l-6.51 7.44L22 22h-6.84l-4.49-6.05L5.4 22H2.64l6.97-7.96L2 2h6.96l4.06 5.5L18.24 2zm-1.2 18h1.81L7.04 4H5.13l11.91 16z" />
    </svg>
  );
}

export default function BlogPostView({
  post,
  related,
  baseHref,
  authorName,
  lang,
  t,
}: BlogPostViewProps) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = encodeURIComponent(post.title);
  const shareUrl = encodeURIComponent(url);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t.shareCopied);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // ignore
    }
  };

  const handleShareNative = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: post.title, url });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <article className="bg-background">
      {/* Hero / cover */}
      {post.cover_image_url ? (
        <div className="w-full aspect-[21/9] bg-muted overflow-hidden">
          <img
            src={post.cover_image_url}
            alt={post.cover_image_alt || post.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}

      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <Link
          to={baseHref}
          className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-3 w-3" />
          {t.pageTitle}
        </Link>

        {post.keyword && (
          <span className="inline-block text-[10px] tracking-[0.25em] uppercase font-light text-muted-foreground border border-border px-2.5 py-1 mb-4">
            {post.keyword}
          </span>
        )}

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extralight tracking-tight leading-tight mb-5">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] tracking-wider uppercase text-muted-foreground mb-12 pb-8 border-b border-border/60">
          <span>{authorName}</span>
          {post.published_at && <span aria-hidden>·</span>}
          {post.published_at && <span>{formatBlogDate(post.published_at, lang)}</span>}
          {post.reading_time_minutes ? (
            <>
              <span aria-hidden>·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {post.reading_time_minutes} {t.minRead}
              </span>
            </>
          ) : null}
        </div>

        {/* Content (HTML from AI generator) */}
        <div
          className="prose prose-neutral dark:prose-invert max-w-none font-light text-[15px] leading-[1.85] [&>p]:mb-5 [&>h2]:text-2xl [&>h2]:font-light [&>h2]:mt-12 [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-light [&>h3]:mt-10 [&>h3]:mb-3 [&>img]:my-8 [&>blockquote]:border-l-2 [&>blockquote]:border-foreground/40 [&>blockquote]:pl-5 [&>blockquote]:italic [&>blockquote]:text-muted-foreground [&>ul]:my-5 [&>ol]:my-5 [&_a]:underline [&_a]:underline-offset-4"
          dangerouslySetInnerHTML={{ __html: post.content || "" }}
        />

        {/* Optional middle image (only render if not already inside content) */}
        {post.middle_image_url && !post.content?.includes(post.middle_image_url) && (
          <figure className="my-12">
            <img
              src={post.middle_image_url}
              alt={post.middle_image_alt || ""}
              className="w-full h-auto"
            />
          </figure>
        )}

        {/* CTA */}
        {post.cta_text?.trim() && (
          <div className="mt-12 pt-10 border-t border-border/60 text-center">
            <p className="text-base sm:text-lg font-light tracking-wide italic text-foreground/90 max-w-2xl mx-auto">
              {post.cta_text}
            </p>
          </div>
        )}

        {/* Share */}
        <div className="mt-12 pt-8 border-t border-border/60 flex flex-wrap items-center gap-3">
          <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mr-2 flex items-center gap-2">
            <Share2 className="h-3 w-3" />
            {t.share}
          </span>
          <a
            href={`https://wa.me/?text=${shareTitle}%20${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 border border-border hover:bg-muted transition-colors"
            aria-label="WhatsApp"
          >
            <WhatsAppIcon className="h-3.5 w-3.5" />
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 border border-border hover:bg-muted transition-colors"
            aria-label="Facebook"
          >
            <Facebook className="h-3.5 w-3.5" />
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 border border-border hover:bg-muted transition-colors"
            aria-label="X"
          >
            <XIcon className="h-3.5 w-3.5" />
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 border border-border hover:bg-muted transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 border border-border hover:bg-muted transition-colors"
            aria-label="Copy link"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleShareNative}
            className="md:hidden p-2 border border-border hover:bg-muted transition-colors"
            aria-label="Share"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-border/60 bg-muted/30">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
            <h2 className="text-xl sm:text-2xl font-extralight tracking-[0.08em] uppercase text-center mb-10">
              {t.relatedPosts}
            </h2>
            <BlogList posts={related} baseHref={baseHref} lang={lang} t={t} />
          </div>
        </section>
      )}
    </article>
  );
}
