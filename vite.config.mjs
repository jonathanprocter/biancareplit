import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { vitePaths } from "./config/vite-paths";
import path from "path";

// Use vitePaths for consistent path resolution
export default defineConfig({
  plugins: [react(), runtimeErrorOverlay(), themePlugin()],
  root: vitePaths.client.root,
  resolve: {
    alias: {
      "@": path.resolve(vitePaths.client.src),
      "@db": path.resolve(vitePaths.client.root, "../db")
    }
  },
  build: {
    outDir: vitePaths.outDir,
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    hmr: true
  }
});
