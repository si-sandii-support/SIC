import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig(() => ({
  // Load the monorepo-root .env for local development; only VITE_* values reach the browser.
  envDir: "../../",
  // SWC compiles JSX/TS-free JavaScript quickly and keeps React Fast Refresh in development.
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  proxy: {
      '/api': {
        target: 'https://sic-acq.pages.dev',
        changeOrigin: true,
        secure: true,
      },
    },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    cssMinify: true,
    minify: "esbuild",
    reportCompressedSize: false,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react-vendor";
          if (/node_modules\/@dnd-kit\//.test(id)) return "drag-vendor";
          if (/node_modules\/(pdfjs-dist|mammoth|xlsx|papaparse|jszip)\//.test(id)) return "document-vendor";
          if (/node_modules\/lucide-react\//.test(id)) return "icons-vendor";
          if (/node_modules\/react-hot-toast\//.test(id)) return "ui-vendor";
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "@dnd-kit/core", "@dnd-kit/sortable"],
  },
}));
