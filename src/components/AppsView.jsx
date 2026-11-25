import { useMemo, useState } from 'react';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { Avatar } from './Avatar.jsx';

const TYPE_TABS = [
  { id: 'all', label: '全部' },
  { id: 'client', label: '客户端' },
  { id: 'server', label: '服务端' },
  { id: 'subscription-tool', label: '订阅工具' },
  { id: 'rule-config', label: '规则与配置' },
];

const QUICK_PLATFORMS = ['Android', 'iOS', 'Windows', 'macOS', 'Linux', 'OpenWrt', 'tvOS', 'Docker'];
const QUICK_CORES = ['Mihomo', 'sing-box', 'Xray', '自研', '多内核', 'V2Ray'];
const SOURCE_FILTERS = [
  { id: 'all', label: '不限' },
  { id: 'open', label: '开源' },
  { id: 'closed', label: '未公开 / 受限' },
];
const PRICE_FILTERS = [
  { id: 'all', label: '不限' },
  { id: 'free', label: '免费' },
  { id: 'paid', label: '付费 / 含内购' },
];

const PAGE_SIZE = 36;

export function AppsView({ apps, loading, error, syncedAt, searchRef, onNavigate }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [core, setCore] = useState('all');
  const [source, setSource] = useState('all');
  const [price, setPrice] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const typeCounts = useMemo(() => {
    const map = { all: apps.length };
    for (const app of apps) {
      map[app.type] = (map[app.type] || 0) + 1;
    }
    return map;
  }, [apps]);

  const activeFilterCount =
    (platform !== 'all' ? 1 : 0) +
    (core !== 'all' ? 1 : 0) +
    (source !== 'all' ? 1 : 0) +
    (price !== 'all' ? 1 : 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((app) => {
      if (type !== 'all' && app.type !== type) return false;
      if (platform !== 'all' && !(app.platforms || []).includes(platform)) return false;
      if (core !== 'all' && app.core !== core && !(app.core || '').includes(core)) return false;
      if (source === 'open') {
        const s = app.sourceStatus || '';
        if (!/开源|MIT|GPL|Apache|AGPL|LGPL|WTFPL|CC BY/i.test(s)) return false;
      } else if (source === 'closed') {
        const s = app.sourceStatus || '';
        if (!/未公开|不完整|受限|闭源/i.test(s)) return false;
      }
      if (price === 'free' && app.isPaid) return false;
      if (price === 'paid' && !app.isPaid) return false;

      if (q) {
        const hay = [
          app.name,
          app.alias,
          app.description,
          app.core,
          ...(app.featureTags || []),
          ...(app.platforms || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [apps, query, type, platform, core, source, price]);

  const displayed = filtered.slice(0, visibleCount);
  const hasMore = displayed.length < filtered.length;

  const resetAll = () => {
    setQuery('');
    setType('all');
    setPlatform('all');
    setCore('all');
    setSource('all');
    setPrice('all');
    setVisibleCount(PAGE_SIZE);
  };

  const renderFilterGroups = () => (
    <>
      <div className="filter-group">
        <span className="filter-group-label">平台</span>
        <div className="filter-group-chips">
          <button
            type="button"
            className={`sub-chip${platform === 'all' ? ' is-active' : ''}`}
            onClick={() => {
              setPlatform('all');
              setVisibleCount(PAGE_SIZE);
            }}
          >
            全部平台
          </button>
          {QUICK_PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              className={`sub-chip${platform === p ? ' is-active' : ''}`}
              onClick={() => {
                setPlatform(platform === p ? 'all' : p);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-group-label">内核</span>
        <div className="filter-group-chips">
          <button
            type="button"
            className={`sub-chip${core === 'all' ? ' is-active' : ''}`}
            onClick={() => {
              setCore('all');
              setVisibleCount(PAGE_SIZE);
            }}
          >
            全部内核
          </button>
          {QUICK_CORES.map((c) => (
            <button
              key={c}
              type="button"
              className={`sub-chip${core === c ? ' is-active' : ''}`}
              onClick={() => {
                setCore(core === c ? 'all' : c);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-group-label">代码</span>
        <div className="filter-group-chips">
          {SOURCE_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sub-chip${source === item.id ? ' is-active' : ''}`}
              onClick={() => {
                setSource(item.id);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-group-label">费用</span>
        <div className="filter-group-chips">
          {PRICE_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sub-chip${price === item.id ? ' is-active' : ''}`}
              onClick={() => {
                setPrice(item.id);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <section aria-labelledby="apps-page-title">
      <div className="page-hero">
        <div className="hero-top">
          <div>
            <h1 id="apps-page-title" className="hero-title">
              网络工具与应用目录
            </h1>
            <p className="hero-subtitle">
              汇集多平台代理客户端、服务端、订阅工具与规则配置，支持按平台、内核与开源状态快速检索。
            </p>
          </div>
          {syncedAt && (
            <div className="hero-meta">
              <span>同步于 {new Date(syncedAt).toLocaleDateString('zh-CN')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="controls-panel">
        <div className="search-row">
          <div className="search-box">
            <Search size={17} className="search-icon" aria-hidden="true" />
            <input
              id="apps-search-input"
              ref={searchRef}
              type="search"
              className="search-input"
              placeholder="搜索应用名、别名、内核或平台，如 FlClash、sing-box、iOS..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setQuery('')}
                aria-label="清空搜索"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            id="apps-filter-btn"
            type="button"
            className={`filter-trigger-btn${activeFilterCount > 0 ? ' has-filters' : ''}`}
            onClick={() => {
              if (window.innerWidth <= 768) {
                setSheetOpen(true);
              } else {
                setShowFilters((prev) => !prev);
              }
            }}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span>筛选</span>
            {activeFilterCount > 0 && <span className="filter-badge-dot">{activeFilterCount}</span>}
          </button>
        </div>

        <div className="chip-scroller" role="tablist" aria-label="应用分类">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={type === tab.id}
              className={`filter-chip${type === tab.id ? ' is-active' : ''}`}
              onClick={() => {
                setType(tab.id);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              <span>{tab.label}</span>
              <span className="chip-count">{typeCounts[tab.id] || 0}</span>
            </button>
          ))}
        </div>

        {showFilters && <div className="filter-tray desktop-only-tray">{renderFilterGroups()}</div>}
      </div>

      <div className="results-bar">
        <span className="tabular">
          共找到 <strong>{filtered.length}</strong> 个条目
        </span>
        {(query || type !== 'all' || activeFilterCount > 0) && (
          <div className="active-filters-row">
            <button type="button" className="reset-link" onClick={resetAll}>
              重置全部筛选
            </button>
          </div>
        )}
      </div>

      {error ? (
        <div className="empty-state">
          <h3>目录数据加载失败</h3>
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="card-grid">
          {Array.from({ length: 9 }).map((_, idx) => (
            <div key={idx} className="skeleton-card" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <Filter size={28} color="var(--text-muted)" />
          <h3>没有匹配的应用</h3>
          <p>尝试放宽筛选条件或更换搜索关键词。</p>
          <div style={{ marginTop: 14 }}>
            <button type="button" className="btn btn-secondary" onClick={resetAll}>
              查看全部条目
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card-grid">
            {displayed.map((app) => {
              const isOpen = /开源|MIT|GPL|Apache|AGPL|LGPL/i.test(app.sourceStatus || '');
              return (
                <a
                  key={app.id}
                  href={app.path}
                  className="app-card"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(app.path);
                  }}
                >
                  <div className="app-card-head">
                    <Avatar src={app.icon} name={app.name} />
                    <div className="app-card-titles">
                      <div className="app-card-name-row">
                        <h2 className="app-card-name">{app.name}</h2>
                        {app.alias && <span className="app-card-alias">{app.alias}</span>}
                      </div>
                      <p className="app-card-desc">{app.description || '点击查看官方下载入口与详细资料。'}</p>
                    </div>
                  </div>

                  <div className="app-card-foot">
                    <div className="meta-pill-row">
                      {app.core && <span className="meta-pill is-accent">{app.core}</span>}
                      {app.sourceStatus && (
                        <span className={`meta-pill${isOpen ? ' is-success' : ''}`}>
                          {app.sourceStatus}
                        </span>
                      )}
                      {app.price && (
                        <span className={`meta-pill${app.isPaid ? ' is-warning' : ' is-success'}`}>
                          {app.price}
                        </span>
                      )}
                    </div>

                    {app.platforms?.length > 0 && (
                      <div className="platform-strip">
                        {app.platforms.slice(0, 6).map((p) => (
                          <span key={p} className="platform-tag">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </a>
              );
            })}
          </div>

          {hasMore && (
            <div className="load-more-wrap">
              <button
                type="button"
                className="load-more-btn tabular"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                加载更多（剩余 {filtered.length - displayed.length} 项）
              </button>
            </div>
          )}
        </>
      )}

      {sheetOpen && (
        <div
          className="sheet-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="筛选应用"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSheetOpen(false);
          }}
        >
          <div className="sheet-panel">
            <div className="sheet-header">
              <span className="sheet-title">筛选条件</span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSheetOpen(false)}
                aria-label="关闭筛选弹窗"
              >
                <X size={18} />
              </button>
            </div>
            <div className="sheet-body">{renderFilterGroups()}</div>
            <div className="sheet-footer">
              <button type="button" className="btn btn-secondary btn-flex" onClick={resetAll}>
                重置
              </button>
              <button
                type="button"
                className="btn btn-primary btn-flex"
                onClick={() => setSheetOpen(false)}
              >
                查看 {filtered.length} 个结果
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
