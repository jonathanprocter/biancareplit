import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

/**
 * Get the directory name in ES module context
 */
export function getDirname(importMetaUrl: string) {
  return dirname(fileURLToPath(importMetaUrl));
}

// Get current directory
const configDir = getDirname(import.meta.url);
const projectRoot = resolve(configDir, '..');

/**
 * Unified project paths configuration
 * Single source of truth for all path resolutions
 */
export const paths = {
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
  config: configDir,
} as const;

export default paths;
