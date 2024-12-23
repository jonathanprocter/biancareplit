import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory name in ES module context
const getCurrentDirname = (importMetaUrl: string) => dirname(fileURLToPath(importMetaUrl));

// Create paths relative to this config file
const configDir = getCurrentDirname(import.meta.url);
const projectRoot = resolve(configDir, '..');

export const projectPaths = {
  root: projectRoot,
  client: resolve(projectRoot, 'client'),
  server: resolve(projectRoot, 'server'),
  public: resolve(projectRoot, 'dist', 'public'),
  db: resolve(projectRoot, 'db'),
  config: configDir,
} as const;

// Helper function to get dirname in ES modules
export const getDirname = (importMetaUrl: string) => getCurrentDirname(importMetaUrl);

export default projectPaths;
