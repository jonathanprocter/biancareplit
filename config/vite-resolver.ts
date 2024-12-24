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
    port: 3000,
    hmr: {
      port: 3001,
      clientPort: 443,
      protocol: 'wss'
    }
  }
});

export default viteConfig;