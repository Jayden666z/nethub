import { useMemo, useState } from 'react';
import { ExternalLink, Search, Server, X } from 'lucide-react';

const PAGE_SIZE = 36;

export function VpsView({ items, providers, loading, error, searchRef, onNavigate }) {
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('all');
  const [period, setPeriod] = useState('all');
  const [sort, setSort] = useState('default');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((item) => {
      if (provider !== 'all' && item.provider !== provider) return false;
      if (period === 'month' && item.period !== '月') return false;
      if (period === 'year' && item.period !== '年') return false;
      if (period === 'multi' && item.period !== '3 个月' && item.period !== '6 个月') return false;
      if (q) {
        const hay = [
          item.provider,
          item.location,
          item.subtitle,
          item.cpu,
          item.memory,
          item.storage,
          item.traffic,
          item.bandwidth,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sort === 'price-asc') {
      return [...list].sort((a, b) => (a.monthlyCny ?? 999999) - (b.monthlyCny ?? 999999));
    }
    if (sort === 'price-desc') {
      return [...list].sort((a, b) => (b.monthlyCny ?? -1) - (a.monthlyCny ?? -1));
    }
    if (sort === 'memory-desc') {
      return [...list].sort((a, b) => (b.memoryGb ?? -1) - (a.memoryGb ?? -1));
    }
    if (sort === 'traffic-desc') {
      return [...list].sort((a, b) => (b.trafficGb ?? -1) - (a.trafficGb ?? -1));
    }
    return list;
  }, [items, query, provider, period, sort]);

  const displayed = filtered.slice(0, visibleCount);
  const hasMore = displayed.length < filtered.length;

  const resetAll = () => {
    setQuery('');
    setProvider('all');
    setPeriod('all');
    setSort('default');
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <section aria-labelledby="vps-page-title">
      <div className="page-hero">
        <div className="hero-top">
          <div>
            <h1 id="vps-page-title" className="hero-title">
              VPS 套餐与线路对比
            </h1>
            <p className="hero-subtitle">
              按服务商、计费周期、折算月价与硬件配置快速筛选海外主机与优化线路套餐。
            </p>
          </div>
          <div className="hero-meta">
            <span>共收录 {items.length} 款套餐</span>
          </div>
        </div>
      </div>

      <div className="controls-panel">
        <div className="search-row">
          <div className="search-box">
            <Search size={17} className="search-icon" aria-hidden="true" />
            <input
              id="vps-search-input"
              ref={searchRef}
              type="search"
              className="search-input"
              placeholder="搜索服务商、机房、CN2、9929、日本、洛杉矶..."
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

          <select
            id="vps-sort-select"
            className="control-select"
            aria-label="排序方式"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
          >
            <option value="default">默认排序</option>
            <option value="price-asc">月均价格从低到高</option>
            <option value="price-desc">月均价格从高到低</option>
            <option value="memory-desc">内存从大到小</option>
            <option value="traffic-desc">流量从大到小</option>
          </select>
        </div>

        <div className="chip-scroller" aria-label="按服务商筛选">
          <button
            type="button"
            className={`filter-chip${provider === 'all' ? ' is-active' : ''}`}
            onClick={() => {
              setProvider('all');
              setVisibleCount(PAGE_SIZE);
            }}
          >
            <span>全部服务商</span>
            <span className="chip-count">{items.length}</span>
          </button>
          {(providers || []).map((p) => (
            <button
              key={p.name}
              type="button"
              className={`filter-chip${provider === p.name ? ' is-active' : ''}`}
              onClick={() => {
                setProvider(provider === p.name ? 'all' : p.name);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              <span>{p.name}</span>
              <span className="chip-count">{p.count}</span>
            </button>
          ))}
        </div>

        <div className="chip-scroller" aria-label="按计费周期筛选">
          {[
            { id: 'all', label: '全部周期' },
            { id: 'month', label: '月付' },
            { id: 'year', label: '年付' },
            { id: 'multi', label: '季付 / 半年付' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sub-chip${period === item.id ? ' is-active' : ''}`}
              onClick={() => {
                setPeriod(item.id);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="results-bar">
        <span className="tabular">
          共筛选出 <strong>{filtered.length}</strong> 款 VPS 套餐
        </span>
        {(query || provider !== 'all' || period !== 'all' || sort !== 'default') && (
          <button type="button" className="reset-link" onClick={resetAll}>
            重置筛选
          </button>
        )}
      </div>

      {error ? (
        <div className="empty-state">
          <h3>VPS 数据加载失败</h3>
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
          <Server size={28} color="var(--text-muted)" />
          <h3>没有匹配的 VPS 套餐</h3>
          <p>可以尝试切换服务商或清空关键词。</p>
          <div style={{ marginTop: 14 }}>
            <button type="button" className="btn btn-secondary" onClick={resetAll}>
              显示全部套餐
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card-grid">
            {displayed.map((vps) => (
              <article key={vps.id} className="vps-card">
                <div>
                  <div className="vps-card-top">
                    <div style={{ minWidth: 0 }}>
                      <div className="vps-provider-row">
                        <span className="vps-provider-badge">{vps.provider}</span>
                        {vps.location && <span className="vps-location">{vps.location}</span>}
                      </div>
                      <h2 className="vps-title">
                        <a
                          href={vps.path}
                          onClick={(e) => {
                            e.preventDefault();
                            onNavigate(vps.path);
                          }}
                        >
                          {vps.subtitle || vps.heading}
                        </a>
                      </h2>
                    </div>

                    <div className="vps-price-block">
                      <div className="vps-price-main">{vps.priceText}</div>
                      {vps.cnyRef && <div className="vps-price-sub">{vps.cnyRef}</div>}
                    </div>
                  </div>

                  <dl className="spec-grid" style={{ marginTop: 12 }}>
                    <div className="spec-cell">
                      <dt className="spec-label">CPU</dt>
                      <dd className="spec-val">{vps.cpu || '-'}</dd>
                    </div>
                    <div className="spec-cell">
                      <dt className="spec-label">内存</dt>
                      <dd className="spec-val">{vps.memory || '-'}</dd>
                    </div>
                    <div className="spec-cell">
                      <dt className="spec-label">硬盘</dt>
                      <dd className="spec-val">{vps.storage || '-'}</dd>
                    </div>
                  </dl>

                  <div className="vps-transfer-row" style={{ marginTop: 10 }}>
                    <span>流量：{vps.traffic || '见详情'}</span>
                    <span>带宽：{vps.bandwidth || '见详情'}</span>
                  </div>
                </div>

                <div className="card-action-row">
                  <a
                    href={vps.path}
                    className="btn btn-secondary btn-flex"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(vps.path);
                    }}
                  >
                    查看详情
                  </a>
                  {vps.purchaseUrl && (
                    <a
                      href={vps.purchaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                    >
                      <span>直达官网</span>
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>

          {hasMore && (
            <div className="load-more-wrap">
              <button
                type="button"
                className="load-more-btn tabular"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                加载更多（剩余 {filtered.length - displayed.length} 款）
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
