import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const vendorChunks = {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-select'],
  'vendor-charts': ['recharts', 'lightweight-charts'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-query': ['@tanstack/react-query'],
  'vendor-plotly': ['plotly.js', 'react-plotly.js'],
};

function manualChunks(id: string): string | undefined {
  const normalizedId = id.replace(/\\/g, '/');
  for (const [chunkName, packages] of Object.entries(vendorChunks)) {
    if (packages.some((packageName) => normalizedId.includes(`/node_modules/${packageName}/`))) {
      return chunkName;
    }
  }
  return undefined;
}

// Build-time sitemap generation plugin
function sitemapPlugin(): Plugin {
  return {
    name: 'generate-sitemap',
    apply: 'build',
    async closeBundle() {
      const { writeSitemap } = await import('./scripts/generate-sitemap');
      writeSitemap('dist');
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    sitemapPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Stub Node.js built-ins that some dependencies try to import in browser
      "buffer/": "buffer",
    },
  },
  // PERFORMANCE: Optimized build configuration for better bundle splitting and caching
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
    chunkSizeWarningLimit: 600,
    minify: 'oxc',
    target: 'es2020',
  },
  // PERFORMANCE: Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
  },
}));
