import type { User } from '../types';
import { Icon } from '../components/Icon';

export type Screen = 'dashboard' | 'dossiers' | 'dossier-detail' | 'dossier-create' | 'dossier-edit' | 'admin' | 'profile' | 'erp-dashboard' | 'erp-customers' | 'erp-products' | 'erp-quotes' | 'erp-sales' | 'erp-purchases' | 'erp-stock' | 'erp-accounting' | 'erp-hr' | 'erp-settings';

const NAV = [
  { key: 'dashboard', icon: 'dashboard', label: 'Tableau de bord' },
  { key: 'dossiers', icon: 'folder', label: 'Dossiers' },
] as const;

const NAV_ERP = [
  { key: 'erp-dashboard', icon: 'building', label: 'ERP Overview' },
  { key: 'erp-customers', icon: 'users', label: 'CRM' },
  { key: 'erp-products', icon: 'box', label: 'Products' },
  { key: 'erp-quotes', icon: 'file-text', label: 'Quotes' },
  { key: 'erp-sales', icon: 'cart', label: 'Sales' },
  { key: 'erp-purchases', icon: 'clipboard', label: 'Purchases' },
  { key: 'erp-stock', icon: 'inbox', label: 'Stock' },
  { key: 'erp-accounting', icon: 'wallet', label: 'Accounting' },
  { key: 'erp-hr', icon: 'user', label: 'HR' },
  { key: 'erp-settings', icon: 'settings', label: 'Settings' },
] as const;

const NAV_TECH = { key: 'dossier-create', icon: 'plus-circle', label: 'Nouveau dossier' } as const;
const NAV_ADMIN = { key: 'admin', icon: 'shield', label: 'Administration' } as const;

export default function AppLayout({
  currentUser,
  active,
  onNavigate,
  onLogout,
  title,
  subtitle,
  children,
}: {
  currentUser: User;
  active: Screen;
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const canCreate = currentUser.role === 'admin' || currentUser.role === 'technician';
  const isAdmin = currentUser.role === 'admin';
  const initials = (currentUser.name || currentUser.email || '?').slice(0, 1).toUpperCase();

  const items: { key: Screen; icon: string; label: string }[] = [
    ...NAV,
    ...(canCreate ? [NAV_TECH] : []),
    ...(isAdmin ? [NAV_ADMIN] : []),
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo">
            <img src="/logo.png" alt="Supramax Energy" />
          </div>
          <div>
            <div className="brand-name">Supramax Energy</div>
            <div className="brand-sub">Dossiers techniques PV</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">Navigation</div>
          {items.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${active === item.key ? 'active' : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="nav-icon"><Icon name={item.icon} size={17} /></span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
          <div className="nav-section">ERP Modules</div>
          {NAV_ERP.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${active === item.key ? 'active' : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="nav-icon"><Icon name={item.icon} size={17} /></span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{initials}</div>
            <div className="user-meta">
              <div className="user-name">{currentUser.name || currentUser.email}</div>
              <div className="user-role">
                {currentUser.role === 'admin' ? 'Administrateur' : currentUser.role === 'technician' ? 'Technicien' : 'Client'}
              </div>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <Icon name="logout" size={15} />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="page-title">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className={`profile-btn ${active === 'profile' ? 'active' : ''}`}
            onClick={() => onNavigate('profile')}
            title="Gérer mon profil"
          >
            <span className="profile-btn-avatar">{initials}</span>
            <span className="profile-btn-label">Mon profil</span>
          </button>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
