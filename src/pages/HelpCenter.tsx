import { useState } from "react";
import PublicNavbar from "@/components/PublicNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MessageCircle, Mail, Book } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function HelpCenter() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const helpTopics = [
    {
      category: "Getting Started",
      icon: Book,
      articles: [
        { title: "Creating Your First Account", link: "/documentation" },
        { title: "Understanding Credits and Plans", link: "/pricing" },
        { title: "Selecting Your Broker", link: "/documentation" },
        { title: "Navigating the Dashboard", link: "/documentation" },
      ],
    },
    {
      category: "AI Features",
      icon: MessageCircle,
      articles: [
        { title: "How to Generate Trade Setups", link: "/documentation" },
        { title: "Using Macro Commentary", link: "/documentation" },
        { title: "Creating Custom Reports", link: "/documentation" },
        { title: "Best Practices for AI Queries", link: "/documentation" },
      ],
    },
    {
      category: "Portfolio Management",
      icon: Book,
      articles: [
        { title: "Adding Positions to Your Portfolio", link: "/documentation" },
        { title: "Understanding P&L Calculations", link: "/documentation" },
        { title: "AI Recommendations Explained", link: "/documentation" },
        { title: "Exporting Portfolio Data", link: "/documentation" },
      ],
    },
    {
      category: "Billing & Account",
      icon: Mail,
      articles: [
        { title: "Upgrading Your Plan", link: "/pricing" },
        { title: "Managing Payment Methods", link: "/pricing" },
        { title: "Canceling Your Subscription", link: "/pricing" },
        { title: "Refund Policy", link: "/terms" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-br from-background via-background to-secondary/10">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Help Center
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Find answers to your questions and get the most out of Alphalens
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Search for help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 text-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Help Topics */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            {helpTopics.map((topic) => (
              <Card key={topic.category}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <topic.icon className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle>{topic.category}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {topic.articles.map((article) => (
                      <li key={article.title}>
                        <button
                          onClick={() => navigate(article.link)}
                          className="text-muted-foreground hover:text-primary transition-colors text-left"
                        >
                          {article.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16 px-4 bg-secondary/5">
        <div className="container mx-auto max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl">Still Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-muted-foreground">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => navigate("/contact")}
                  className="gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Contact Support
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/documentation")}
                  className="gap-2"
                >
                  <Book className="w-4 h-4" />
                  View Full Documentation
                </Button>
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Email us at{" "}
                  <span className="font-semibold text-foreground">research@albaricg.com</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  We typically respond within 24 hours
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-8 px-4">
        <div className="container mx-auto max-w-4xl text-center text-muted-foreground text-sm">
          <p>© 2025 alphaLens.ai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
