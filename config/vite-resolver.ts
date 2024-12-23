import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { getModulePath } from "./paths";

const paths = getModulePath(import.meta.url);

export const viteConfig = defineConfig({
  plugins: [react(), runtimeErrorOverlay(), themePlugin()],
  root: paths.client.root,
  resolve: {
    alias: paths.aliases
  },
  build: {
    outDir: paths.client.dist,
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    hmr: true
  }
});

export default viteConfig;
