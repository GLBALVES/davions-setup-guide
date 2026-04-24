import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { formatBlogDate, htmlExcerpt, type BlogDefaults } from "@/lib/blog-defaults";
import type { Lang } from "@/lib/i18n/translations";

export interface BlogListItem {
  id: string;
  slug: string | null;
  title: string;
  content: string;
  keyword: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  reading_time_minutes: number | null;
  meta_description?: string | null;
}

interface BlogListProps {
  posts: BlogListItem[];
  baseHref: string; // e.g. "/blog" or "/store/{slug}/blog"
  lang: Lang;
  t: BlogDefaults;
}

export default function BlogList({ posts, baseHref, lang, t }: BlogListProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-sm font-light text-muted-foreground">{t.empty}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {posts.map((post) => {
        const href = `${baseHref}/${post.slug ?? post.id}`;
        const excerpt = post.meta_description?.trim() || htmlExcerpt(post.content, 140);
        return (
          <Link
            key={post.id}
            to={href}
            className="group flex flex-col bg-card border border-border/40 hover:border-border transition-colors duration-300 overflow-hidden"
          >
            <div className="aspect-[4/3] bg-muted overflow-hidden relative">
              {post.cover_image_url ? (
                <img
                  src={post.cover_image_url}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/40">
                  <span className="text-5xl font-extralight text-muted-foreground/40">
                    {(post.title?.[0] ?? "·").toUpperCase()}
                  </span>
                </div>
              )}
              {post.keyword && (
                <span className="absolute top-3 left-3 text-[9px] tracking-[0.2em] uppercase font-light bg-background/90 backdrop-blur px-2.5 py-1 rounded-sm">
                  {post.keyword}
                </span>
              )}
            </div>
            <div className="p-5 flex flex-col flex-1">
              <h3 className="text-base font-light tracking-wide line-clamp-2 mb-2 group-hover:opacity-70 transition-opacity">
                {post.title}
              </h3>
              {excerpt && (
                <p className="text-xs font-light text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                  {excerpt}
                </p>
              )}
              <div className="mt-auto pt-3 flex items-center justify-between text-[10px] tracking-wider uppercase text-muted-foreground border-t border-border/40">
                <span>{formatBlogDate(post.published_at, lang)}</span>
                {post.reading_time_minutes ? (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.reading_time_minutes} {t.minRead}
                  </span>
                ) : null}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
