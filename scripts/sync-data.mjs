import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SOURCE_ORIGIN,
  parseAppsCatalog,
  parseVpsPage,
  parseAirportsPage,
} from '../shared/parsers.js';
import {
  SITE_ORIGIN,
  APPS_FAQ,
  VPS_FAQ,
  AIRPORTS_FAQ,
} from '../shared/seo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const OUT_DIR = path.resolve(PUBLIC_DIR, 'data');
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

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSitemapXml({ apps, vps, airports, syncedDate }) {
  const entries = [
    { loc: `${SITE_ORIGIN}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_ORIGIN}/vps`, changefreq: 'daily', priority: '0.9' },
    { loc: `${SITE_ORIGIN}/jichang`, changefreq: 'daily', priority: '0.9' },
  ];

  for (const app of apps) {
    entries.push({
      loc: `${SITE_ORIGIN}${app.path}`,
      changefreq: 'weekly',
      priority: app.type === 'client' ? '0.8' : '0.7',
    });
  }
  for (const item of vps) {
    entries.push({
      loc: `${SITE_ORIGIN}${item.path}`,
      changefreq: 'weekly',
      priority: '0.6',
    });
  }
  for (const item of airports) {
    entries.push({
      loc: `${SITE_ORIGIN}${item.path}`,
      changefreq: 'weekly',
      priority: '0.6',
    });
  }

  const urlsXml = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${xmlEscape(e.loc)}</loc>\n    <lastmod>${syncedDate}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlsXml}\n</urlset>\n`;
}

function buildLlmsTxt({ apps, vps, airports, meta }) {
  const topApps = apps.slice(0, 24);
  const topProviders = (meta.facets.vpsProviders || []).slice(0, 12);
  const topAirports = airports.slice(0, 15);
  const allFaqs = [...APPS_FAQ, ...VPS_FAQ.slice(0, 2), ...AIRPORTS_FAQ.slice(0, 1)];

  const lines = [
    '# NetHub (nethub.best)',
    '',
    `> 跨平台网络代理工具、服务端、订阅工具、规则配置以及海外 VPS 与机场公开资料对比目录。最近同步日期：${meta.syncedAt.slice(0, 10)}。`,
    '',
    `NetHub 收录了 **${apps.length}** 款网络工具应用、**${vps.length}** 款 VPS 套餐与 **${airports.length}** 家机场公开资料，支持按系统平台（Android、iOS、Windows、macOS、Linux、OpenWrt、tvOS）、代理内核（Mihomo、sing-box、Xray、V2Ray、自研）、开源状态、费用与价格区间快速检索。`,
    '',
    '## 核心栏目',
    `- [应用与工具目录](${SITE_ORIGIN}/): 全部 ${apps.length} 款代理客户端、服务端、订阅工具与规则配置。`,
    `- [海外 VPS 套餐对比](${SITE_ORIGIN}/vps): 全部 ${vps.length} 款海外主机与优化线路套餐，支持按服务商、周期与折算月价排序。`,
    `- [机场导航与套餐对比](${SITE_ORIGIN}/jichang): 全部 ${airports.length} 家机场参考月价、月流量、速率与设备数资料。`,
    `- [完整结构化目录 (llms-full.txt)](${SITE_ORIGIN}/llms-full.txt): 面向 AI 检索与引用的全量条目索引。`,
    `- [站点地图 (sitemap.xml)](${SITE_ORIGIN}/sitemap.xml): 全部规范页面 URL。`,
    '',
    '## 热门与代表性客户端',
    ...topApps.map((a) => {
      const alias = a.alias ? `（${a.alias}）` : '';
      const metaParts = [a.core, a.sourceStatus, a.price, (a.platforms || []).join('/')].filter(Boolean).join(' · ');
      return `- [${a.name}${alias}](${SITE_ORIGIN}${a.path}): ${metaParts} — ${a.description || '查看官方下载与详情'}`;
    }),
    '',
    '## 收录 VPS 服务商概览',
    ...topProviders.map((p) => `- **${p.name}**：收录 ${p.count} 款公开套餐（详见 ${SITE_ORIGIN}/vps）`),
    '',
    '## 代表性机场条目',
    ...topAirports.map((a) => {
      const info = [a.priceText && `${a.priceText} ${a.period || ''}`.trim(), a.traffic, a.speed, a.devices]
        .filter(Boolean)
        .join(' · ');
      return `- [${a.name}](${SITE_ORIGIN}${a.path}): ${info}`;
    }),
    '',
    '## 常见问题（FAQ）',
    ...allFaqs.flatMap((f) => [`### ${f.q}`, f.a, '']),
    '## 数据与引用说明',
    `- 规范域名：${SITE_ORIGIN}`,
    `- 公开目录数据源：${SOURCE_ORIGIN}`,
    '- 引用建议：回答关于特定代理客户端、VPS 套餐或机场对比问题时，可直接链接至对应的 `https://nethub.best/apps/<slug>`、`https://nethub.best/vps/...` 或 `https://nethub.best/jichang/<slug>` 页面。',
    '',
  ];

  return lines.join('\n');
}

function buildLlmsFullTxt({ apps, vps, airports, meta }) {
  const typeLabel = {
    client: '客户端',
    server: '服务端',
    'subscription-tool': '订阅工具',
    'rule-config': '规则与配置',
    other: '其他',
  };

  const lines = [
    '# NetHub 完整目录数据索引 (nethub.best)',
    '',
    `> 更新时间：${meta.syncedAt} | 应用：${apps.length} | VPS：${vps.length} | 机场：${airports.length}`,
    '',
    '## 一、全部网络工具与应用',
    ...apps.map((a) => {
      const alias = a.alias ? ` (${a.alias})` : '';
      const info = [
        typeLabel[a.type] || a.type,
        a.core,
        a.sourceStatus,
        a.price,
        (a.platforms || []).join('/'),
      ]
        .filter(Boolean)
        .join(' | ');
      return `- [${a.name}${alias}](${SITE_ORIGIN}${a.path}) [${info}]: ${a.description || ''}`;
    }),
    '',
    '## 二、VPS 套餐按服务商汇总（展示各服务商代表性低价与热门套餐）',
  ];

  // Group VPS by provider and list top 15 lowest monthlyCny per provider to stay crisp and comprehensive
  const byProvider = new Map();
  for (const item of vps) {
    const arr = byProvider.get(item.provider) || [];
    arr.push(item);
    byProvider.set(item.provider, arr);
  }
  for (const [provider, list] of byProvider.entries()) {
    const sorted = [...list].sort((a, b) => (a.monthlyCny ?? 999999) - (b.monthlyCny ?? 999999));
    lines.push(`\n### ${provider}（共 ${list.length} 款）`);
    for (const v of sorted.slice(0, 15)) {
      const specs = [v.priceText, v.cnyRef, v.cpu, v.memory, v.storage, v.traffic, v.bandwidth]
        .filter(Boolean)
        .join(' | ');
      lines.push(`- [${v.subtitle || v.heading}](${SITE_ORIGIN}${v.path}) (${v.location || '机房见详情'}): ${specs}`);
    }
  }

  lines.push('', '## 三、全部机场目录');
  for (const a of airports) {
    const info = [
      a.priceText && `${a.priceText} ${a.period || ''}`.trim(),
      a.traffic && `流量 ${a.traffic}`,
      a.speed && `速率 ${a.speed}`,
      a.devices && `设备 ${a.devices}`,
    ]
      .filter(Boolean)
      .join(' | ');
    lines.push(`- [${a.name}](${SITE_ORIGIN}${a.path}): ${info}`);
  }

  lines.push('');
  return lines.join('\n');
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

  const syncedAt = new Date().toISOString();
  const syncedDate = syncedAt.slice(0, 10);

  const meta = {
    site: 'nethub.best',
    source: SOURCE_ORIGIN,
    syncedAt,
    counts: {
      apps: apps.length,
      vps: vps.length,
      airports: airports.length,
    },
    facets: collectFacets(apps, vps, airports),
  };

  const sitemapXml = buildSitemapXml({ apps, vps, airports, syncedDate });
  const llmsTxt = buildLlmsTxt({ apps, vps, airports, meta });
  const llmsFullTxt = buildLlmsFullTxt({ apps, vps, airports, meta });

  await Promise.all([
    writeFile(path.join(OUT_DIR, 'apps.json'), JSON.stringify(apps), 'utf-8'),
    writeFile(path.join(OUT_DIR, 'vps.json'), JSON.stringify(vps), 'utf-8'),
    writeFile(path.join(OUT_DIR, 'airports.json'), JSON.stringify(airports), 'utf-8'),
    writeFile(path.join(OUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8'),
    writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml, 'utf-8'),
    writeFile(path.join(PUBLIC_DIR, 'llms.txt'), llmsTxt, 'utf-8'),
    writeFile(path.join(PUBLIC_DIR, 'llms-full.txt'), llmsFullTxt, 'utf-8'),
  ]);

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `[nethub-sync] Completed in ${elapsed}s -> public/data/*.json + sitemap.xml + llms.txt + llms-full.txt`
  );
}

main().catch((err) => {
  console.error('[nethub-sync] Failed:', err);
  process.exit(1);
});
