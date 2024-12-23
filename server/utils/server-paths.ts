import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const getCurrentDirname = (importMetaUrl: string) => dirname(fileURLToPath(importMetaUrl));
const serverDir = getCurrentDirname(import.meta.url);
const projectRoot = resolve(serverDir, '../..');

export const serverPaths = {
  root: projectRoot,
  client: resolve(projectRoot, 'client'),
  server: resolve(projectRoot, 'server'),
  public: resolve(projectRoot, 'dist', 'public'),
  db: resolve(projectRoot, 'db'),
} as const;

export const getDirname = (importMetaUrl: string) => getCurrentDirname(importMetaUrl);

export default serverPaths;
