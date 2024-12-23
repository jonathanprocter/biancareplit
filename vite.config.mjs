import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { vitePaths } from "./config/vite-paths";

export default defineConfig({
  plugins: [react(), runtimeErrorOverlay(), themePlugin()],
  root: vitePaths.root,
  resolve: {
    alias: vitePaths.aliases,
  },
  build: {
    outDir: vitePaths.outDir,
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
  },
});
