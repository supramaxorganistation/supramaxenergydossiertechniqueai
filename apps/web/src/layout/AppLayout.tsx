import type { User } from '../types';

export type Screen = 'dashboard' | 'dossiers' | 'dossier-detail' | 'dossier-create' | 'admin';

const NAV = [
  { key: 'dashboard', icon: '📊', label: 'Tableau de bord' },
  { key: 'dossiers', icon: '📁', label: 'Dossiers' },
] as const;

const NAV_TECH = { key: 'dossier-create', icon: '➕', label: 'Nouveau dossier' } as const;
const NAV_ADMIN = { key: 'admin', icon: '🛡️', label: 'Administration' } as const;

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
          <div className="logo">⚡</div>
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
              <span className="nav-icon">{item.icon}</span>
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
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
