import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import PublicNavbar from "@/components/PublicNavbar";
import { Footer } from "@/components/Footer";
import { RelatedPages } from "@/components/RelatedPages";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { getHubBySlug, seoHubPages } from "@/data/seoHubPages";
import { useAuth } from "@/hooks/useAuth";

interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  author: string;
  category: string | null;
  published_at: string | null;
  cover_image: string | null;
}

const CATEGORY_COVERS: Record<string, string> = {
  'Quant & Backtesting': '/images/blog/cover-quant-backtesting.webp',
  'Portfolio & Risk': '/images/blog/cover-portfolio-risk.webp',
  'Institutional & Governance': '/images/blog/cover-institutional-governance.webp',
  'Commodities & Macro': '/images/blog/cover-commodities-macro.webp',
};

export default function BlogHub() {
  const { hubSlug } = useParams<{ hubSlug: string }>();
  const { user } = useAuth();
  const hub = hubSlug ? getHubBySlug(hubSlug) : undefined;
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hubSlug) return;
    async function fetch() {
      setLoading(true);
      const { data } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, author, category, published_at, cover_image")
        .eq("status", "published")
        .contains("tags", [`hub:${hubSlug}`])
        .order("published_at", { ascending: false });
      if (data) setPosts(data as BlogPostRow[]);
      setLoading(false);
    }
    fetch();
  }, [hubSlug]);

  if (!hub) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Hub not found</h1>
            <Link to="/blog" className="text-primary hover:underline">← Back to Blog</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const SITE_URL = "https://alphalensai.com";
  const canonicalUrl = `${SITE_URL}/blog/hub/${hub.slug}`;

  // Group posts by hub sections
  const postsBySlug = Object.fromEntries(posts.map(p => [p.slug, p]));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{hub.metaTitle}</title>
        <meta name="description" content={hub.metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={hub.metaTitle} />
        <meta property="og:description" content={hub.metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={hub.metaTitle} />
        <meta name="twitter:description" content={hub.metaDescription} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
              { "@type": "ListItem", position: 3, name: hub.title, item: canonicalUrl },
            ],
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: hub.title,
            description: hub.metaDescription,
            url: canonicalUrl,
            isPartOf: { "@type": "WebSite", name: "AlphaLens AI", url: SITE_URL },
          })}
        </script>
      </Helmet>

      <PublicNavbar />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="container mx-auto max-w-5xl px-4 pt-8">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-8">
            <ol className="flex items-center gap-1 flex-wrap">
              <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
              <li>/</li>
              <li><Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li>/</li>
              <li className="text-foreground">{hub.title}</li>
            </ol>
          </nav>
        </div>

        {/* Hero */}
        <section className="pb-12 px-4">
          <div className="container mx-auto max-w-5xl">
            <Badge variant="secondary" className="mb-4 text-xs uppercase tracking-wider">Topic Hub</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">{hub.title}</h1>
            <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">{hub.heroDescription}</p>
          </div>
        </section>

        {/* Popular Questions Grid */}
        {!loading && posts.length > 0 && (
          <section className="py-12 px-4 bg-muted/20">
            <div className="container mx-auto max-w-5xl">
              <h2 className="text-2xl font-bold text-foreground mb-8">Popular Questions</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.slice(0, 6).map((post) => (
                  <Link key={post.id} to={`/blog/${post.slug}`} className="block group">
                    <Card className="h-full hover:shadow-lg transition-shadow border-border/50">
                      <CardContent className="p-6 space-y-3">
                        {post.category && <Badge variant="outline" className="text-xs">{post.category}</Badge>}
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2">
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{post.author}</span>
                          {post.published_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(post.published_at), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {loading && (
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-5xl grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}><CardContent className="p-6 space-y-3">
                  <Skeleton className="h-4 w-20" /><Skeleton className="h-6 w-full" /><Skeleton className="h-4 w-full" />
                </CardContent></Card>
              ))}
            </div>
          </section>
        )}

        {/* Sectioned Articles */}
        {hub.sections.map((section, idx) => {
          const sectionPosts = section.articleSlugs
            .map(s => postsBySlug[s])
            .filter(Boolean);
          if (sectionPosts.length === 0 && !loading) return null;
          return (
            <section key={idx} className="py-10 px-4">
              <div className="container mx-auto max-w-5xl">
                <h2 className="text-xl font-bold text-foreground mb-2">{section.title}</h2>
                <p className="text-muted-foreground mb-6">{section.description}</p>
                <div className="space-y-4">
                  {sectionPosts.map((post) => (
                    <Link key={post.id} to={`/blog/${post.slug}`} className="block group">
                      <div className="flex items-start gap-4 p-4 rounded-lg border border-border/40 hover:border-border hover:bg-muted/20 transition-colors">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{post.title}</h3>
                          {post.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.excerpt}</p>}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0 group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        {/* Related Hubs */}
        <section className="py-10 px-4">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-xl font-bold text-foreground mb-6">Explore More Topics</h2>
            <div className="flex flex-wrap gap-3">
              {hub.relatedHubs.map((rSlug) => {
                const rHub = seoHubPages.find(h => h.slug === rSlug);
                if (!rHub) return null;
                return (
                  <Link key={rSlug} to={`/blog/hub/${rSlug}`}>
                    <Badge variant="secondary" className="text-sm px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                      {rHub.title} →
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 px-4 bg-muted/30">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">{hub.ctaText}</h2>
            <p className="text-muted-foreground mb-6">
              Get AI-powered trade setups, macro commentary, and portfolio analytics — start your free trial today.
            </p>
            <Link to={user ? "/dashboard" : "/auth?intent=free_trial&tab=signup"}>
              <Button size="lg">
                {user ? "Go to Dashboard" : "Start Free Trial"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <RelatedPages
          links={[
            { label: "Blog", path: "/blog" },
            { label: "Features", path: "/features" },
            { label: "Pricing", path: "/pricing" },
          ]}
        />
      </main>

      <Footer />
    </div>
  );
}
