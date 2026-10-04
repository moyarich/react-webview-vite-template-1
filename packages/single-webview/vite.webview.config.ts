import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    sourcemap: "hidden",
    minify: mode === "production",
    outDir: "out/webview",
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: "src/webview/index.tsx",
      output: {
        entryFileNames: "webview.js",
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith(".css")
            ? "webview.css"
            : "assets/[name]-[hash][extname]",
        format: "iife",
        inlineDynamicImports: true,
      },
    },
  },
}));
