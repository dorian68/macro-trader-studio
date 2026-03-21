import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PublicNavbar from "@/components/PublicNavbar";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { RelatedPages } from "@/components/RelatedPages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, User, ArrowLeft, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { breadcrumbList, articleSchema } from "@/seo/structuredData";

interface BlogPostData {
  id: string;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author: string;
  category: string | null;
  tags: string[] | null;
  language: string;
  published_at: string | null;
  updated_at: string;
}

/** Simple markdown-to-HTML for blog content */
function renderMarkdown(md: string): string {
  return md
    // Headers
    .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold text-foreground mt-8 mb-3">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold text-foreground mt-10 mb-4">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold text-foreground mt-10 mb-4">$1</h1>')
    // Bold & italic
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:text-primary/80">$1</a>')
    // Unordered lists
    .replace(/^\s*[-*] (.*$)/gm, '<li class="ml-4 list-disc text-muted-foreground">$1</li>')
    // Paragraphs (lines that aren't already tags)
    .replace(/^(?!<[hul]|<li)(.*\S.*)$/gm, '<p class="text-muted-foreground leading-relaxed mb-4">$1</p>')
    // Wrap consecutive li items
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="space-y-2 mb-6">$&</ul>');
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      if (!slug) return;
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (!error && data) {
        setPost(data as BlogPostData);
      }
      setLoading(false);
    }
    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavbar />
        <div className="container mx-auto max-w-3xl py-16 px-4 space-y-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Article not found</h1>
            <Button onClick={() => navigate("/blog")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const SITE_URL = "https://macro-trader-studio.lovable.app";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        titleKey={post.meta_title ? undefined : "seo.blogTitle"}
        descriptionKey={post.meta_description ? undefined : "seo.blogDescription"}
        canonicalPath={`/blog/${post.slug}`}
        ogImage={post.cover_image || undefined}
        ogType="article"
        jsonLd={[
          breadcrumbList(post.title, `/blog/${post.slug}`),
          articleSchema({
            title: post.title,
            description: post.meta_description || post.excerpt || "",
            slug: post.slug,
            author: post.author,
            publishedAt: post.published_at || post.updated_at,
            modifiedAt: post.updated_at,
            coverImage: post.cover_image,
          }),
        ]}
      />
      {/* Override meta if post has custom meta */}
      {post.meta_title && (
        <SEOHead
          titleKey=""
          descriptionKey=""
          canonicalPath={`/blog/${post.slug}`}
        />
      )}

      <PublicNavbar />

      <main className="flex-1">
        <article className="py-12 px-4">
          <div className="container mx-auto max-w-3xl">
            {/* Back link */}
            <button
              onClick={() => navigate("/blog")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </button>

            {/* Header */}
            <header className="mb-8">
              {post.category && (
                <Badge variant="secondary" className="mb-4">
                  {post.category}
                </Badge>
              )}
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {post.author}
                </span>
                {post.published_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(post.published_at), "MMMM d, yyyy")}
                  </span>
                )}
              </div>
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </header>

            {/* Cover */}
            {post.cover_image && (
              <img
                src={post.cover_image}
                alt={post.title}
                className="w-full rounded-lg mb-10 shadow-md"
              />
            )}

            {/* Content */}
            <div
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
            />

            {/* CTA */}
            <div className="mt-16 p-8 rounded-xl bg-muted/40 border border-border text-center">
              <h3 className="text-xl font-bold text-foreground mb-3">
                Try AlphaLens for free
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Get AI-powered trade setups, macro commentary, and portfolio analytics — start your free trial today.
              </p>
              <Button onClick={() => navigate("/auth")} size="lg">
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </article>

        <RelatedPages
          currentPath={`/blog/${post.slug}`}
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
