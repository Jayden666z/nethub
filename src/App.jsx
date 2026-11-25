import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from './hooks/useTheme.js';
import { useDataset, useMeta } from './hooks/useCatalogData.js';
import { Header } from './components/Header.jsx';
import { MobileNav } from './components/MobileNav.jsx';
import { AppsView } from './components/AppsView.jsx';
import { VpsView } from './components/VpsView.jsx';
import { AirportsView } from './components/AirportsView.jsx';
import { DetailView } from './components/DetailView.jsx';

function parseRoute(pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/') return { view: 'apps', section: 'apps', path: '/' };
  if (clean === '/vps') return { view: 'vps', section: 'vps', path: '/vps' };
  if (clean === '/jichang') return { view: 'airports', section: 'airports', path: '/jichang' };
  if (/^\/(apps|servers|subscription-tools|rules)\//.test(clean)) {
    return { view: 'detail', section: 'apps', path: clean };
  }
  if (/^\/vps\//.test(clean)) {
    return { view: 'detail', section: 'vps', path: clean };
  }
  if (/^\/jichang\//.test(clean)) {
    return { view: 'detail', section: 'airports', path: clean };
  }
  return { view: 'apps', section: 'apps', path: '/' };
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [pathname, setPathname] = useState(() => window.location.pathname || '/');
  const searchRef = useRef(null);

  const route = parseRoute(pathname);
  const meta = useMeta();

  const appsState = useDataset('apps', true);
  const vpsState = useDataset('vps', route.section === 'vps');
  const airportsState = useDataset('airports', route.section === 'airports');

  const navigate = useCallback((nextPath) => {
    if (nextPath === window.location.pathname) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.history.pushState({}, '', nextPath);
    setPathname(nextPath);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) {
      window.history.back();
      return;
    }
    const fallback =
      route.section === 'vps' ? '/vps' : route.section === 'airports' ? '/jichang' : '/';
    navigate(fallback);
  }, [navigate, route.section]);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname || '/');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const titles = {
      apps: 'NetHub · 网络工具与应用目录 (nethub.best)',
      vps: 'VPS 套餐与线路对比 · NetHub',
      airports: '机场导航与套餐对比 · NetHub',
      detail: '条目详情 · NetHub',
    };
    document.title = titles[route.view] || titles.apps;
  }, [route.view]);

  // Press "/" to focus search quickly on desktop
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        if (searchRef.current) {
          e.preventDefault();
          searchRef.current.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const focusSearch = useCallback(() => {
    if (route.view === 'detail') {
      const target =
        route.section === 'vps' ? '/vps' : route.section === 'airports' ? '/jichang' : '/';
      navigate(target);
      setTimeout(() => searchRef.current?.focus(), 80);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => searchRef.current?.focus(), 160);
    }
  }, [navigate, route.section, route.view]);

  return (
    <div className="app-shell">
      <Header
        activeSection={route.section}
        counts={meta?.counts}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={navigate}
      />

      <main className="main-content">
        <div className="container">
          {route.view === 'apps' && (
            <AppsView
              apps={appsState.data}
              loading={appsState.loading}
              error={appsState.error}
              syncedAt={meta?.syncedAt}
              searchRef={searchRef}
              onNavigate={navigate}
            />
          )}

          {route.view === 'vps' && (
            <VpsView
              items={vpsState.data}
              providers={meta?.facets?.vpsProviders}
              loading={vpsState.loading}
              error={vpsState.error}
              searchRef={searchRef}
              onNavigate={navigate}
            />
          )}

          {route.view === 'airports' && (
            <AirportsView
              items={airportsState.data}
              loading={airportsState.loading}
              error={airportsState.error}
              searchRef={searchRef}
              onNavigate={navigate}
            />
          )}

          {route.view === 'detail' && (
            <DetailView key={route.path} path={route.path} onBack={handleBack} />
          )}
        </div>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <strong>NetHub</strong> · nethub.best — 独立前端实现的网络工具、VPS 与机场目录
          </div>
          <div className="footer-links">
            <span>
              公开资料来源：
              <a href="https://huarun.win/" target="_blank" rel="noopener noreferrer">
                huarun.win
              </a>
            </span>
            {meta?.syncedAt && (
              <span className="tabular">
                最近同步：{new Date(meta.syncedAt).toLocaleString('zh-CN')}
              </span>
            )}
          </div>
        </div>
      </footer>

      <MobileNav
        activeSection={route.section}
        onNavigate={navigate}
        onFocusSearch={focusSearch}
      />
    </div>
  );
}
