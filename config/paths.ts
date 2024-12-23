import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root is one level up from config folder
const projectRoot = resolve(__dirname, '..');

export const paths = {
  root: projectRoot,
  client: resolve(projectRoot, 'client'),
  server: resolve(projectRoot, 'server'),
  public: resolve(projectRoot, 'dist', 'public'),
  db: resolve(projectRoot, 'db'),
} as const;

// Helper function to get dirname in ES modules
export function getDirname(importMetaUrl: string) {
  return dirname(fileURLToPath(importMetaUrl));
}

export default paths;
