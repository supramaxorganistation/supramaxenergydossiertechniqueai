import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { api, setToken } from './api';
import type { ComplianceReport, Dossier, User } from './types';
import AppLayout, { type Screen } from './layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DossiersPage from './pages/DossiersPage';
import DossierDetailPage from './pages/DossierDetailPage';
import DossierCreatePage from './pages/DossierCreatePage';
import AdminPage from './pages/AdminPage';
import { LoadingScreen } from './components/ui';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compliance, setCompliance] = useState<ComplianceReport | null>(null);
  const [isLoadingCompliance, setIsLoadingCompliance] = useState(false);

  const selectedDossier = dossiers.find((d) => d._id === selectedId) || null;

  const loadDossiers = useCallback(async () => {
    try {
      const data = await api.listDossiers();
      setDossiers(data);
    } catch (err) {
      console.error('Erreur chargement dossiers:', err);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCheckedAuth(true);
      setLoading(false);
      return;
    }
    setToken(token);
    api
      .me()
      .then(async ({ user }) => {
        setCurrentUser(user);
        await loadDossiers();
      })
      .catch(() => {
        setToken(null);
      })
      .finally(() => {
        setCheckedAuth(true);
        setLoading(false);
      });
  }, [loadDossiers]);

  useEffect(() => {
    if (!selectedId || screen !== 'dossier-detail') return;
    let cancelled = false;
    setIsLoadingCompliance(true);
    api
      .compliance(selectedId)
      .then((report) => {
        if (!cancelled) setCompliance(report);
      })
      .catch(() => {
        if (!cancelled) setCompliance(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCompliance(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, screen]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setScreen('dashboard');
    loadDossiers();
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setScreen('dashboard');
    setDossiers([]);
    setSelectedId(null);
  };

  const openDossier = (dossier: Dossier) => {
    setSelectedId(dossier._id);
    setCompliance(null);
    setScreen('dossier-detail');
  };

  const refreshSelected = useCallback(async () => {
    if (!selectedId) return;
    await loadDossiers();
    try {
      setCompliance(await api.compliance(selectedId));
    } catch {
      setCompliance(null);
    }
  }, [selectedId, loadDossiers]);

  const handleDelete = async (dossier: Dossier) => {
    try {
      await api.deleteDossier(dossier._id);
      await loadDossiers();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  if (loading || !checkedAuth) {
    return <LoadingScreen label="Chargement de la plateforme..." />;
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const titles: Record<Screen, { title: string; subtitle?: string }> = {
    dashboard: {
      title: 'Tableau de bord',
      subtitle: `Bienvenue, ${currentUser.name || currentUser.email}`,
    },
    dossiers: { title: 'Gestion des dossiers', subtitle: 'Suivez et gérez les dossiers techniques' },
    'dossier-detail': {
      title: selectedDossier ? `Dossier — ${selectedDossier.customerDetails.name}` : 'Dossier',
    },
    'dossier-create': { title: 'Nouveau dossier', subtitle: 'Créez un dossier technique STEG' },
    admin: { title: 'Administration', subtitle: 'Gestion des utilisateurs et des rôles' },
  };

  return (
    <AppLayout
      currentUser={currentUser}
      active={screen}
      onNavigate={setScreen}
      onLogout={handleLogout}
      title={titles[screen].title}
      subtitle={titles[screen].subtitle}
    >
      {screen === 'dashboard' && (
        <DashboardPage
          dossiers={dossiers}
          userName={currentUser.name || currentUser.email}
          role={currentUser.role}
          onNavigate={setScreen}
        />
      )}

      {screen === 'dossiers' && (
        <DossiersPage
          dossiers={dossiers}
          currentUser={currentUser}
          onOpenDossier={openDossier}
          onNewDossier={() => setScreen('dossier-create')}
          onDeleteDossier={handleDelete}
        />
      )}

      {screen === 'dossier-detail' && selectedDossier && (
        <DossierDetailPage
          dossier={selectedDossier}
          currentUser={currentUser}
          compliance={compliance}
          isLoadingCompliance={isLoadingCompliance}
          onBack={() => setScreen('dossiers')}
          onRefresh={refreshSelected}
        />
      )}

      {screen === 'dossier-create' && (
        <DossierCreatePage
          onCreated={() => {
            loadDossiers();
            setScreen('dossiers');
          }}
          onCancel={() => setScreen('dossiers')}
        />
      )}

      {screen === 'admin' && currentUser.role === 'admin' && <AdminPage currentUser={currentUser} />}
    </AppLayout>
  );
}

export default App;
