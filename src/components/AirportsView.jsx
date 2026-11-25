import { useMemo, useState } from 'react';
import { ExternalLink, Plane, Search, X } from 'lucide-react';
import { Avatar } from './Avatar.jsx';

const PAGE_SIZE = 36;

export function AirportsView({ items, loading, error, searchRef, onNavigate }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('default');
  const [priceBand, setPriceBand] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((item) => {
      if (priceBand === 'budget' && (item.priceAmount == null || item.priceAmount > 15)) return false;
      if (priceBand === 'mid' && (item.priceAmount == null || item.priceAmount <= 15 || item.priceAmount > 50)) return false;
      if (priceBand === 'premium' && (item.priceAmount == null || item.priceAmount <= 50)) return false;
      if (q) {
        const hay = [item.name, item.slug, item.traffic, item.speed, item.devices, item.period]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sort === 'price-asc') {
      return [...list].sort((a, b) => (a.priceAmount ?? 999999) - (b.priceAmount ?? 999999));
    }
    if (sort === 'price-desc') {
      return [...list].sort((a, b) => (b.priceAmount ?? -1) - (a.priceAmount ?? -1));
    }
    if (sort === 'traffic-desc') {
      return [...list].sort((a, b) => (b.trafficGb ?? -1) - (a.trafficGb ?? -1));
    }
    return list;
  }, [items, query, sort, priceBand]);

  const displayed = filtered.slice(0, visibleCount);
  const hasMore = displayed.length < filtered.length;

  const resetAll = () => {
    setQuery('');
    setSort('default');
    setPriceBand('all');
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <section aria-labelledby="airports-page-title">
      <div className="page-hero">
        <div className="hero-top">
          <div>
            <h1 id="airports-page-title" className="hero-title">
              机场导航与套餐对比
            </h1>
            <p className="hero-subtitle">
              汇总公开机场资料、参考月付价格、月流量配额、速率与设备限制，点击可查看全部套餐。
            </p>
          </div>
          <div className="hero-meta">
            <span>共收录 {items.length} 家机场</span>
          </div>
        </div>
      </div>

      <div className="controls-panel">
        <div className="search-row">
          <div className="search-box">
            <Search size={17} className="search-icon" aria-hidden="true" />
            <input
              id="airports-search-input"
              ref={searchRef}
              type="search"
              className="search-input"
              placeholder="搜索机场名称、流量或速率..."
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
            id="airports-sort-select"
            className="control-select"
            aria-label="排序方式"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
          >
            <option value="default">默认排序</option>
            <option value="price-asc">参考价从低到高</option>
            <option value="price-desc">参考价从高到低</option>
            <option value="traffic-desc">月流量从大到小</option>
          </select>
        </div>

        <div className="chip-scroller" aria-label="按价格区间筛选">
          {[
            { id: 'all', label: '全部价位' },
            { id: 'budget', label: '¥15 以内' },
            { id: 'mid', label: '¥15 – ¥50' },
            { id: 'premium', label: '¥50 以上' },
          ].map((band) => (
            <button
              key={band.id}
              type="button"
              className={`filter-chip${priceBand === band.id ? ' is-active' : ''}`}
              onClick={() => {
                setPriceBand(band.id);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              {band.label}
            </button>
          ))}
        </div>
      </div>

      <div className="results-bar">
        <span className="tabular">
          共筛选出 <strong>{filtered.length}</strong> 家机场
        </span>
        {(query || priceBand !== 'all' || sort !== 'default') && (
          <button type="button" className="reset-link" onClick={resetAll}>
            重置筛选
          </button>
        )}
      </div>

      {error ? (
        <div className="empty-state">
          <h3>机场数据加载失败</h3>
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
          <Plane size={28} color="var(--text-muted)" />
          <h3>没有匹配的机场</h3>
          <p>可以尝试调整价格区间或搜索关键词。</p>
          <div style={{ marginTop: 14 }}>
            <button type="button" className="btn btn-secondary" onClick={resetAll}>
              查看全部机场
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card-grid">
            {displayed.map((airport) => (
              <article key={airport.id} className="airport-card">
                <div>
                  <div className="airport-head">
                    <a
                      href={airport.path}
                      className="airport-identity"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(airport.path);
                      }}
                    >
                      <Avatar src={airport.icon} name={airport.name} />
                      <h2 className="airport-name">{airport.name}</h2>
                    </a>

                    <div className="airport-price-pill">
                      <div className="airport-price-amount">{airport.priceText || '见详情'}</div>
                      {airport.period && <div className="airport-price-period">{airport.period}</div>}
                    </div>
                  </div>

                  <dl className="spec-grid" style={{ marginTop: 12 }}>
                    <div className="spec-cell">
                      <dt className="spec-label">月流量</dt>
                      <dd className="spec-val">{airport.traffic || '-'}</dd>
                    </div>
                    <div className="spec-cell">
                      <dt className="spec-label">速率</dt>
                      <dd className="spec-val">{airport.speed || '未注明'}</dd>
                    </div>
                    <div className="spec-cell">
                      <dt className="spec-label">设备数</dt>
                      <dd className="spec-val">{airport.devices || '未注明'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="card-action-row">
                  <a
                    href={airport.path}
                    className="btn btn-secondary btn-flex"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(airport.path);
                    }}
                  >
                    全部套餐与详情
                  </a>
                  {airport.purchaseUrl && (
                    <a
                      href={airport.purchaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                    >
                      <span>访问</span>
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
                加载更多（剩余 {filtered.length - displayed.length} 家）
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
