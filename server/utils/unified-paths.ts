import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const getCurrentDirname = (importMetaUrl: string) => dirname(fileURLToPath(importMetaUrl));

// Get the current directory
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
    config: resolve(serverDir, 'config'),
  },
  db: resolve(projectRoot, 'db'),
  config: resolve(projectRoot, 'config'),
} as const;

// Helper function to get dirname in ES modules
export function getDirname(importMetaUrl: string) {
  return getCurrentDirname(importMetaUrl);
}

export default paths;
