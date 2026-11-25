import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  Download,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Info,
  Package,
  X,
} from 'lucide-react';
import { Avatar } from './Avatar.jsx';
import { findCachedPreview } from '../hooks/useCatalogData.js';
import { applyClientSeo } from '../utils/seo.js';

const detailCache = new Map();

export function DetailView({ path, onBack }) {
  const preview = useMemo(() => findCachedPreview(path), [path]);
  const [detail, setDetail] = useState(() => detailCache.get(path) || null);
  const [loading, setLoading] = useState(() => !detailCache.has(path));
  const [error, setError] = useState(null);
  const [activePlatform, setActivePlatform] = useState('all');
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    if (detailCache.has(path)) return;

    let active = true;
    fetch(`/api/detail?path=${encodeURIComponent(path)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`无法加载详情 (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        detailCache.set(path, data);
        setDetail(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : '详情加载失败');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [path]);

  const kind = path.startsWith('/vps/') ? 'vps' : path.startsWith('/jichang/') ? 'airport' : 'app';
  const sourceUrl = detail?.sourceUrl || `https://huarun.win${path}`;

  const downloadPlatforms = useMemo(() => {
    if (!detail?.downloads?.length) return [];
    return [...new Set(detail.downloads.map((d) => d.platform).filter(Boolean))];
  }, [detail]);

  const filteredDownloads = useMemo(() => {
    if (!detail?.downloads?.length) return [];
    if (activePlatform === 'all') return detail.downloads;
    return detail.downloads.filter((d) => d.platform === activePlatform);
  }, [detail, activePlatform]);

  const displayName =
    detail?.name ||
    detail?.title ||
    preview?.name ||
    preview?.subtitle ||
    preview?.heading ||
    '正在加载...';

  const displayIcon = detail?.icon || preview?.icon || '';
  const displaySummary =
    detail?.summary ||
    detail?.subtitle ||
    preview?.description ||
    (preview?.provider ? `${preview.provider}${preview.location ? ` · ${preview.location}` : ''}` : '');

  useEffect(() => {
    if (!displayName || displayName === '正在加载...') return;
    const suffix = kind === 'vps' ? 'VPS 规格与报价 · NetHub' : kind === 'airport' ? '机场套餐与详情 · NetHub' : '官方下载与资料 · NetHub';
    applyClientSeo({
      title: `${displayName} ${suffix}`,
      description: displaySummary || `${displayName} 公开资料与详情 - NetHub (nethub.best)`,
      path,
    });
  }, [displayName, displaySummary, kind, path]);

  return (
    <article className="detail-shell">
      <div className="detail-topbar">
        <button type="button" className="back-btn" onClick={onBack}>
          <ChevronLeft size={17} aria-hidden="true" />
          <span>返回列表</span>
        </button>

        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="source-pill-link"
        >
          <span>查看原始资料 (huarun.win)</span>
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      </div>

      {/* Hero Summary Card */}
      <header className="detail-hero-card">
        <div className="detail-hero-row">
          {kind !== 'vps' && <Avatar src={displayIcon} name={displayName} className="detail-avatar" />}
          <div className="detail-hero-meta">
            <div className="detail-title-row">
              <h1 className="detail-title">{displayName}</h1>
              {detail?.version && <span className="detail-version-pill">{detail.version}</span>}
              {detail?.availability && (
                <span className="meta-pill is-success">{detail.availability}</span>
              )}
              {detail?.alias && <span className="app-card-alias">{detail.alias}</span>}
            </div>
            {displaySummary && <p className="detail-summary">{displaySummary}</p>}
          </div>
        </div>

        {/* Action links */}
        {kind === 'app' && detail?.officialLinks?.length > 0 && (
          <div className="detail-action-strip">
            {detail.officialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                <Globe size={14} aria-hidden="true" />
                <span>{link.label}</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            ))}
          </div>
        )}

        {kind === 'vps' && (detail?.purchaseUrl || preview?.purchaseUrl) && (
          <div className="detail-action-strip">
            <a
              href={detail?.purchaseUrl || preview?.purchaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <span>前往服务商官网订购</span>
              <ExternalLink size={14} aria-hidden="true" />
            </a>
            {detail?.providerUrl && (
              <a
                href={detail.providerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                <span>{detail.provider} 官网</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
          </div>
        )}

        {kind === 'airport' && (
          <div className="detail-action-strip">
            {(detail?.purchaseUrl || preview?.purchaseUrl) && (
              <a
                href={detail?.purchaseUrl || preview?.purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <span>前往官网 / 购买入口</span>
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
            {detail?.contacts?.map((c) => (
              <a
                key={c.href}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                <span>{c.label}</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            ))}
          </div>
        )}
      </header>

      {/* Notice / Warning Banner */}
      {detail?.notice && (
        <aside className="notice-banner" aria-label="特别说明">
          <AlertTriangle size={19} className="notice-icon" aria-hidden="true" />
          <div>
            <div className="notice-title">{detail.notice.title}</div>
            <p className="notice-body">{detail.notice.body}</p>
          </div>
        </aside>
      )}

      {loading && (
        <>
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </>
      )}

      {error && !loading && (
        <div className="empty-state">
          <h3>实时详情暂时不可用</h3>
          <p>{error}，您可以直接前往原始资料页查看完整内容。</p>
          <div style={{ marginTop: 14 }}>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <span>打开原始页面</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}

      {/* APP DETAIL SECTIONS */}
      {!loading && detail?.kind === 'app' && (
        <>
          {detail.downloads?.length > 0 && (
            <section className="detail-section">
              <h2 className="detail-section-title">
                <Download size={17} aria-hidden="true" />
                <span>官方下载入口</span>
              </h2>

              {downloadPlatforms.length > 1 && (
                <div className="chip-scroller">
                  <button
                    type="button"
                    className={`sub-chip${activePlatform === 'all' ? ' is-active' : ''}`}
                    onClick={() => setActivePlatform('all')}
                  >
                    全部平台 ({detail.downloads.length})
                  </button>
                  {downloadPlatforms.map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      className={`sub-chip${activePlatform === plat ? ' is-active' : ''}`}
                      onClick={() => setActivePlatform(plat)}
                    >
                      {plat}
                    </button>
                  ))}
                </div>
              )}

              <div className="download-grid">
                {filteredDownloads.map((dl) => (
                  <a
                    key={dl.href}
                    href={dl.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="download-item"
                  >
                    <div className="download-item-main">
                      <div className="download-item-label">{dl.label}</div>
                      {dl.meta && <div className="download-item-meta">{dl.meta}</div>}
                    </div>
                    <Download size={16} color="var(--accent-text)" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {detail.screenshots?.length > 0 && (
            <section className="detail-section">
              <h2 className="detail-section-title">
                <ImageIcon size={17} aria-hidden="true" />
                <span>界面预览</span>
              </h2>
              <div className="screenshot-grid">
                {detail.screenshots.map((shot) => (
                  <button
                    key={shot.src}
                    type="button"
                    className="screenshot-thumb"
                    onClick={() => setLightboxSrc(shot)}
                    aria-label={`放大查看 ${shot.alt}`}
                  >
                    <img
                      src={shot.src}
                      alt={shot.alt}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          {detail.specs?.length > 0 && (
            <section className="detail-section">
              <h2 className="detail-section-title">
                <Info size={17} aria-hidden="true" />
                <span>详细信息</span>
              </h2>
              <div className="specs-list">
                {detail.specs.map((spec) => (
                  <div key={spec.label} className="spec-row">
                    <span className="spec-row-label">{spec.label}</span>
                    <span className="spec-row-value">{spec.value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {detail.descriptionParagraphs?.length > 0 && (
            <section className="detail-section">
              <h2 className="detail-section-title">应用介绍</h2>
              <div className="prose-list">
                {detail.descriptionParagraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* VPS DETAIL SECTIONS */}
      {!loading && detail?.kind === 'vps' && (
        <>
          {detail.priceOptions?.length > 0 && (
            <section className="detail-section">
              <h2 className="detail-section-title">官方报价</h2>
              <div className="specs-list">
                {detail.priceOptions.map((opt, idx) => (
                  <div key={idx} className="spec-row">
                    <span className="spec-row-label">{opt.ref || '官方原币报价'}</span>
                    <span className="spec-row-value tabular">{opt.price}</span>
                    {opt.monthly && <span className="spec-row-label">{opt.monthly}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {detail.sections?.map((sec) => (
            <section key={sec.heading} className="detail-section">
              <h2 className="detail-section-title">{sec.heading}</h2>
              {sec.items?.length > 0 && (
                <div className="specs-list">
                  {sec.items.map((item) => (
                    <div key={item.label} className="spec-row">
                      <span className="spec-row-label">{item.label}</span>
                      <span className="spec-row-value tabular">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {sec.notes?.length > 0 && (
                <div className="prose-list">
                  {sec.notes.map((n, idx) => (
                    <p key={idx}>{n}</p>
                  ))}
                </div>
              )}
            </section>
          ))}
        </>
      )}

      {/* AIRPORT DETAIL SECTIONS */}
      {!loading && detail?.kind === 'airport' && (
        <section className="detail-section">
          <h2 className="detail-section-title">
            <Package size={17} aria-hidden="true" />
            <span>公开套餐列表 ({detail.plans?.length || 0})</span>
          </h2>
          {detail.plans?.length > 0 ? (
            <div className="plan-grid">
              {detail.plans.map((plan, idx) => (
                <div key={`${plan.name}-${idx}`} className="plan-card">
                  <div className="plan-head">
                    <h3 className="plan-name">{plan.name}</h3>
                    <span className="plan-price">
                      {plan.price} {plan.period}
                    </span>
                  </div>
                  {plan.quota && <div className="plan-quota tabular">{plan.quota}</div>}
                  {plan.specs?.length > 0 && (
                    <div className="plan-specs">
                      {plan.specs.map((s) => (
                        <span key={s} className="meta-pill">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="prose-list">暂未解析到具体套餐列表，可点击上方按钮直达原始资料页查看。</p>
          )}
        </section>
      )}

      {/* Screenshot Lightbox */}
      {lightboxSrc && (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="放大查看截图"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setLightboxSrc(null)}
            aria-label="关闭预览"
          >
            <X size={20} />
          </button>
          <img
            src={lightboxSrc.src}
            alt={lightboxSrc.alt}
            className="lightbox-img"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </article>
  );
}
