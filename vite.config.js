import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { tmpdir } from 'os';
import { devLogger } from '@meituan-nocode/vite-plugin-dev-logger';
import { devHtmlTransformer, prodHtmlTransformer } from '@meituan-nocode/vite-plugin-nocode-html-transformer';
import react from '@vitejs/plugin-react';

const isProdEnv = process.env.NODE_ENV === 'production';
// 规范化 base，开发用'/'，生产按变量组装且保证以'/'开头和结尾
const buildBase = () => {
  if (!isProdEnv) return '/';
  const pub = (process.env.PUBLIC_PATH || '').replace(/\/*$/,'');
  const chat = (process.env.CHAT_VARIABLE || '').replace(/^\/*|\/*$/g,'');
  if (!pub || !chat) return '/';
  return `/${pub}/${chat}/`.replace(/\/+/, '/');
};
const PUBLIC_PATH = buildBase();
const OUT_DIR = isProdEnv && process.env.CHAT_VARIABLE ? `build/${process.env.CHAT_VARIABLE}` : 'build';
const PLUGINS = isProdEnv ? [
  react(),
  prodHtmlTransformer(process.env.CHAT_VARIABLE)
] : [
  devLogger({
    dirname: resolve(tmpdir(), '.nocode-dev-logs'),
    maxFiles: '3d',
  }),
  react(),
  devHtmlTransformer(process.env.CHAT_VARIABLE),
];

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '::',
    port: '8080',
    hmr: {
      overlay: false
    },
    proxy: {
      '/proxy-groq': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy-groq/, '/openai'),
      }
    }
  },
  plugins: PLUGINS,
  base: PUBLIC_PATH,
  build: {
    outDir: OUT_DIR
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url)),
      },
      {
        find: 'lib',
        replacement: resolve(__dirname, 'lib'),
      },
    ],
  },
});