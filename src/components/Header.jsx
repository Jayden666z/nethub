import { AppWindow, Cloud, Moon, Plane, Sun } from 'lucide-react';

export function Header({ activeSection, counts, theme, onToggleTheme, onNavigate }) {
  const navItems = [
    { id: 'apps', label: '应用目录', path: '/', icon: AppWindow, count: counts?.apps },
    { id: 'vps', label: 'VPS', path: '/vps', icon: Cloud, count: counts?.vps },
    { id: 'airports', label: '机场', path: '/jichang', icon: Plane, count: counts?.airports },
  ];

  return (
    <header className="site-header">
      <div className="container header-inner">
        <a
          href="/"
          className="brand-link"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
        >
          <img src="/favicon.svg" alt="" className="brand-mark" width="30" height="30" />
          <span>NetHub</span>
          <span className="brand-domain">nethub.best</span>
        </a>

        <nav className="desktop-nav" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={item.path}
                className={`nav-pill${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.path);
                }}
              >
                <Icon size={15} strokeWidth={2.1} aria-hidden="true" />
                <span>{item.label}</span>
                {item.count != null && <span className="nav-count">{item.count}</span>}
              </a>
            );
          })}
        </nav>

        <div className="header-actions">
          <button
            id="theme-toggle-btn"
            type="button"
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
