import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root is two levels up from config folder
const projectRoot = resolve(__dirname, '..');

export const vitePaths = {
  root: projectRoot,
  client: {
    root: resolve(projectRoot, 'client'),
    src: resolve(projectRoot, 'client', 'src'),
    public: resolve(projectRoot, 'client', 'public'),
  },
  dist: resolve(projectRoot, 'dist', 'public'),
} as const;

export function getDirname(importMetaUrl: string) {
  return dirname(fileURLToPath(importMetaUrl));
}

export default vitePaths;
