import { AppWindow, Cloud, Plane, Search } from 'lucide-react';

export function MobileNav({ activeSection, onNavigate, onFocusSearch }) {
  const tabs = [
    { id: 'apps', label: '应用', path: '/', icon: AppWindow },
    { id: 'vps', label: 'VPS', path: '/vps', icon: Cloud },
    { id: 'airports', label: '机场', path: '/jichang', icon: Plane },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="移动端底部导航">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeSection === tab.id;
        return (
          <a
            key={tab.id}
            href={tab.path}
            className={`mobile-tab${isActive ? ' is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(tab.path);
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} aria-hidden="true" />
            <span>{tab.label}</span>
          </a>
        );
      })}
      <button
        type="button"
        className="mobile-tab"
        onClick={onFocusSearch}
        aria-label="聚焦搜索框"
      >
        <Search size={20} strokeWidth={1.8} aria-hidden="true" />
        <span>搜索</span>
      </button>
    </nav>
  );
}
