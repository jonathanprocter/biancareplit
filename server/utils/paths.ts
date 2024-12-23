import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const currentDir = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(currentDir, '..');
const projectRoot = resolve(serverDir, '..');

// Define all project paths here to ensure consistency
export const paths = {
  root: projectRoot,
  client: {
    root: resolve(projectRoot, 'client'),
    src: resolve(projectRoot, 'client', 'src'),
    public: resolve(projectRoot, 'client', 'public'),
    dist: resolve(projectRoot, 'dist', 'public'),
  },
  server: {
    root: serverDir,
    utils: currentDir,
    routes: resolve(serverDir, 'routes'),
    middleware: resolve(serverDir, 'middleware'),
  },
  db: resolve(projectRoot, 'db'),
  config: resolve(projectRoot, 'config'),
} as const;

// Helper function for ES module path resolution
export function getDirname(importMetaUrl: string) {
  return dirname(fileURLToPath(importMetaUrl));
}

export default paths;
