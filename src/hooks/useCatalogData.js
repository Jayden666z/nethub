import { useEffect, useState } from 'react';

const memoryCache = {
  meta: null,
  apps: null,
  vps: null,
  airports: null,
};

async function fetchJson(key, url) {
  if (memoryCache[key]) return memoryCache[key];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`加载数据失败 (${res.status})`);
  const data = await res.json();
  memoryCache[key] = data;
  return data;
}

export function useMeta() {
  const [meta, setMeta] = useState(memoryCache.meta);

  useEffect(() => {
    if (meta) return;
    let active = true;
    fetchJson('meta', '/data/meta.json')
      .then((d) => {
        if (active) setMeta(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [meta]);

  return meta;
}

export function useDataset(key, enabled = true) {
  const [state, setState] = useState(() => ({
    key,
    data: memoryCache[key] || null,
    error: null,
  }));

  useEffect(() => {
    if (!enabled || !key || memoryCache[key]) return;
    let active = true;
    fetchJson(key, `/data/${key}.json`)
      .then((d) => {
        if (!active) return;
        setState({ key, data: d, error: null });
      })
      .catch((err) => {
        if (!active) return;
        setState({
          key,
          data: null,
          error: err instanceof Error ? err.message : '数据加载失败',
        });
      });
    return () => {
      active = false;
    };
  }, [key, enabled]);

  const cached = key ? memoryCache[key] : null;
  const resolvedData = cached || (state.key === key ? state.data : null);
  const resolvedError = !cached && state.key === key ? state.error : null;
  const loading = Boolean(enabled && key && !resolvedData && !resolvedError);

  return { data: resolvedData || [], loading, error: resolvedError };
}

export function findCachedPreview(path) {
  if (!path) return null;
  if (path.startsWith('/vps/') && memoryCache.vps) {
    return memoryCache.vps.find((v) => v.path === path) || null;
  }
  if (path.startsWith('/jichang/') && memoryCache.airports) {
    return memoryCache.airports.find((a) => a.path === path) || null;
  }
  if (memoryCache.apps) {
    return memoryCache.apps.find((a) => a.path === path) || null;
  }
  return null;
}
