import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    sourcemap: "hidden",
    minify: mode === "production",
    outDir: "out/webview-ui",
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        dashboard: "src/webview-ui/dashboard/index.tsx",
        settings: "src/webview-ui/settings/index.tsx",
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith(".css")
            ? "webview.css"
            : "assets/[name]-[hash][extname]",
        format: "es",
      },
    },
  },
}));
