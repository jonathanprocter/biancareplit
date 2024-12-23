import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the current directory using ES module compatible approach
const getCurrentDirname = (importMetaUrl: string) => dirname(fileURLToPath(importMetaUrl));

// Get the current directory
const currentDir = getCurrentDirname(import.meta.url);
const projectRoot = resolve(currentDir, '..');

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
  config: resolve(projectRoot, 'config'),
} as const;

// Helper function to get dirname in ES modules
export function getDirname(importMetaUrl: string) {
  return getCurrentDirname(importMetaUrl);
}

export default paths;
