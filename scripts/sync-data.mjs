import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SOURCE_ORIGIN,
  parseAppsCatalog,
  parseVpsPage,
  parseAirportsPage,
} from '../shared/parsers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/data');
const USER_AGENT = 'Mozilla/5.0 (compatible; NetHubSync/1.0; +https://nethub.best)';

async function fetchHtml(routePath, retries = 2) {
  const url = `${SOURCE_ORIGIN}${routePath}`;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function dedupeById(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function collectFacets(apps, vps, airports) {
  const platformCount = new Map();
  const coreCount = new Map();
  const sourceCount = new Map();
  const typeCount = new Map();

  for (const app of apps) {
    typeCount.set(app.type, (typeCount.get(app.type) || 0) + 1);
    if (app.core) coreCount.set(app.core, (coreCount.get(app.core) || 0) + 1);
    if (app.sourceStatus) sourceCount.set(app.sourceStatus, (sourceCount.get(app.sourceStatus) || 0) + 1);
    for (const p of app.platforms || []) {
      platformCount.set(p, (platformCount.get(p) || 0) + 1);
    }
  }

  const providerCount = new Map();
  const periodCount = new Map();
  for (const item of vps) {
    if (item.provider) providerCount.set(item.provider, (providerCount.get(item.provider) || 0) + 1);
    if (item.period) periodCount.set(item.period, (periodCount.get(item.period) || 0) + 1);
  }

  const sortEntries = (map) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

  return {
    appTypes: Object.fromEntries(typeCount.entries()),
    platforms: sortEntries(platformCount),
    cores: sortEntries(coreCount).slice(0, 16),
    sources: sortEntries(sourceCount),
    vpsProviders: sortEntries(providerCount),
    vpsPeriods: sortEntries(periodCount),
    airportCount: airports.length,
  };
}

async function main() {
  const startedAt = Date.now();
  console.log(`[nethub-sync] Starting data sync from ${SOURCE_ORIGIN}...`);

  await mkdir(OUT_DIR, { recursive: true });

  // 1. Fetch Apps catalog (homepage)
  const homeHtml = await fetchHtml('/');
  const apps = dedupeById(parseAppsCatalog(homeHtml));
  console.log(`[nethub-sync] Parsed ${apps.length} apps.`);

  // 2. Fetch VPS pages
  const vpsFirstHtml = await fetchHtml('/vps');
  const vpsFirst = parseVpsPage(vpsFirstHtml);
  const vpsPages = [];
  for (let p = 2; p <= vpsFirst.totalPages; p++) vpsPages.push(p);

  const vpsRest = await mapPool(vpsPages, 4, async (page) => {
    const html = await fetchHtml(`/vps/page/${page}`);
    return parseVpsPage(html).items;
  });
  const vps = dedupeById([...vpsFirst.items, ...vpsRest.flat()]);
  console.log(`[nethub-sync] Parsed ${vps.length} VPS plans across ${vpsFirst.totalPages} pages.`);

  // 3. Fetch Airports pages
  const airportsFirstHtml = await fetchHtml('/jichang');
  const airportsFirst = parseAirportsPage(airportsFirstHtml);
  const airportPages = [];
  for (let p = 2; p <= airportsFirst.totalPages; p++) airportPages.push(p);

  const airportsRest = await mapPool(airportPages, 4, async (page) => {
    const html = await fetchHtml(`/jichang/page/${page}`);
    return parseAirportsPage(html).items;
  });
  const airports = dedupeById([...airportsFirst.items, ...airportsRest.flat()]);
  console.log(`[nethub-sync] Parsed ${airports.length} airports across ${airportsFirst.totalPages} pages.`);

  const meta = {
    site: 'nethub.best',
    source: SOURCE_ORIGIN,
    syncedAt: new Date().toISOString(),
    counts: {
      apps: apps.length,
      vps: vps.length,
      airports: airports.length,
    },
    facets: collectFacets(apps, vps, airports),
  };

  await Promise.all([
    writeFile(path.join(OUT_DIR, 'apps.json'), JSON.stringify(apps), 'utf-8'),
    writeFile(path.join(OUT_DIR, 'vps.json'), JSON.stringify(vps), 'utf-8'),
    writeFile(path.join(OUT_DIR, 'airports.json'), JSON.stringify(airports), 'utf-8'),
    writeFile(path.join(OUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8'),
  ]);

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[nethub-sync] Completed in ${elapsed}s -> public/data/*.json`);
}

main().catch((err) => {
  console.error('[nethub-sync] Failed:', err);
  process.exit(1);
});
