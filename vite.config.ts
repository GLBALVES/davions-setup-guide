import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Stable per-build identifier. Injected into both:
// 1. import.meta.env.VITE_BUILD_ID (read by the editor's "Deploy do código" indicator)
// 2. <meta name="build-id"> in index.html (fetched from the live domain to compare)
const BUILD_ID = String(Date.now());

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  define: {
    "import.meta.env.VITE_BUILD_ID": JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "html-build-id-replace",
      transformIndexHtml(html: string) {
        return html.replace(/%BUILD_ID%/g, BUILD_ID);
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
}));
