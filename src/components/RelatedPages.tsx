import { Link } from "react-router-dom";

interface RelatedPage {
  label: string;
  path: string;
}

interface RelatedPagesProps {
  links: RelatedPage[];
}

export function RelatedPages({ links }: RelatedPagesProps) {
  return (
    <nav aria-label="Related pages" className="py-8 px-4 bg-secondary/5 border-t border-border">
      <div className="container mx-auto max-w-4xl flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span>Explore more:</span>
        {links.map((link, i) => (
          <span key={link.path} className="flex items-center gap-2">
            <Link
              to={link.path}
              className="hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
            {i < links.length - 1 && <span className="text-border">|</span>}
          </span>
        ))}
      </div>
    </nav>
  );
}
