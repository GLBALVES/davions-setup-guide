import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchBlogPostBySlug, fetchBlogPosts } from "@/lib/blog-api";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Calendar, User, ChevronRight, Share2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";

function injectMiddleImages(html: string, img1?: string | null, img2?: string | null, alt?: string) {
  if (!img1 && !img2) return html;
  const h2Regex = /<\/h2>/gi;
  let count = 0;
  return html.replace(h2Regex, (match) => {
    count++;
    if (count === 1 && img1) return `${match}<img src="${img1}" alt="${alt || ''}" style="width:100%;border-radius:0;margin:24px 0" />`;
    if (count === 2 && img2) return `${match}<img src="${img2}" alt="${alt || ''}" style="width:100%;border-radius:0;margin:24px 0" />`;
    return match;
  });
}

export default function BlogPost() {
  const { slug } = useParams();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["blog-post-public", slug],
    queryFn: () => fetchBlogPostBySlug(slug!),
    enabled: !!slug,
  });

  const { data: relatedPosts = [] } = useQuery({
    queryKey: ["blog-related", slug],
    queryFn: async () => {
      const all = await fetchBlogPosts(true);
      return all.filter((p: any) => p.slug !== slug).slice(0, 3);
    },
    enabled: !!slug,
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground font-light">Loading...</div>;
  if (error || !post) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="font-light">Article not found. <Link to="/blog" className="underline">Back to blog</Link></p>
    </div>
  );

  const p = post as any;
  const articleUrl = `${window.location.origin}/blog/${p.slug}`;
  const ogImage = p.og_image_url || p.cover_image_url;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.meta_description || p.summary || "",
    image: ogImage || undefined,
    datePublished: p.published_at || p.created_at,
    dateModified: p.updated_at,
    author: { "@type": "Person", name: p.author || "Davions" },
    publisher: { "@type": "Organization", name: "Davions", url: window.location.origin },
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    wordCount: p.content?.trim().split(/\s+/).length || 0,
    keywords: (p.tags || []).join(", "),
  };

  const shareUrl = encodeURIComponent(articleUrl);
  const shareTitle = encodeURIComponent(p.title);

  return (
    <>
      <SEOHead
        title={`${p.title} — Davions`}
        description={p.meta_description || p.summary}
        ogTitle={p.title}
        ogDescription={p.meta_description || p.summary}
        ogImage={ogImage}
        ogUrl={articleUrl}
        canonical={p.canonical_url || articleUrl}
        type="article"
        publishedTime={p.published_at || p.created_at}
        modifiedTime={p.updated_at}
        author={p.author}
        jsonLd={jsonLd}
      />

      <div className="min-h-screen bg-background text-foreground">
        <Navbar />

        <main className="container mx-auto px-6 py-8 max-w-4xl pt-28">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-6 tracking-widest uppercase" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            {p.category && (<><ChevronRight className="h-3 w-3" /><span>{p.category}</span></>)}
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground truncate max-w-[200px]">{p.title}</span>
          </nav>

          <article>
            <div className="flex flex-wrap items-center gap-3 mb-4 text-xs tracking-widest uppercase text-muted-foreground">
              {p.category && <span className="border border-foreground px-2 py-0.5 text-foreground text-[10px]">{p.category}</span>}
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(p.published_at || p.created_at), "MMMM dd, yyyy")}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.reading_time_min || 1} min read</span>
              <span className="flex items-center gap-1"><User className="h-3 w-3" />{p.author || "Davions"}</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-light tracking-tight mb-4 leading-[1.1]">{p.title}</h1>
            {p.summary && <p className="text-lg text-muted-foreground font-light mb-6 leading-relaxed">{p.summary}</p>}

            <Separator className="mb-8" />

            <div className="prose prose-lg max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: injectMiddleImages(p.content || "", p.mid_image_1, p.mid_image_2, p.title) }} />

            {p.footer && (
              <div className="mt-8 border border-border p-6 prose prose-lg max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: p.footer }} />
            )}

            {p.cover_image_url && (
              <img src={p.cover_image_url} alt={p.title} className="w-full h-64 md:h-96 object-cover mt-8" />
            )}

            {/* Tags */}
            {p.tags?.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {p.tags.map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
              </div>
            )}

            {/* Share */}
            <div className="mt-8 flex items-center gap-3 text-xs tracking-widest uppercase">
              <Share2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Share:</span>
              <a href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">Twitter</a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">Facebook</a>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">LinkedIn</a>
              <a href={`https://api.whatsapp.com/send?text=${shareTitle}%20${shareUrl}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">WhatsApp</a>
            </div>
          </article>

          {/* Related */}
          {relatedPosts.length > 0 && (
            <div className="mt-16">
              <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-6 flex items-center gap-3">
                <span className="inline-block w-8 h-px bg-border" />
                Related Articles
                <span className="inline-block w-8 h-px bg-border" />
              </p>
              <div className="grid gap-px bg-border md:grid-cols-3">
                {relatedPosts.map((rp: any) => (
                  <Link key={rp.id} to={`/blog/${rp.slug}`} className="group bg-background">
                    <div className="h-full">
                      {rp.cover_image_url && <img src={rp.cover_image_url} alt={rp.title} className="w-full h-40 object-cover" loading="lazy" />}
                      <div className="p-5">
                        <h3 className="text-sm font-light tracking-widest uppercase group-hover:text-foreground transition-colors">{rp.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-light">{rp.summary}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-12">
            <Button variant="outline" asChild><Link to="/blog"><ArrowLeft className="mr-2 h-4 w-4" /> Back to blog</Link></Button>
          </div>
        </main>

        <footer className="border-t border-border mt-16 py-8 text-center">
          <p className="text-[10px] tracking-widest uppercase text-muted-foreground">© {new Date().getFullYear()} Davions. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}
