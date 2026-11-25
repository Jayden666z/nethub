import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {
  SOURCE_ORIGIN,
  isAllowedDetailPath,
  parseDetailByPath,
} from './shared/parsers.js';

function localDetailApiPlugin() {
  return {
    name: 'nethub-local-detail-api',
    configureServer(server) {
      server.middlewares.use('/api/detail', async (req, res) => {
        try {
          const parsedUrl = new URL(req.url || '/', 'http://localhost');
          const rawPath = (parsedUrl.searchParams.get('path') || '').trim();
          if (!isAllowedDetailPath(rawPath)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Invalid detail path' }));
            return;
          }

          const upstream = await fetch(`${SOURCE_ORIGIN}${rawPath}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; NetHubDev/1.0; +https://nethub.best)',
              Accept: 'text/html,application/xhtml+xml',
              'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            },
          });

          if (!upstream.ok) {
            res.statusCode = upstream.status === 404 ? 404 : 502;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: `Upstream returned ${upstream.status}` }));
            return;
          }

          const html = await upstream.text();
          const detail = parseDetailByPath(html, rawPath);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=300');
          res.end(JSON.stringify(detail));
        } catch (err) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              error: 'Failed to fetch upstream detail',
              message: err instanceof Error ? err.message : String(err),
            })
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localDetailApiPlugin()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
