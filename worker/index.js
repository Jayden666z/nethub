import {
  SOURCE_ORIGIN,
  isAllowedDetailPath,
  parseDetailByPath,
} from '../shared/parsers.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
};

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

  const upstreamUrl = `${SOURCE_ORIGIN}${rawPath}`;

  try {
    const res = await fetch(upstreamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NetHubEdge/1.0; +https://nethub.best)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      cf: {
        cacheTtl: 3600,
        cacheEverything: true,
      },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream returned ${res.status}` }),
        { status: res.status === 404 ? 404 : 502, headers: JSON_HEADERS }
      );
    }

    const html = await res.text();
    const detail = parseDetailByPath(html, rawPath);

    return new Response(JSON.stringify(detail), {
      status: 200,
      headers: {
        ...JSON_HEADERS,
        'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/detail') {
      return handleDetailRequest(request);
    }

    if (env?.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};
