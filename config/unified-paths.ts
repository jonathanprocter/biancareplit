import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

/**
 * Get the directory name in ES module context
 */
export function getDirname(importMetaUrl: string) {
  return dirname(fileURLToPath(importMetaUrl));
}

// Get the current directory
const __dirname = getDirname(import.meta.url);
const projectRoot = resolve(__dirname, '..');

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
  },
  server: {
    root: resolve(projectRoot, 'server'),
    utils: resolve(projectRoot, 'server', 'utils'),
    routes: resolve(projectRoot, 'server', 'routes'),
    middleware: resolve(projectRoot, 'server', 'middleware'),
  },
  db: resolve(projectRoot, 'db'),
  config: __dirname,
} as const;

/**
 * Helper function for ES module path resolution
 */
export function getModulePath(importMetaUrl: string, ...pathSegments: string[]) {
  const dir = getDirname(importMetaUrl);
  return resolve(dir, ...pathSegments);
}

export default unifiedPaths;
