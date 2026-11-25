import {
  SOURCE_ORIGIN,
  isAllowedDetailPath,
  parseDetailByPath,
} from '../shared/parsers.js';
import {
  SITE_ORIGIN,
  buildRouteSeo,
  renderSeoHeadTags,
} from '../shared/seo.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
};

const CRAWLER_UA_RE =
  /bot|crawler|spider|slurp|GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-Web|PerplexityBot|Google-Extended|Applebot|Bytespider|Baiduspider|Yandex|DuckDuckBot|facebookexternalhit|Twitterbot|TelegramBot|Discordbot|Slackbot|WhatsApp/i;

const assetMemoryCache = new Map();

async function fetchAssetText(env, requestUrl, assetPath) {
  if (assetMemoryCache.has(assetPath)) {
    return assetMemoryCache.get(assetPath);
  }
  const url = new URL(assetPath, requestUrl);
  const res = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
  if (!res.ok) return null;
  const text = await res.text();
  assetMemoryCache.set(assetPath, text);
  return text;
}

async function fetchAssetJson(env, requestUrl, assetPath) {
  const key = `json:${assetPath}`;
  if (assetMemoryCache.has(key)) {
    return assetMemoryCache.get(key);
  }
  const text = await fetchAssetText(env, requestUrl, assetPath);
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    assetMemoryCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

async function fetchUpstreamDetail(rawPath, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${SOURCE_ORIGIN}${rawPath}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NetHubEdge/1.0; +https://nethub.best)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      cf: {
        cacheTtl: 3600,
        cacheEverything: true,
      },
      signal: controller.signal,
    });
    if (!res.ok) return { status: res.status, data: null };
    const html = await res.text();
    return { status: 200, data: parseDetailByPath(html, rawPath) };
  } finally {
    clearTimeout(timer);
  }
}

async function handleDetailRequest(request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  const url = new URL(request.url);
  const rawPath = (url.searchParams.get('path') || '').trim();

  if (!isAllowedDetailPath(rawPath)) {
    return new Response(JSON.stringify({ error: 'Invalid detail path' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  try {
    const result = await fetchUpstreamDetail(rawPath, 10000);
    if (!result.data) {
      return new Response(
        JSON.stringify({ error: `Upstream returned ${result.status}` }),
        { status: result.status === 404 ? 404 : 502, headers: JSON_HEADERS }
      );
    }

    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: {
        ...JSON_HEADERS,
        'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch upstream detail',
        message: err instanceof Error ? err.message : String(err),
      }),
      { status: 502, headers: JSON_HEADERS }
    );
  }
}

async function handleSeoHtmlPage(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const template = await fetchAssetText(env, request.url, '/index.html');
  if (!template) {
    return env.ASSETS.fetch(request);
  }

  const needApps =
    pathname === '/' ||
    /^\/(apps|servers|subscription-tools|rules)\//.test(pathname);
  const needVps = pathname === '/vps' || pathname.startsWith('/vps/');
  const needAirports = pathname === '/jichang' || pathname.startsWith('/jichang/');

  const [meta, apps, vps, airports] = await Promise.all([
    fetchAssetJson(env, request.url, '/data/meta.json'),
    needApps ? fetchAssetJson(env, request.url, '/data/apps.json') : null,
    needVps ? fetchAssetJson(env, request.url, '/data/vps.json') : null,
    needAirports ? fetchAssetJson(env, request.url, '/data/airports.json') : null,
  ]);

  // For crawlers & social preview bots visiting a detail URL, enrich with live parsed detail
  let detail = null;
  const ua = request.headers.get('User-Agent') || '';
  if (isAllowedDetailPath(pathname) && CRAWLER_UA_RE.test(ua)) {
    try {
      const res = await fetchUpstreamDetail(pathname, 3500);
      if (res.data) detail = res.data;
    } catch {
      // gracefully fall back to static catalog preview metadata
    }
  }

  const seo = buildRouteSeo({ pathname, meta, apps, vps, airports, detail });
  const headTags = renderSeoHeadTags(seo);

  let html = template.replace(
    /<!-- NETHUB_SEO_HEAD_START -->[\s\S]*?<!-- NETHUB_SEO_HEAD_END -->/,
    headTags
  );

  // Inject semantic HTML fallback for bots / no-JS clients (React replaces on mount)
  if (CRAWLER_UA_RE.test(ua) && seo.fallbackHtml) {
    html = html.replace('<!-- NETHUB_SSR_ROOT -->', seo.fallbackHtml);
  } else {
    html = html.replace('<!-- NETHUB_SSR_ROOT -->', '');
  }

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400',
      'Link': `<${SITE_ORIGIN}/llms.txt>; rel="alternate"; type="text/markdown"`,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Vary': 'User-Agent',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/detail') {
      return handleDetailRequest(request);
    }

    if (
      request.method === 'GET' &&
      !url.pathname.startsWith('/assets/') &&
      !url.pathname.startsWith('/data/') &&
      !/\.[a-zA-Z0-9]+$/.test(url.pathname) &&
      env?.ASSETS
    ) {
      return handleSeoHtmlPage(request, env);
    }

    if (env?.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};
