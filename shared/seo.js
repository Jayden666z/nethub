export const SITE_ORIGIN = 'https://nethub.best';
export const SITE_NAME = 'NetHub';
export const OG_IMAGE = `${SITE_ORIGIN}/og-cover.jpg`;

export const APPS_FAQ = [
  {
    q: 'NetHub 收录了哪些类型的网络工具？',
    a: 'NetHub (nethub.best) 收录跨平台代理客户端、服务端软件、订阅转换与管理工具，以及分流规则与配置项目，覆盖 Android、iOS、Windows、macOS、Linux、OpenWrt 与 tvOS 等主流系统。',
  },
  {
    q: 'Mihomo、sing-box 与 Xray 内核的客户端该如何选择？',
    a: 'Mihomo（原 Clash Meta）生态成熟、YAML 规则与订阅兼容性最广；sing-box 架构现代、多协议原生支持完整且内存占用低；Xray 专注 VLESS/REALITY 等协议的高性能实现。您可以在 NetHub 按“内核”与“平台”组合筛选适合自己设备的客户端。',
  },
  {
    q: '如何判断代理客户端是否免费且开源？',
    a: 'NetHub 在每个应用卡片与详情页中均清晰标注“代码状态”（开源、未公开、源码不完整等）与“费用”（免费、付费或含内购），您也可以直接在筛选栏一键过滤“开源”与“免费”项目，并前往官方 GitHub Releases 下载正版安装包。',
  },
  {
    q: 'NetHub 的应用、VPS 与机场目录数据多久更新一次？',
    a: 'NetHub 目录数据通过自动化脚本定期同步自公开目录 huarun.win，同时详情页通过 Cloudflare 边缘实时解析最新官方下载入口与公开套餐，并在页面底部标注最近同步时间。',
  },
];

export const VPS_FAQ = [
  {
    q: '挑选海外 VPS 套餐时应该重点对比哪些指标？',
    a: '建议优先对比折算月均价格、月流量配额、端口带宽、CPU 与内存规格以及机房线路特征（如 CN2 GIA、联通 9929、移动 CMIN2 等）。NetHub 支持一键按折算人民币月价、内存大小与月流量排序对比。',
  },
  {
    q: 'NetHub 上的 VPS 报价与官网不一致怎么办？',
    a: '不同服务商常有黑五促销或限时折扣，且外币汇率会每日波动。NetHub 展示的美元与人民币参考价来源于公开报价表，最终价格、库存与续费政策请以服务商官网购物车结算为准。',
  },
  {
    q: '月付与年付 VPS 应该如何选择？',
    a: '首次测试线路稳定性与晚高峰延迟时，建议优先选择月付或季付套餐降低试错成本；确认线路与服务商口碑稳定后，再考虑性价比更高的年付促销方案。',
  },
];

export const AIRPORTS_FAQ = [
  {
    q: 'NetHub 的机场导航提供哪些维度的对比信息？',
    a: '机场列表汇总公开的参考月付价格、对应月流量、速率上限与同时在线设备数限制，支持按价位区间筛选以及按参考价或月流量排序；点击详情页可查看全部公开周期套餐与官方社区频道。',
  },
  {
    q: '挑选机场订阅服务时有哪些注意事项？',
    a: '建议优先评估实际使用场景（日常网页、流媒体解锁或大流量下载），优先从月付小套餐测试晚高峰稳定性与客户端协议支持（如 Shadowsocks、Trojan、VLESS、Hysteria 2），避免一次性长期大额预付。',
  },
];

export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function buildFaqSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

function buildBreadcrumbSchema(crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: c.name,
      item: `${SITE_ORIGIN}${c.path}`,
    })),
  };
}

export function buildRouteSeo({ pathname, meta, apps, vps, airports, detail }) {
  const clean = (pathname || '/').replace(/\/+$/, '') || '/';
  const canonicalUrl = `${SITE_ORIGIN}${clean === '/' ? '/' : clean}`;

  // 1. Homepage (Apps Directory)
  if (clean === '/') {
    const appCount = meta?.counts?.apps || apps?.length || 250;
    const vpsCount = meta?.counts?.vps || vps?.length || 750;
    const airportCount = meta?.counts?.airports || airports?.length || 390;
    const title = 'NetHub · 跨平台代理客户端、服务端、VPS 与机场目录 (nethub.best)';
    const description = `NetHub (nethub.best) 收录 ${appCount} 款代理客户端、服务端、订阅工具与规则配置，以及 ${vpsCount} 款 VPS 套餐与 ${airportCount} 家机场公开资料，支持多维度筛选与移动端快速检索。`;

    const schemas = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        alternateName: 'nethub.best',
        url: `${SITE_ORIGIN}/`,
        inLanguage: 'zh-CN',
        description,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_ORIGIN}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: `${SITE_ORIGIN}/`,
        logo: `${SITE_ORIGIN}/favicon.svg`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: '热门代理客户端与网络工具',
        numberOfItems: appCount,
        itemListElement: (apps || []).slice(0, 24).map((app, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: app.name,
          url: `${SITE_ORIGIN}${app.path}`,
        })),
      },
      buildFaqSchema(APPS_FAQ),
    ];

    const fallbackHtml = renderCollectionFallback({
      h1: 'NetHub · 网络工具与应用目录',
      intro: description,
      items: (apps || []).slice(0, 40).map((a) => ({
        title: a.alias ? `${a.name} (${a.alias})` : a.name,
        path: a.path,
        meta: [a.core, a.sourceStatus, a.price, (a.platforms || []).join('/')].filter(Boolean).join(' · '),
        desc: a.description,
      })),
      faqs: APPS_FAQ,
    });

    return { title, description, canonicalUrl, ogType: 'website', schemas, fallbackHtml };
  }

  // 2. VPS Collection Page
  if (clean === '/vps') {
    const count = meta?.counts?.vps || vps?.length || 750;
    const title = `海外 VPS 套餐与优化线路对比（共 ${count} 款） · NetHub`;
    const description = `按服务商、计费周期、折算人民币月价、CPU/内存/流量规格对比 ${count} 款海外 VPS 与 CN2/9929 等优化线路套餐。`;

    const schemas = [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        url: canonicalUrl,
        description,
        inLanguage: 'zh-CN',
      },
      buildBreadcrumbSchema([
        { name: '首页', path: '/' },
        { name: 'VPS 套餐', path: '/vps' },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'VPS 套餐列表',
        numberOfItems: count,
        itemListElement: (vps || []).slice(0, 24).map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: `${item.provider} ${item.subtitle || item.heading}`,
          url: `${SITE_ORIGIN}${item.path}`,
        })),
      },
      buildFaqSchema(VPS_FAQ),
    ];

    const fallbackHtml = renderCollectionFallback({
      h1: 'VPS 套餐与线路对比',
      intro: description,
      items: (vps || []).slice(0, 36).map((v) => ({
        title: `${v.provider} · ${v.subtitle || v.heading}`,
        path: v.path,
        meta: [v.priceText, v.cnyRef, v.cpu, v.memory, v.storage, v.traffic].filter(Boolean).join(' · '),
        desc: v.location || v.monthlyText,
      })),
      faqs: VPS_FAQ,
    });

    return { title, description, canonicalUrl, ogType: 'website', schemas, fallbackHtml };
  }

  // 3. Airports Collection Page
  if (clean === '/jichang') {
    const count = meta?.counts?.airports || airports?.length || 390;
    const title = `机场导航与套餐价格对比（共 ${count} 家） · NetHub`;
    const description = `汇总 ${count} 家公开机场资料，提供参考月付价格、月流量配额、速率与设备数筛选对比及官方社区入口。`;

    const schemas = [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        url: canonicalUrl,
        description,
        inLanguage: 'zh-CN',
      },
      buildBreadcrumbSchema([
        { name: '首页', path: '/' },
        { name: '机场导航', path: '/jichang' },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: '机场导航目录',
        numberOfItems: count,
        itemListElement: (airports || []).slice(0, 24).map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          url: `${SITE_ORIGIN}${item.path}`,
        })),
      },
      buildFaqSchema(AIRPORTS_FAQ),
    ];

    const fallbackHtml = renderCollectionFallback({
      h1: '机场导航与套餐对比',
      intro: description,
      items: (airports || []).slice(0, 36).map((a) => ({
        title: a.name,
        path: a.path,
        meta: [a.priceText, a.period, a.traffic, a.speed, a.devices].filter(Boolean).join(' · '),
        desc: '',
      })),
      faqs: AIRPORTS_FAQ,
    });

    return { title, description, canonicalUrl, ogType: 'website', schemas, fallbackHtml };
  }

  // 4. VPS Detail Page
  if (clean.startsWith('/vps/')) {
    const preview = (vps || []).find((v) => v.path === clean);
    const name = detail?.title || preview?.subtitle || preview?.heading || clean.split('/').pop();
    const provider = detail?.provider || preview?.provider || 'VPS';
    const priceLabel = detail?.priceOptions?.[0]?.price || preview?.priceText || '';
    const title = `${provider} ${name}${priceLabel ? ` (${priceLabel})` : ''} 规格与报价 · NetHub`;
    const description = [
      `${provider} ${name}`,
      preview?.location,
      priceLabel,
      preview?.cnyRef,
      preview?.cpu && `CPU ${preview.cpu}`,
      preview?.memory && `内存 ${preview.memory}`,
      preview?.storage && `硬盘 ${preview.storage}`,
      preview?.traffic && `流量 ${preview.traffic}`,
      preview?.bandwidth && `带宽 ${preview.bandwidth}`,
    ]
      .filter(Boolean)
      .join('，');

    const schemas = [
      buildBreadcrumbSchema([
        { name: '首页', path: '/' },
        { name: 'VPS', path: '/vps' },
        { name: `${provider} ${name}`, path: clean },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `${provider} ${name}`,
        description,
        brand: { '@type': 'Organization', name: provider },
        url: canonicalUrl,
        ...(preview?.priceAmount != null
          ? {
              offers: {
                '@type': 'Offer',
                price: String(preview.priceAmount),
                priceCurrency: preview.currency || 'USD',
                availability: 'https://schema.org/InStock',
                url: detail?.purchaseUrl || preview.purchaseUrl || canonicalUrl,
              },
            }
          : {}),
      },
    ];

    const fallbackHtml = renderDetailFallback({
      h1: `${provider} · ${name}`,
      summary: description,
      backPath: '/vps',
      backLabel: '返回 VPS 列表',
      specs: [
        preview?.priceText && { label: '官方报价', value: `${preview.priceText} ${preview.cnyRef || ''}`.trim() },
        preview?.cpu && { label: 'CPU', value: preview.cpu },
        preview?.memory && { label: '内存', value: preview.memory },
        preview?.storage && { label: '存储', value: preview.storage },
        preview?.traffic && { label: '流量额度', value: preview.traffic },
        preview?.bandwidth && { label: '端口带宽', value: preview.bandwidth },
        ...(detail?.sections || []).flatMap((s) => s.items || []),
      ].filter(Boolean),
      links: detail?.purchaseUrl ? [{ label: '前往服务商官网', href: detail.purchaseUrl }] : [],
    });

    return { title, description, canonicalUrl, ogType: 'article', schemas, fallbackHtml };
  }

  // 5. Airport Detail Page
  if (clean.startsWith('/jichang/')) {
    const preview = (airports || []).find((a) => a.path === clean);
    const name = detail?.name || preview?.name || clean.split('/').pop();
    const title = `${name} 机场套餐、流量与价格详情 · NetHub`;
    const description =
      detail?.summary ||
      [
        `${name} 机场公开资料`,
        preview?.priceText && `参考价 ${preview.priceText} ${preview.period || ''}`.trim(),
        preview?.traffic && `月流量 ${preview.traffic}`,
        preview?.speed && `速率 ${preview.speed}`,
        preview?.devices && `设备数 ${preview.devices}`,
      ]
        .filter(Boolean)
        .join('，');

    const schemas = [
      buildBreadcrumbSchema([
        { name: '首页', path: '/' },
        { name: '机场', path: '/jichang' },
        { name, path: clean },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: `${name} 代理订阅服务`,
        description,
        url: canonicalUrl,
        ...(preview?.priceAmount != null
          ? {
              offers: {
                '@type': 'Offer',
                price: String(preview.priceAmount),
                priceCurrency: 'CNY',
              },
            }
          : {}),
      },
    ];

    const fallbackHtml = renderDetailFallback({
      h1: name,
      summary: description,
      backPath: '/jichang',
      backLabel: '返回机场列表',
      specs: [
        preview?.priceText && { label: '参考价格', value: `${preview.priceText} ${preview.period || ''}`.trim() },
        preview?.traffic && { label: '对应月流量', value: preview.traffic },
        preview?.speed && { label: '速率', value: preview.speed },
        preview?.devices && { label: '设备数', value: preview.devices },
        ...(detail?.plans || []).map((p) => ({
          label: p.name,
          value: [p.quota, `${p.price} ${p.period}`.trim(), ...(p.specs || [])].filter(Boolean).join(' · '),
        })),
      ].filter(Boolean),
      links: detail?.contacts || [],
    });

    return { title, description, canonicalUrl, ogType: 'article', schemas, fallbackHtml };
  }

  // 6. App / Server / Subscription Tool / Rule Detail Page
  const preview = (apps || []).find((a) => a.path === clean);
  const name = detail?.name || preview?.name || clean.split('/').pop();
  const platforms = preview?.platforms?.join('、') || '';
  const title = `${name}${preview?.alias ? ` (${preview.alias})` : ''}${platforms ? `：${platforms} 下载与资料` : ' 官方下载与详情'} · NetHub`;
  const description =
    detail?.summary ||
    [
      `${name}${preview?.alias ? `（${preview.alias}）` : ''}`,
      platforms && `支持 ${platforms}`,
      preview?.core && `内核 ${preview.core}`,
      preview?.sourceStatus,
      preview?.price,
      preview?.description,
    ]
      .filter(Boolean)
      .join('，');

  const schemas = [
    buildBreadcrumbSchema([
      { name: '首页', path: '/' },
      { name, path: clean },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name,
      alternateName: detail?.alias || preview?.alias || undefined,
      applicationCategory: 'NetworkApplication',
      operatingSystem: preview?.platforms?.length ? preview.platforms.join(', ') : undefined,
      softwareVersion: detail?.version || undefined,
      isAccessibleForFree: preview ? !preview.isPaid : undefined,
      description,
      url: canonicalUrl,
      image: detail?.icon || preview?.icon || OG_IMAGE,
      downloadUrl: detail?.downloads?.[0]?.href || detail?.officialLinks?.[0]?.href || undefined,
    },
  ];

  const fallbackHtml = renderDetailFallback({
    h1: name,
    summary: description,
    backPath: '/',
    backLabel: '返回应用目录',
    specs: [
      detail?.version && { label: '最新版本', value: detail.version },
      preview?.core && { label: '代理内核', value: preview.core },
      preview?.sourceStatus && { label: '代码状态', value: preview.sourceStatus },
      preview?.price && { label: '费用', value: preview.price },
      platforms && { label: '支持平台', value: platforms },
      ...(detail?.specs || []),
    ].filter(Boolean),
    links: [
      ...(detail?.officialLinks || []),
      ...(detail?.downloads || []).slice(0, 8).map((d) => ({ label: `下载 ${d.label}`, href: d.href })),
    ],
  });

  return { title, description, canonicalUrl, ogType: 'article', schemas, fallbackHtml };
}

function renderCollectionFallback({ h1, intro, items, faqs }) {
  const listHtml = items
    .map(
      (item) =>
        `<li><a href="${escapeHtml(item.path)}"><strong>${escapeHtml(item.title)}</strong></a>${
          item.meta ? ` — <span>${escapeHtml(item.meta)}</span>` : ''
        }${item.desc ? `<p>${escapeHtml(item.desc)}</p>` : ''}</li>`
    )
    .join('');

  const faqHtml = (faqs || [])
    .map(
      (f) => `<dt>${escapeHtml(f.q)}</dt><dd>${escapeHtml(f.a)}</dd>`
    )
    .join('');

  return `<main class="ssr-fallback" style="max-width:960px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif">
<header><nav><a href="/">应用目录</a> · <a href="/vps">VPS 套餐</a> · <a href="/jichang">机场导航</a> · <a href="/llms.txt">LLMs.txt</a></nav></header>
<h1>${escapeHtml(h1)}</h1>
<p>${escapeHtml(intro)}</p>
<ul>${listHtml}</ul>
${faqHtml ? `<section><h2>常见问题</h2><dl>${faqHtml}</dl></section>` : ''}
</main>`;
}

function renderDetailFallback({ h1, summary, backPath, backLabel, specs, links }) {
  const seen = new Set();
  const dedupedSpecs = [];
  for (const s of specs || []) {
    if (!s?.label || !s?.value || seen.has(s.label)) continue;
    seen.add(s.label);
    dedupedSpecs.push(s);
  }

  const specsHtml = dedupedSpecs
    .map((s) => `<dt>${escapeHtml(s.label)}</dt><dd>${escapeHtml(s.value)}</dd>`)
    .join('');

  const linksHtml = (links || [])
    .slice(0, 12)
    .map(
      (l) =>
        `<li><a href="${escapeHtml(l.href)}" rel="noopener noreferrer">${escapeHtml(l.label)}</a></li>`
    )
    .join('');

  return `<main class="ssr-fallback" style="max-width:920px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif">
<nav><a href="${escapeHtml(backPath)}">${escapeHtml(backLabel)}</a> · <a href="/">NetHub 首页</a></nav>
<h1>${escapeHtml(h1)}</h1>
<p>${escapeHtml(summary)}</p>
${specsHtml ? `<dl>${specsHtml}</dl>` : ''}
${linksHtml ? `<section><h2>相关入口与下载</h2><ul>${linksHtml}</ul></section>` : ''}
</main>`;
}

export function renderSeoHeadTags({ title, description, canonicalUrl, ogType, schemas }) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeUrl = escapeHtml(canonicalUrl);
  const safeOgImg = escapeHtml(OG_IMAGE);
  const schemaTags = (schemas || [])
    .map((obj) => `<script type="application/ld+json">${safeJsonLd(obj)}</script>`)
    .join('\n    ');

  return `<title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${safeUrl}" />
    <link rel="alternate" hreflang="zh-CN" href="${safeUrl}" />
    <link rel="alternate" type="text/markdown" title="LLMs.txt" href="${SITE_ORIGIN}/llms.txt" />
    <meta property="og:type" content="${escapeHtml(ogType || 'website')}" />
    <meta property="og:locale" content="zh_CN" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:image" content="${safeOgImg}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="675" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeOgImg}" />
    ${schemaTags}`;
}
