import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
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
import { breadcrumbList, articleSchema, faqSchema } from "@/seo/structuredData";
import { Helmet } from "react-helmet-async";

/** Extract FAQ items from Markdown content (## FAQ or ## Frequently Asked Questions) */
function extractFaqItems(content: string): { question: string; answer: string }[] {
  const faqMatch = content.match(/## (?:FAQ|Frequently Asked Questions)\s*\n([\s\S]*?)(?=\n## |\n---|\n\*\*\[|$)/i);
  if (!faqMatch) return [];

  const faqBlock = faqMatch[1];
  const items: { question: string; answer: string }[] = [];

  // Match **Q: ...** or ### ... followed by answer text
  const questionPattern = /(?:\*\*Q:\s*(.+?)\*\*|###\s*(.+?))\s*\n([\s\S]*?)(?=(?:\*\*Q:|\n###|\n## |\n---|\n\*\*\[|$))/gi;
  let match;
  while ((match = questionPattern.exec(faqBlock)) !== null) {
    const question = (match[1] || match[2] || '').trim();
    const answer = match[3].replace(/\n+/g, ' ').replace(/\*\*/g, '').trim();
    if (question && answer) {
      items.push({ question, answer });
    }
  }

  return items;
}

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

/** Map category to a default cover image */
const CATEGORY_COVERS: Record<string, string> = {
  'Quant & Backtesting': '/images/blog/cover-quant-backtesting.jpg',
  'Portfolio & Risk': '/images/blog/cover-portfolio-risk.jpg',
  'Institutional & Governance': '/images/blog/cover-institutional-governance.jpg',
  'Commodities & Macro': '/images/blog/cover-commodities-macro.jpg',
};

function getCoverImage(post: BlogPostData): string | null {
  return post.cover_image || (post.category ? CATEGORY_COVERS[post.category] : null) || null;
}

/** Simple markdown-to-HTML for blog content */
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold text-foreground mt-8 mb-3">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold text-foreground mt-10 mb-4">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold text-foreground mt-10 mb-4">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:text-primary/80">$1</a>')
    .replace(/^\s*\d+\.\s+(.*$)/gm, '<li class="ml-4 list-decimal text-muted-foreground">$1</li>')
    .replace(/^\s*[-*] (.*$)/gm, '<li class="ml-4 list-disc text-muted-foreground">$1</li>')
    .replace(/^(?!<[hulo]|<li)(.*\S.*)$/gm, '<p class="text-muted-foreground leading-relaxed mb-4">$1</p>')
    .replace(/(<li class="ml-4 list-decimal[^"]*">.*<\/li>\n?)+/g, '<ol class="space-y-2 mb-6">$&</ol>')
    .replace(/(<li class="ml-4 list-disc[^"]*">.*<\/li>\n?)+/g, '<ul class="space-y-2 mb-6">$&</ul>');
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
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
            <Link to="/blog" className="inline-flex items-center gap-2 text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const pageTitle = post.meta_title || `${post.title} | AlphaLens`;
  const pageDescription = post.meta_description || post.excerpt || "";
  const faqItems = extractFaqItems(post.content);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Use raw Helmet for dynamic post titles instead of translation keys */}
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={`https://alphalensai.com/blog/${post.slug}`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://alphalensai.com/blog/${post.slug}`} />
        {post.cover_image && <meta property="og:image" content={post.cover_image} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        {post.cover_image && <meta name="twitter:image" content={post.cover_image} />}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://alphalensai.com/" },
              { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://alphalensai.com/blog" },
              { "@type": "ListItem", "position": 3, "name": post.title, "item": `https://alphalensai.com/blog/${post.slug}` }
            ]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(articleSchema({
            title: post.title,
            description: pageDescription,
            slug: post.slug,
            author: post.author,
            publishedAt: post.published_at || post.updated_at,
            modifiedAt: post.updated_at,
            coverImage: post.cover_image,
          }))}
        </script>
        {faqItems.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify(faqSchema(faqItems))}
          </script>
        )}
      </Helmet>

      <PublicNavbar />

      <main className="flex-1">
        <article className="py-12 px-4">
          <div className="container mx-auto max-w-3xl">
            {/* Breadcrumb: Home → Blog → Article */}
            <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted-foreground">
              <ol className="flex items-center gap-1 flex-wrap">
                <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
                <li>/</li>
                <li><Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li>/</li>
                <li className="text-foreground truncate max-w-[200px]">{post.title}</li>
              </ol>
            </nav>

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
                <span className="flex items-center gap-1">
                  ⏱ {Math.max(1, Math.round(post.content.split(/\s+/).length / 200))} min read
                </span>
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
                loading="lazy"
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
              <Link to="/auth">
                <Button size="lg">
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </article>

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
