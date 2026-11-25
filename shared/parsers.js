import { parse } from 'node-html-parser';

export const SOURCE_ORIGIN = 'https://huarun.win';

function cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

export function resolveSourceUrl(href) {
  if (!href) return '';
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('//')) return `https:${href}`;
  if (href.startsWith('/')) return `${SOURCE_ORIGIN}${href}`;
  return `${SOURCE_ORIGIN}/${href}`;
}

function parseFirstNumber(text) {
  if (!text) return null;
  const cleaned = text.replace(/,/g, '');
  const m = cleaned.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function parseStorageOrTrafficGb(text) {
  if (!text) return null;
  const cleaned = text.replace(/,/g, '').trim();
  if (/无限|不限|unmetered|unlimited/i.test(cleaned)) return 999999;
  const m = cleaned.match(/(\d+(?:\.\d+)?)\s*(TB|TiB|GB|GiB|MB|MiB)/i);
  if (!m) return parseFirstNumber(cleaned);
  const val = Number(m[1]);
  const unit = m[2].toUpperCase();
  if (unit.startsWith('T')) return Math.round(val * 1024 * 100) / 100;
  if (unit.startsWith('M')) return Math.round((val / 1024) * 1000) / 1000;
  return val;
}

const PLATFORM_NORMALIZE = {
  Win: 'Windows',
  Mac: 'macOS',
};

function normalizePlatformLabel(raw) {
  const trimmed = cleanText(raw);
  if (!trimmed) return '';
  if (PLATFORM_NORMALIZE[trimmed]) return PLATFORM_NORMALIZE[trimmed];
  if (trimmed.length > 18) {
    if (/linux/i.test(trimmed)) return 'Linux';
    if (/docker/i.test(trimmed)) return 'Docker';
    if (/openwrt/i.test(trimmed)) return 'OpenWrt';
    if (/windows/i.test(trimmed)) return 'Windows';
    if (/macos|mac/i.test(trimmed)) return 'macOS';
    return trimmed.slice(0, 14);
  }
  return trimmed;
}

function periodToMonths(period) {
  if (!period) return 1;
  if (period.includes('年')) return 12;
  const m = period.match(/(\d+)\s*个?月/);
  if (m) return Math.max(1, Number(m[1]));
  if (period.includes('季')) return 3;
  if (period.includes('半年')) return 6;
  return 1;
}

/**
 * Parse the main apps catalog HTML from https://huarun.win/
 */
export function parseAppsCatalog(html) {
  const root = parse(html);
  const cards = root.querySelectorAll('article.app-card');
  const seen = new Set();
  const items = [];

  for (const card of cards) {
    const link = card.querySelector('a.app-card-detail') || card.querySelector('a[href]');
    const path = link?.getAttribute('href')?.trim() || '';
    if (!path || seen.has(path)) continue;
    seen.add(path);

    const type = card.getAttribute('data-application-type') || inferTypeFromPath(path);
    const name = cleanText(card.querySelector('h2')?.textContent || '');
    if (!name) continue;

    const alias = cleanText(card.querySelector('.alias')?.textContent || '');
    const description = cleanText(card.querySelector('.description')?.textContent || '');
    const imgSrc = card.querySelector('.app-icon img')?.getAttribute('src') || '';
    const icon = resolveSourceUrl(imgSrc);

    const featureTags = card
      .querySelectorAll('.badges .feature-tag')
      .map((el) => cleanText(el.textContent))
      .filter(Boolean);

    const core = cleanText(card.querySelector('.badges .core')?.textContent || '');
    const sourceEl = card.querySelector('.badges .source');
    const sourceStatus = cleanText(sourceEl?.textContent || '');
    const priceEl = card.querySelector('.badges .price');
    const price = cleanText(priceEl?.textContent || '');
    const isPaid = Boolean(
      priceEl?.classNames?.includes('paid') ||
        (price && !/免费|free/i.test(price))
    );

    const platforms = [
      ...new Set(
        card
          .querySelectorAll('.platform-pills .platform-mini-pill')
          .map((el) => normalizePlatformLabel(el.textContent))
          .filter(Boolean)
      ),
    ];

    const slug = path.split('/').filter(Boolean).pop() || '';

    items.push({
      id: path,
      slug,
      path,
      type,
      name,
      alias,
      icon,
      description,
      featureTags,
      core,
      sourceStatus,
      price,
      isPaid,
      platforms,
    });
  }

  return items;
}

function inferTypeFromPath(path) {
  if (path.startsWith('/servers/')) return 'server';
  if (path.startsWith('/subscription-tools/')) return 'subscription-tool';
  if (path.startsWith('/rules/')) return 'rule-config';
  return 'client';
}

/**
 * Parse a single VPS catalog page (/vps or /vps/page/N)
 */
export function parseVpsPage(html) {
  const root = parse(html);
  const cards = root.querySelectorAll('article.vps-card');
  const items = [];

  for (const card of cards) {
    if (card.classNames.includes('airport-entry')) continue;

    const headingLink = card.querySelector('.vps-card-heading h2 a');
    const path = headingLink?.getAttribute('href')?.trim() || '';
    const heading = cleanText(headingLink?.textContent || '');
    if (!path || !heading) continue;

    const parts = heading.split('·').map((s) => s.trim());
    const provider = parts[0] || heading;
    const location = parts.slice(1).join(' · ') || '';
    const subtitle = cleanText(card.querySelector('.vps-card-subtitle')?.textContent || '');

    const currency = cleanText(card.querySelector('.vps-price-currency')?.textContent || '');
    const priceStrong = cleanText(card.querySelector('.vps-card-price strong')?.textContent || '');
    const periodRaw = cleanText(card.querySelector('.vps-price-period')?.textContent || '');
    const period = periodRaw.replace(/^\/\s*/, '').trim();
    const priceText = cleanText(card.querySelector('.vps-card-price')?.textContent || '');
    const priceAmount = parseFirstNumber(priceStrong || priceText);

    const cnyRef = cleanText(card.querySelector('.vps-reference-price')?.textContent || '');
    const cnyAmount = parseFirstNumber(cnyRef);
    const monthlyText = cleanText(card.querySelector('.vps-monthly')?.textContent || '');
    const monthlyUsd = parseFirstNumber(monthlyText);
    const months = periodToMonths(period);
    const monthlyCny =
      cnyAmount != null
        ? Math.round((cnyAmount / months) * 100) / 100
        : priceAmount != null
          ? Math.round(((currency === 'CNY' ? priceAmount : priceAmount * 7.1) / months) * 100) / 100
          : null;

    const specMap = {};
    for (const dl of card.querySelectorAll('dl.vps-card-specs > div, dl.vps-card-transfer > div')) {
      const k = cleanText(dl.querySelector('dt')?.textContent || '');
      const v = cleanText(dl.querySelector('dd')?.textContent || '');
      if (k && v) specMap[k] = v;
    }

    const cpu = specMap['CPU'] || '';
    const memory = specMap['内存'] || '';
    const storage = specMap['SSD'] || specMap['硬盘'] || specMap['NVMe'] || specMap['存储'] || '';
    const traffic = specMap['流量额度'] || specMap['流量'] || '';
    const bandwidth = specMap['端口带宽'] || specMap['带宽'] || '';

    const purchaseHref = card.querySelector('a.vps-card-purchase')?.getAttribute('href') || '';
    const purchaseUrl = resolveSourceUrl(purchaseHref);

    items.push({
      id: path,
      path,
      provider,
      location,
      heading,
      subtitle,
      currency,
      priceAmount,
      priceText,
      period,
      cnyRef,
      cnyAmount,
      monthlyText,
      monthlyUsd,
      monthlyCny,
      cpu,
      cpuCores: parseFirstNumber(cpu),
      memory,
      memoryGb: parseStorageOrTrafficGb(memory),
      storage,
      storageGb: parseStorageOrTrafficGb(storage),
      traffic,
      trafficGb: parseStorageOrTrafficGb(traffic),
      bandwidth,
      purchaseUrl,
    });
  }

  let totalPages = 1;
  for (const a of root.querySelectorAll('.vps-pagination a[href*="/vps/page/"]')) {
    const m = a.getAttribute('href')?.match(/\/vps\/page\/(\d+)/);
    if (m) totalPages = Math.max(totalPages, Number(m[1]));
  }

  return { items, totalPages };
}

/**
 * Parse a single Airports catalog page (/jichang or /jichang/page/N)
 */
export function parseAirportsPage(html) {
  const root = parse(html);
  const cards = root.querySelectorAll('article.airport-entry');
  const items = [];

  for (const card of cards) {
    const link = card.querySelector('a.vps-card-link');
    const path = link?.getAttribute('href')?.trim() || '';
    const name = cleanText(
      card.querySelector('.airport-entry-name')?.textContent || link?.textContent || ''
    );
    if (!path || !name) continue;

    const imgSrc = card.querySelector('.airport-icon img')?.getAttribute('src') || '';
    const icon = resolveSourceUrl(imgSrc);

    const specMap = {};
    for (const div of card.querySelectorAll('.airport-entry-specs > div')) {
      const k = cleanText(div.querySelector('dt')?.textContent || '');
      const v = cleanText(div.querySelector('dd')?.textContent || '');
      if (k && v) specMap[k] = v;
    }

    const traffic = specMap['对应月流量'] || specMap['流量'] || cleanText(card.querySelector('.airport-entry-traffic')?.textContent || '');
    const speed = specMap['速度'] || cleanText(card.querySelector('.airport-entry-speed')?.textContent || '');
    const devices = specMap['设备数'] || cleanText(card.querySelector('.airport-entry-devices')?.textContent || '');

    const currency = cleanText(card.querySelector('.airport-product-currency')?.textContent || '');
    const amountStrong = cleanText(card.querySelector('.airport-product-amount strong')?.textContent || '');
    const period = cleanText(card.querySelector('.airport-product-period')?.textContent || '');
    const priceAmount = parseFirstNumber(amountStrong);
    const priceText = amountStrong ? `${currency}${amountStrong}` : cleanText(card.querySelector('.airport-entry-price')?.textContent || '');

    const tags = card
      .querySelectorAll('.airport-entry-tags span, .airport-tag, .feature-tag')
      .map((el) => cleanText(el.textContent))
      .filter(Boolean);

    const purchaseHref = card.querySelector('a.airport-purchase-link')?.getAttribute('href') || '';
    const purchaseUrl = resolveSourceUrl(purchaseHref);
    const slug = path.split('/').filter(Boolean).pop() || '';

    items.push({
      id: path,
      slug,
      path,
      name,
      icon,
      traffic,
      trafficGb: parseStorageOrTrafficGb(traffic),
      speed,
      devices,
      currency,
      priceAmount,
      priceText,
      period,
      tags,
      purchaseUrl,
    });
  }

  let totalPages = 1;
  const paginationText = cleanText(root.querySelector('.airport-pagination')?.textContent || '');
  const pageMatch = paginationText.match(/\/\s*(\d+)\s*页/);
  if (pageMatch) {
    totalPages = Number(pageMatch[1]);
  }
  for (const a of root.querySelectorAll('.airport-pagination a[href*="/jichang/page/"]')) {
    const m = a.getAttribute('href')?.match(/\/jichang\/page\/(\d+)/);
    if (m) totalPages = Math.max(totalPages, Number(m[1]));
  }

  return { items, totalPages };
}

/**
 * Parse a live detail page for Apps / Servers / Subscription Tools / Rules
 */
export function parseAppDetail(html, path) {
  const root = parse(html);

  let ldApp = null;
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(script.textContent || '{}');
      if (parsed['@type'] === 'SoftwareApplication' || parsed.softwareVersion || parsed.downloadUrl) {
        ldApp = parsed;
        break;
      }
    } catch {
      // ignore malformed json-ld
    }
  }

  const h1 = cleanText(root.querySelector('main h1')?.textContent || ldApp?.name || '');
  const alias = cleanText(root.querySelector('.detail-alias, .alias')?.textContent || '');
  const iconSrc =
    root.querySelector('.detail-header .app-icon img, .detail-hero img, .app-icon img')?.getAttribute('src') ||
    ldApp?.image ||
    '';
  const icon = resolveSourceUrl(iconSrc);

  const summary = cleanText(
    root.querySelector('.detail-summary p, .detail-lead, .detail-intro')?.textContent ||
      ldApp?.description ||
      root.querySelector('meta[name="description"]')?.getAttribute('content') ||
      ''
  );

  const version = ldApp?.softwareVersion || cleanText(root.querySelector('.detail-version')?.textContent || '');

  // Notice / advisory warning
  const noticeEl = root.querySelector('aside.detail-notice');
  let notice = null;
  if (noticeEl) {
    const noticeTitle = cleanText(noticeEl.querySelector('h2, h3, strong')?.textContent || '特别说明');
    const noticeParagraphs = noticeEl
      .querySelectorAll('p')
      .map((p) => cleanText(p.textContent))
      .filter(Boolean);
    const noticeBody = noticeParagraphs.length > 0 ? noticeParagraphs.join('\n') : cleanText(noticeEl.textContent);
    if (noticeBody) {
      notice = { title: noticeTitle, body: noticeBody };
    }
  }

  // Highlights (deduplicated by label)
  const highlights = [];
  const seenHighlights = new Set();
  for (const item of root.querySelectorAll('.detail-highlight-item, .detail-highlights > div')) {
    const label = cleanText(item.querySelector('.detail-highlight-label, dt')?.textContent || '');
    const value = cleanText(item.querySelector('.detail-highlight-value, dd')?.textContent || '');
    if (label && value && !seenHighlights.has(label)) {
      seenHighlights.add(label);
      highlights.push({ label, value });
    }
  }

  // Official links (primary project, website, store, community channels)
  const officialLinks = [];
  const seenLinks = new Set();
  for (const a of root.querySelectorAll('.detail-official-links a, .detail-community-links a, .detail-actions a, .detail-github-link, .detail-channel-list > a, .detail-header a[target="_blank"]')) {
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.includes('huarun.win') || href.includes('hunrunwin') || href.includes('huarunying')) continue;
    if (a.classNames.includes('detail-download-option') || a.classNames.includes('detail-fact-link')) continue;
    const resolved = resolveSourceUrl(href);
    const label = cleanText(a.textContent);
    if (!label || /查看依据|实现$/i.test(label) || seenLinks.has(resolved)) continue;
    seenLinks.add(resolved);
    officialLinks.push({ label, href: resolved });
    if (officialLinks.length >= 8) break;
  }
  if (officialLinks.length === 0 && ldApp?.sameAs) {
    const sameAs = Array.isArray(ldApp.sameAs) ? ldApp.sameAs : [ldApp.sameAs];
    for (const url of sameAs) {
      if (url && !seenLinks.has(url)) {
        seenLinks.add(url);
        officialLinks.push({ label: /github\.com/i.test(url) ? 'GitHub 仓库' : '官方主页', href: url });
      }
    }
  }

  // Download options
  const downloads = [];
  const seenDl = new Set();
  for (const a of root.querySelectorAll('a.detail-download-option')) {
    const href = resolveSourceUrl(a.getAttribute('href') || '');
    if (!href || seenDl.has(href)) continue;
    seenDl.add(href);
    const platform = a.getAttribute('data-platform') || a.getAttribute('data-channel-platform') || '通用';
    const arch = a.getAttribute('data-arch') || '';
    const kind = a.getAttribute('data-kind') || '';
    const label = cleanText(a.querySelector('span')?.textContent || a.textContent || '');
    const meta = cleanText(a.querySelector('small')?.textContent || '');
    downloads.push({ platform, arch, kind, label, meta, href });
  }

  // Screenshots
  const screenshots = [];
  const seenShots = new Set();
  for (const img of root.querySelectorAll('.detail-screenshots img')) {
    const src = resolveSourceUrl(img.getAttribute('src') || '');
    if (!src || seenShots.has(src)) continue;
    seenShots.add(src);
    screenshots.push({
      src,
      alt: img.getAttribute('alt') || `${h1} 界面截图`,
    });
  }

  // Description paragraphs
  const descriptionParagraphs = [];
  const descSection = root.querySelector('.detail-description, .detail-app-guide-body');
  if (descSection) {
    for (const p of descSection.querySelectorAll('p, li')) {
      const t = cleanText(p.textContent);
      if (t && t.length > 4 && !t.includes('华润赢')) {
        descriptionParagraphs.push(t);
      }
    }
  }

  // Specs table
  const specs = [];
  for (const row of root.querySelectorAll('.detail-specs-row')) {
    const labelDesktop = row.querySelector('.detail-specs-label-desktop');
    const label = cleanText(labelDesktop?.textContent || row.querySelector('.detail-specs-label')?.textContent || '');
    const valueEl = row.querySelector('.detail-specs-value');
    const summarySpan = valueEl?.querySelector('.detail-specs-summary');
    let value = '';
    if (summarySpan) {
      value = cleanText(summarySpan.textContent);
    } else if (valueEl?.classNames?.includes('detail-platform-links')) {
      value = valueEl
        .querySelectorAll('a')
        .map((a) => cleanText(a.textContent))
        .filter(Boolean)
        .join(' / ');
    } else {
      value = cleanText(valueEl?.textContent || '');
    }
    if (label && value) {
      specs.push({ label, value });
    }
  }

  // Changelog entries
  const changelog = [];
  for (const item of root.querySelectorAll('.detail-changelog-item, .changelog-entry')) {
    const title = cleanText(item.querySelector('h3, strong, .changelog-version')?.textContent || '');
    const date = cleanText(item.querySelector('time, .changelog-date')?.textContent || '');
    const notes = cleanText(item.querySelector('p, ul, .changelog-body')?.textContent || '');
    if (title || notes) {
      changelog.push({ title, date, notes });
    }
  }

  return {
    kind: 'app',
    path,
    sourceUrl: `${SOURCE_ORIGIN}${path}`,
    name: h1,
    alias,
    icon,
    summary,
    version,
    notice,
    highlights,
    officialLinks,
    downloads,
    screenshots,
    descriptionParagraphs: descriptionParagraphs.slice(0, 16),
    specs,
    changelog: changelog.slice(0, 8),
  };
}

/**
 * Parse a live VPS detail page (/vps/...)
 */
export function parseVpsDetail(html, path) {
  const root = parse(html);

  let provider = '';
  let providerUrl = '';
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(script.textContent || '{}');
      if (parsed?.about?.provider?.name) {
        provider = parsed.about.provider.name;
        providerUrl = parsed.about.provider.url || '';
        break;
      }
    } catch {
      // ignore
    }
  }

  const title = cleanText(root.querySelector('h1#detail-title, main h1')?.textContent || '');
  const subtitle = cleanText(root.querySelector('.vps-detail-hero p')?.textContent || '');
  const availability = cleanText(root.querySelector('.vps-availability')?.textContent || '');

  const priceOptions = [];
  for (const opt of root.querySelectorAll('.vps-price-panel .vps-price-option')) {
    const price = cleanText(opt.querySelector('.vps-card-price')?.textContent || '');
    const ref = cleanText(opt.querySelector('.vps-reference-price')?.textContent || '');
    const monthly = cleanText(opt.querySelector('.vps-monthly')?.textContent || '');
    const buyHref = opt.querySelector('a[href]')?.getAttribute('href') || '';
    if (price) {
      priceOptions.push({
        price,
        ref,
        monthly,
        purchaseUrl: resolveSourceUrl(buyHref),
      });
    }
  }

  const purchaseHref =
    root.querySelector('.vps-price-panel a.vps-card-purchase, .vps-price-panel a[target="_blank"]')?.getAttribute('href') ||
    priceOptions[0]?.purchaseUrl ||
    '';
  const purchaseUrl = resolveSourceUrl(purchaseHref);

  const sections = [];
  for (const sec of root.querySelectorAll('.vps-detail-content section.vps-detail-section')) {
    const heading = cleanText(sec.querySelector('h2')?.textContent || '');
    if (!heading || heading.includes('关于这份目录') || heading.includes('同地区')) continue;

    const items = [];
    for (const div of sec.querySelectorAll('dl > div')) {
      const label = cleanText(div.querySelector('dt')?.textContent || '');
      const value = cleanText(div.querySelector('dd')?.textContent || '');
      if (label && value) items.push({ label, value });
    }

    const notes = [];
    for (const el of sec.querySelectorAll('p, li')) {
      const t = cleanText(el.textContent);
      if (t && !t.includes('华润赢')) notes.push(t);
    }

    if (items.length > 0 || notes.length > 0) {
      sections.push({ heading, items, notes: notes.slice(0, 12) });
    }
  }

  return {
    kind: 'vps',
    path,
    sourceUrl: `${SOURCE_ORIGIN}${path}`,
    title,
    subtitle,
    provider,
    providerUrl,
    availability,
    priceOptions,
    purchaseUrl,
    sections,
  };
}

/**
 * Parse a live Airport detail page (/jichang/...)
 */
export function parseAirportDetail(html, path) {
  const root = parse(html);

  let description = '';
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(script.textContent || '{}');
      if (parsed.description) {
        description = parsed.description;
        break;
      }
    } catch {
      // ignore
    }
  }

  const name = cleanText(root.querySelector('h1#detail-title, main h1')?.textContent || '');
  const iconSrc = root.querySelector('.airport-detail-hero img')?.getAttribute('src') || '';
  const icon = resolveSourceUrl(iconSrc);

  const contacts = [];
  const seenContacts = new Set();
  for (const a of root.querySelectorAll('.airport-contacts a[href]')) {
    const href = resolveSourceUrl(a.getAttribute('href') || '');
    const label = cleanText(a.textContent);
    if (!href || !label || seenContacts.has(href)) continue;
    seenContacts.add(href);
    contacts.push({ label, href });
  }

  const purchaseHref =
    root.querySelector('a.airport-purchase-link, a.airport-desktop-purchase, a[href*="/buy"]')?.getAttribute('href') || '';
  const purchaseUrl = resolveSourceUrl(purchaseHref);

  const plans = [];
  for (const card of root.querySelectorAll('.airport-plan-grid article.airport-product-card')) {
    const planName = cleanText(card.querySelector('.airport-product-name')?.textContent || '');
    const quotaVal = cleanText(card.querySelector('.airport-product-quota-value')?.textContent || '');
    const quotaUnit = cleanText(card.querySelector('.airport-product-quota-unit')?.textContent || '');
    const quota = [quotaVal, quotaUnit].filter(Boolean).join(' ');

    const specs = card
      .querySelectorAll('.airport-product-specs > span')
      .map((s) => cleanText(s.textContent).replace(/^(速度|设备数|倍率|限制)\s*[：:]\s*/, '$1：'))
      .filter(Boolean);

    const currency = cleanText(card.querySelector('.airport-product-currency')?.textContent || '');
    const amount = cleanText(card.querySelector('.airport-product-amount strong')?.textContent || '');
    const period = cleanText(card.querySelector('.airport-product-period')?.textContent || '');
    const price = amount ? `${currency}${amount}` : cleanText(card.querySelector('.airport-product-price')?.textContent || '');

    if (planName || price) {
      plans.push({
        name: planName,
        quota,
        specs,
        price,
        period,
      });
    }
  }

  return {
    kind: 'airport',
    path,
    sourceUrl: `${SOURCE_ORIGIN}${path}`,
    name,
    icon,
    summary: description,
    contacts,
    purchaseUrl,
    plans,
  };
}

export function isAllowedDetailPath(path) {
  if (typeof path !== 'string') return false;
  if (path.includes('..') || path.includes('?') || path.includes('#')) return false;
  return /^\/(apps|servers|subscription-tools|rules|vps|jichang)\/[a-zA-Z0-9._-]+(\/[a-zA-Z0-9._-]+)?$/.test(path);
}

export function parseDetailByPath(html, path) {
  if (path.startsWith('/vps/')) return parseVpsDetail(html, path);
  if (path.startsWith('/jichang/')) return parseAirportDetail(html, path);
  return parseAppDetail(html, path);
}
