import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Helper function to get dirname in ES module context
export function getDirname(importMetaUrl: string) {
  return dirname(fileURLToPath(importMetaUrl));
}

// Get current file's directory
const currentDir = getDirname(import.meta.url);
const projectRoot = resolve(currentDir, '..');

// Export path configuration for Vite
export const vitePaths = {
  root: resolve(projectRoot, 'client'),
  outDir: resolve(projectRoot, 'dist', 'public'),
  client: {
    root: resolve(projectRoot, 'client'),
    src: resolve(projectRoot, 'client', 'src'),
    public: resolve(projectRoot, 'client', 'public'),
    index: resolve(projectRoot, 'client', 'index.html'),
  },
  aliases: {
    '@': resolve(projectRoot, 'client', 'src'),
    '@db': resolve(projectRoot, 'db'),
  }
} as const;

// Helper to resolve paths relative to the current module
export function resolveRelativePath(...pathSegments: string[]) {
  return resolve(currentDir, ...pathSegments);
}

export default vitePaths;
