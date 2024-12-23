import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

/**
 * Get the directory name in ES module context
 */
function getCurrentDirname(importMetaUrl: string) {
  return dirname(fileURLToPath(importMetaUrl));
}

// Create paths relative to this utils file
const currentDir = getCurrentDirname(import.meta.url);
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

// Helper function to get dirname in ES modules
export function getDirname(importMetaUrl: string) {
  return getCurrentDirname(importMetaUrl);
}

export default paths;