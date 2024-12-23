import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

/**
 * Get the directory name in ES module context
 */
export function getDirname(importMetaUrl: string) {
  return dirname(fileURLToPath(importMetaUrl));
}

/**
 * Get the current file's directory path in ES module context
 */
export function getCurrentDir() {
  return getDirname(import.meta.url);
}

// Initialize paths relative to the current file
const currentDir = getCurrentDir();
const projectRoot = resolve(currentDir, '..');

/**
 * Unified project paths configuration
 * Use this as the single source of truth for all path resolutions
 */
export const unifiedPaths = {
  root: projectRoot,
  client: {
    root: resolve(projectRoot, 'client'),
    src: resolve(projectRoot, 'client', 'src'),
    public: resolve(projectRoot, 'client', 'public'),
    dist: resolve(projectRoot, 'dist', 'public'),
    index: resolve(projectRoot, 'client', 'index.html'),
  },
  server: {
    root: resolve(projectRoot, 'server'),
    utils: resolve(projectRoot, 'server', 'utils'),
    routes: resolve(projectRoot, 'server', 'routes'),
    middleware: resolve(projectRoot, 'server', 'middleware'),
  },
  db: resolve(projectRoot, 'db'),
  config: currentDir,
  vite: {
    root: resolve(projectRoot, 'client'),
    outDir: resolve(projectRoot, 'dist', 'public'),
    configFile: resolve(projectRoot, 'vite.config.ts'),
  }
} as const;

/**
 * Helper function for ES module path resolution
 */
export function getModulePath(importMetaUrl: string, ...pathSegments: string[]) {
  const dir = getDirname(importMetaUrl);
  return resolve(dir, ...pathSegments);
}

// Re-export dirname function for compatibility
export { getDirname };

export default unifiedPaths;
