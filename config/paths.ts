import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

/**
 * Get the directory name in ES module context
 */
function getDirname(importMetaUrl: string) {
  return dirname(fileURLToPath(importMetaUrl));
}

// Get current directory using import.meta.url
const currentDir = getDirname(import.meta.url);
const projectRoot = resolve(currentDir, '..');

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
    components: resolve(projectRoot, 'client', 'src', 'components'),
    pages: resolve(projectRoot, 'client', 'src', 'pages'),
    hooks: resolve(projectRoot, 'client', 'src', 'hooks'),
    styles: resolve(projectRoot, 'client', 'src', 'styles'),
    utils: resolve(projectRoot, 'client', 'src', 'utils'),
    index: resolve(projectRoot, 'client', 'index.html')
  },
  server: {
    root: resolve(projectRoot, 'server'),
    utils: resolve(projectRoot, 'server', 'utils'),
    routes: resolve(projectRoot, 'server', 'routes'),
    middleware: resolve(projectRoot, 'server', 'middleware'),
  },
  db: resolve(projectRoot, 'db'),
  config: currentDir,
  aliases: {
    '@': resolve(projectRoot, 'client', 'src'),
    '@db': resolve(projectRoot, 'db'),
    '@server': resolve(projectRoot, 'server'),
    '@config': currentDir
  }
} as const;

/**
 * Helper for ES module path resolution
 */
export function getModulePath(importMetaUrl: string) {
  const __dirname = getDirname(importMetaUrl);
  return {
    root: resolve(__dirname, '..'),
    client: {
      root: resolve(__dirname, '..', 'client'),
      src: resolve(__dirname, '..', 'client', 'src'),
      public: resolve(__dirname, '..', 'client', 'public'),
      dist: resolve(__dirname, '..', 'dist', 'public')
    },
    aliases: {
      '@': resolve(__dirname, '..', 'client', 'src'),
      '@db': resolve(__dirname, '..', 'db')
    }
  };
}

export default paths;
