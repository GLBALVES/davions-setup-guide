import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchBlogPosts, fetchBlogCategories } from "@/lib/blog-api";
import SEOHead from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";

export default function Blog() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-public"],
    queryFn: () => fetchBlogPosts(true),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["blog-categories-public"],
    queryFn: fetchBlogCategories,
  });

  const filtered = posts.filter((p: any) => {
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.summary?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || p.category === catFilter;
    return matchSearch && matchCat;
  });

  const featuredPost = posts.find((p: any) => p.featured);

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Davions Blog",
    description: "Tips, guides, and insights for professional photographers using Davions.",
    url: `${window.location.origin}/blog`,
    publisher: { "@type": "Organization", name: "Davions", url: window.location.origin },
    blogPost: filtered.slice(0, 10).map((p: any) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.meta_description || p.summary,
      url: `${window.location.origin}/blog/${p.slug}`,
      datePublished: p.published_at || p.created_at,
      author: { "@type": "Person", name: p.author || "Davions" },
    })),
  };

  return (
    <>
      <SEOHead
        title="Blog — Davions"
        description="Tips, guides, and insights for professional photographers."
        ogUrl={`${window.location.origin}/blog`}
        ogTitle="Davions Blog"
        ogDescription="Tips, guides, and insights for professional photographers."
        type="website"
        jsonLd={blogJsonLd}
      />

      <div className="min-h-screen bg-background text-foreground">
        <Navbar />

        <main className="container mx-auto px-6 py-8 max-w-6xl pt-28">
          <div className="text-center mb-10">
            <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-4 flex items-center justify-center gap-3">
              <span className="inline-block w-8 h-px bg-border" />
              Blog
              <span className="inline-block w-8 h-px bg-border" />
            </p>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-3">
              Stories & Insights
            </h1>
            <p className="text-base text-muted-foreground font-light max-w-xl mx-auto leading-relaxed">
              Tips, guides, and behind-the-scenes insights for professional photographers.
            </p>
          </div>

          {/* Search & filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant={!catFilter ? "default" : "secondary"} className="cursor-pointer" onClick={() => setCatFilter("")}>All</Badge>
              {categories.map((c: any) => (
                <Badge key={c.id} variant={catFilter === c.name ? "default" : "secondary"} className="cursor-pointer" onClick={() => setCatFilter(c.name)}>
                  {c.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Featured */}
          {featuredPost && !search && !catFilter && (
            <Link to={`/blog/${featuredPost.slug}`} className="block mb-10">
              <div className="border border-border overflow-hidden hover:border-foreground transition-colors duration-300">
                <div className="grid md:grid-cols-2">
                  {featuredPost.cover_image_url && (
                    <img src={featuredPost.cover_image_url} alt={featuredPost.title} className="w-full h-64 md:h-full object-cover" loading="lazy" />
                  )}
                  <div className="p-8 flex flex-col justify-center">
                    <span className="text-[10px] tracking-widest uppercase border border-foreground px-2 py-0.5 w-fit mb-4">Featured</span>
                    <h2 className="text-2xl font-light tracking-wide mb-2">{featuredPost.title}</h2>
                    <p className="text-sm text-muted-foreground font-light mb-4 line-clamp-3">{(featuredPost as any).meta_description || featuredPost.summary}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground tracking-widest uppercase">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(featuredPost.published_at || featuredPost.created_at), "MMM dd, yyyy")}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{(featuredPost as any).reading_time_min || 1} min</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Grid */}
          {isLoading ? (
            <p className="text-center text-muted-foreground py-12 font-light">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 font-light">No articles found.</p>
          ) : (
            <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-3">
              {filtered.filter((p: any) => !p.featured || search || catFilter).map((post: any) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group bg-background">
                  <article className="flex flex-col h-full">
                    {post.cover_image_url && (
                      <img src={post.cover_image_url} alt={post.title} className="w-full h-48 object-cover" loading="lazy" />
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                        {post.category && <span className="text-[10px] tracking-widest uppercase text-muted-foreground">{post.category}</span>}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{post.reading_time_min || 1} min</span>
                      </div>
                      <h2 className="text-sm font-light tracking-widest uppercase mb-2 group-hover:text-foreground transition-colors">{post.title}</h2>
                      <p className="text-sm text-muted-foreground font-light line-clamp-2 flex-1">{post.meta_description || post.summary}</p>
                      <div className="flex items-center justify-between mt-4 text-xs">
                        <span className="text-muted-foreground tracking-widest">{format(new Date(post.published_at || post.created_at), "MMM dd, yyyy")}</span>
                        <span className="text-muted-foreground flex items-center gap-1 group-hover:text-foreground transition-colors tracking-widest uppercase">Read <ArrowRight className="h-3 w-3" /></span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </main>

        <footer className="border-t border-border mt-16 py-8 text-center">
          <p className="text-[10px] tracking-widest uppercase text-muted-foreground">© {new Date().getFullYear()} Davions. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}
