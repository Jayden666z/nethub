import { SITE_ORIGIN } from '../../shared/seo.js';

function setMeta(selector, attr, value) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    if (selector.includes('property=')) {
      const m = selector.match(/property="([^"]+)"/);
      if (m) el.setAttribute('property', m[1]);
    } else if (selector.includes('name=')) {
      const m = selector.match(/name="([^"]+)"/);
      if (m) el.setAttribute('name', m[1]);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export function applyClientSeo({ title, description, path }) {
  if (typeof document === 'undefined') return;
  const cleanPath = (path || '/').replace(/\/+$/, '') || '/';
  const canonicalUrl = `${SITE_ORIGIN}${cleanPath === '/' ? '/' : cleanPath}`;

  if (title) {
    document.title = title;
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[name="twitter:title"]', 'content', title);
  }
  if (description) {
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[name="twitter:description"]', 'content', description);
  }

  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', canonicalUrl);
  setMeta('meta[property="og:url"]', 'content', canonicalUrl);
}
