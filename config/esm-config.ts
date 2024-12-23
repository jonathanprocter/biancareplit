import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory name in ES module context
export function getDirname(importMetaUrl: string) {
  return dirname(fileURLToPath(importMetaUrl));
}

// Get current directory 
const __dirname = getDirname(import.meta.url);
const projectRoot = resolve(__dirname, '..');

// Define project paths
export const projectConfig = {
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

// Helper for path resolution in ES modules
export function getModulePath(importMetaUrl: string, ...pathSegments: string[]) {
  const dir = getDirname(importMetaUrl);
  return resolve(dir, ...pathSegments);
}

export default projectConfig;
