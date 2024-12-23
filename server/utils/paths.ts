import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES module context
function getCurrentDirname(importMetaUrl: string) {
  return dirname(fileURLToPath(importMetaUrl));
}

// Create paths relative to this utils file
const utilsDir = getCurrentDirname(import.meta.url);
const serverDir = resolve(utilsDir, '..');
const projectRoot = resolve(serverDir, '..');

export const paths = {
  root: projectRoot,
  client: resolve(projectRoot, 'client'),
  server: serverDir,
  public: resolve(projectRoot, 'dist', 'public'),
  db: resolve(projectRoot, 'db'),
  config: resolve(projectRoot, 'config'),
} as const;

// Helper function to get dirname in ES modules
export function getDirname(importMetaUrl: string) {
  return getCurrentDirname(importMetaUrl);
}

export default paths;
