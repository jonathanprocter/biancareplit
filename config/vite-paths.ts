import { resolve } from 'path';
import { getDirname } from './paths';

// Get current file's directory
const __dirname = getDirname(import.meta.url);
const projectRoot = resolve(__dirname, '..');

// Export path configuration for Vite
export const vitePaths = {
  root: projectRoot,
  outDir: resolve(projectRoot, 'dist', 'public'),
  client: {
    root: resolve(projectRoot, 'client'),
    src: resolve(projectRoot, 'client', 'src'),
    public: resolve(projectRoot, 'client', 'public'),
    assets: resolve(projectRoot, 'client', 'assets'),
    components: resolve(projectRoot, 'client', 'src', 'components'),
    pages: resolve(projectRoot, 'client', 'src', 'pages'),
    hooks: resolve(projectRoot, 'client', 'src', 'hooks'),
    styles: resolve(projectRoot, 'client', 'src', 'styles'),
    utils: resolve(projectRoot, 'client', 'src', 'utils'),
    index: resolve(projectRoot, 'client', 'index.html')
  },
  server: {
    root: resolve(projectRoot, 'server'),
    routes: resolve(projectRoot, 'server', 'routes'),
    middleware: resolve(projectRoot, 'server', 'middleware'),
    utils: resolve(projectRoot, 'server', 'utils')
  },
  db: resolve(projectRoot, 'db'),
  config: __dirname,
  aliases: {
    '@': resolve(projectRoot, 'client', 'src'),
    '@db': resolve(projectRoot, 'db'),
    '@server': resolve(projectRoot, 'server'),
    '@config': __dirname
  }
} as const;

export default vitePaths;