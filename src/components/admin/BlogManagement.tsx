import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Eye, Save, X } from "lucide-react";
import { format } from "date-fns";

interface BlogPost {
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
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function BlogManagement() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [creating, setCreating] = useState(false);

  const emptyPost: Partial<BlogPost> = {
    title: "",
    slug: "",
    meta_title: "",
    meta_description: "",
    excerpt: "",
    content: "",
    cover_image: "",
    author: "AlphaLens Research",
    category: "market-commentary",
    tags: [],
    language: "fr",
    status: "draft",
  };

  const [form, setForm] = useState<Partial<BlogPost>>(emptyPost);

  async function fetchPosts() {
    setLoading(true);
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPosts(data as BlogPost[]);
    setLoading(false);
  }

  useEffect(() => { fetchPosts(); }, []);

  function startCreate() {
    setEditing(null);
    setForm(emptyPost);
    setCreating(true);
  }

  function startEdit(post: BlogPost) {
    setCreating(false);
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      meta_title: post.meta_title || "",
      meta_description: post.meta_description || "",
      excerpt: post.excerpt || "",
      content: post.content,
      cover_image: post.cover_image || "",
      author: post.author,
      category: post.category || "",
      tags: post.tags || [],
      language: post.language,
      status: post.status,
    });
  }

  function cancelEdit() {
    setEditing(null);
    setCreating(false);
    setForm(emptyPost);
  }

  async function handleSave() {
    if (!form.title || !form.content) {
      toast({ title: "Title and content are required", variant: "destructive" });
      return;
    }

    const slug = form.slug || slugify(form.title);
    const payload = {
      title: form.title!,
      slug,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      excerpt: form.excerpt || null,
      content: form.content!,
      cover_image: form.cover_image || null,
      author: form.author || "AlphaLens Research",
      category: form.category || null,
      tags: form.tags && form.tags.length > 0 ? form.tags : null,
      language: form.language || "fr",
      status: form.status || "draft",
      published_at: form.status === "published" ? new Date().toISOString() : null,
    };

    let error;
    if (creating) {
      ({ error } = await supabase.from("blog_posts").insert(payload));
    } else if (editing) {
      ({ error } = await supabase.from("blog_posts").update(payload).eq("id", editing.id));
    }

    if (error) {
      toast({ title: "Error saving post", description: error.message, variant: "destructive" });
    } else {
      toast({ title: creating ? "Post created" : "Post updated" });
      cancelEdit();
      fetchPosts();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Post deleted" });
      fetchPosts();
    }
  }

  // Editor form
  if (creating || editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{creating ? "New Blog Post" : "Edit Blog Post"}</span>
            <Button variant="ghost" size="icon" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input value={form.title || ""} onChange={e => {
                setForm(f => ({ ...f, title: e.target.value, slug: slugify(e.target.value) }));
              }} />
            </div>
            <div>
              <label className="text-sm font-medium">Slug</label>
              <Input value={form.slug || ""} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Meta Title (50-60 chars)</label>
              <Input value={form.meta_title || ""} onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))} maxLength={60} />
            </div>
            <div>
              <label className="text-sm font-medium">Meta Description (120-155 chars)</label>
              <Input value={form.meta_description || ""} onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))} maxLength={155} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Excerpt</label>
            <Textarea value={form.excerpt || ""} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} rows={2} />
          </div>
          <div>
            <label className="text-sm font-medium">Content (Markdown) *</label>
            <Textarea value={form.content || ""} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={16} className="font-mono text-sm" />
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={form.category || ""} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Quant & Backtesting">Quant & Backtesting</SelectItem>
                  <SelectItem value="Portfolio & Risk">Portfolio & Risk</SelectItem>
                  <SelectItem value="Institutional & Governance">Institutional & Governance</SelectItem>
                  <SelectItem value="Commodities & Macro">Commodities & Macro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Language</label>
              <Select value={form.language || "fr"} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={form.status || "draft"} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Cover Image URL</label>
              <Input value={form.cover_image || ""} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Tags (comma-separated)</label>
            <Input
              value={(form.tags || []).join(", ")}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) }))}
              placeholder="ai, trading, macro"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" /> Save</Button>
            <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // List view
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Blog Posts ({posts.length})</span>
          <Button onClick={startCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> New Post</Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">No blog posts yet.</p>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <div key={post.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground truncate">{post.title}</span>
                    <Badge variant={post.status === "published" ? "default" : "secondary"} className="text-xs shrink-0">
                      {post.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs shrink-0">{post.language}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    /{post.slug} · {format(new Date(post.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button variant="ghost" size="icon" onClick={() => window.open(`/blog/${post.slug}`, "_blank")}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => startEdit(post)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
