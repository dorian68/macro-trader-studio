import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PublicNavbar from "@/components/PublicNavbar";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { RelatedPages } from "@/components/RelatedPages";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { breadcrumbList, organizationSchema, webSiteSchema, siteNavigationSchema, webPageSchema } from "@/seo/structuredData";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  author: string;
  category: string | null;
  language: string;
  published_at: string | null;
}

const PAGE_SIZE = 12;

const CATEGORY_SLUGS: Record<string, string> = {
  "quant-backtesting": "Quant & Backtesting",
  "portfolio-risk": "Portfolio & Risk",
  "institutional-governance": "Institutional & Governance",
  "commodities-macro": "Commodities & Macro",
};

const CATEGORY_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_SLUGS).map(([slug, name]) => [name, slug])
);

export default function Blog() {
  const { category: categoryParam, page: pageParam } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  // Derive category from URL param
  const category = categoryParam ? (CATEGORY_SLUGS[categoryParam] || "all") : "all";
  // Derive current page from URL param
  const currentPage = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
  const offset = (currentPage - 1) * PAGE_SIZE;

  const fetchPosts = useCallback(async (off: number, cat: string, replace: boolean) => {
    if (off === 0) setLoading(true);
    else setLoadingMore(true);

    let query = supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, cover_image, author, category, language, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range(off, off + PAGE_SIZE - 1);

    if (cat !== "all") {
      query = query.eq("category", cat);
    }

    const { data, error } = await query;

    if (!error && data) {
      setPosts(prev => replace ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
    setLoadingMore(false);
  }, []);

  // Fetch categories once
  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from("blog_posts")
        .select("category")
        .eq("status", "published")
        .not("category", "is", null);
      if (data) {
        const unique = [...new Set(data.map(d => d.category).filter(Boolean))] as string[];
        setCategories(unique.sort());
      }
    }
    fetchCategories();
  }, []);

  // Fetch posts on mount and when URL params change
  useEffect(() => {
    fetchPosts(offset, category, true);
  }, [category, offset, fetchPosts]);

  const handleLoadMore = () => {
    fetchPosts(posts.length, category, false);
  };

  const handleCategoryChange = (val: string) => {
    if (val === "all") {
      navigate("/blog");
    } else {
      const slug = CATEGORY_TO_SLUG[val];
      if (slug) navigate(`/blog/category/${slug}`);
    }
  };

  // Build canonical path
  const canonicalPath = categoryParam
    ? `/blog/category/${categoryParam}`
    : pageParam
      ? `/blog/page/${pageParam}`
      : "/blog";

  // Compute next/prev page URLs for SEO
  const prevPage = currentPage > 1
    ? currentPage === 2 ? "/blog" : `/blog/page/${currentPage - 1}`
    : null;
  const nextPage = hasMore ? `/blog/page/${currentPage + 1}` : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        titleKey="seo.blogTitle"
        descriptionKey="seo.blogDescription"
        canonicalPath={canonicalPath}
        jsonLd={[
          organizationSchema,
          webSiteSchema,
          siteNavigationSchema,
          breadcrumbList("Blog", "/blog"),
          webPageSchema("Blog", "/blog", "Market insights, AI trading research, and institutional-grade analysis from the AlphaLens team."),
        ]}
      />
      <PublicNavbar />

      <main className="flex-1">
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
                  AlphaLens Blog
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl">
                  Market insights, AI trading research, and institutional-grade analysis from the AlphaLens team.
                </p>
              </div>
              {/* Crawlable category links */}
              <nav aria-label="Blog categories" className="flex flex-wrap gap-2">
                <Link
                  to="/blog"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    category === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  All
                </Link>
                {Object.entries(CATEGORY_SLUGS).map(([slug, name]) => (
                  <Link
                    key={slug}
                    to={`/blog/category/${slug}`}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      category === name
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {name}
                  </Link>
                ))}
              </nav>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-48 w-full" />
                    <CardContent className="p-5 space-y-3">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">No articles published yet. Check back soon!</p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {posts.map((post) => (
                    <Link
                      key={post.id}
                      to={`/blog/${post.slug}`}
                      className="block group"
                    >
                      <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow h-full">
                        {post.cover_image && (
                          <img
                            src={post.cover_image}
                            alt={post.title}
                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        )}
                        <CardContent className="p-5 space-y-3">
                          {post.category && (
                            <Badge variant="secondary" className="text-xs">
                              {post.category}
                            </Badge>
                          )}
                          <h2 className="text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {post.title}
                          </h2>
                          {post.excerpt && (
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {post.excerpt}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {post.author}
                            </span>
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

                {/* Crawlable pagination */}
                <div className="flex justify-center items-center gap-4 mt-10">
                  {prevPage && (
                    <Link to={prevPage}>
                      <Button variant="outline" size="lg">← Previous</Button>
                    </Link>
                  )}
                  {hasMore && (
                    <Link to={`/blog/page/${currentPage + 1}`}>
                      <Button variant="outline" size="lg">Next →</Button>
                    </Link>
                  )}
                </div>

                {/* SEO: rel prev/next hints */}
                {prevPage && <link rel="prev" href={`https://alphalensai.com${prevPage}`} />}
                {nextPage && <link rel="next" href={`https://alphalensai.com${nextPage}`} />}
              </>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 px-4 bg-muted/30">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Ready to transform your trading with AI?
            </h2>
            <p className="text-muted-foreground mb-6">
              Get institutional-grade trade setups, macro commentary, and portfolio analytics powered by AI.
            </p>
            <Link to="/auth">
              <Button size="lg">
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <RelatedPages
          links={[
            { label: "Features", path: "/features" },
            { label: "Pricing", path: "/pricing" },
            { label: "About", path: "/about" },
          ]}
        />
      </main>

      <Footer />
    </div>
  );
}
