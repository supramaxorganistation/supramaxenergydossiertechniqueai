import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { api, setToken } from './api';
import { getToken } from './api';
import { initErpApi } from './erpApi';
import type { ComplianceReport, Dossier, User } from './types';
import AppLayout, { type Screen } from './layout/AppLayout';
import LoginPage, { ResetPasswordPage } from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DossiersPage from './pages/DossiersPage';
import DossierDetailPage from './pages/DossierDetailPage';
import DossierCreatePage from './pages/DossierCreatePage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import ErpDashboardPage from './pages/ErpDashboardPage';
import CustomersPage from './pages/CustomersPage';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import PurchasesPage from './pages/PurchasesPage';
import StockPage from './pages/StockPage';
import AccountingPage from './pages/AccountingPage';
import EmployeesPage from './pages/EmployeesPage';
import QuotesPage from './pages/QuotesPage';
import SettingsPage from './pages/SettingsPage';
import { LoadingScreen } from './components/ui';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editDossierId, setEditDossierId] = useState<string | null>(null);
  const [compliance, setCompliance] = useState<ComplianceReport | null>(null);
  const [isLoadingCompliance, setIsLoadingCompliance] = useState(false);
  const [hashRoute, setHashRoute] = useState(window.location.hash);

  // Track hash changes so hash-based routes (e.g. reset-password) re-render
  useEffect(() => {
    const onHashChange = () => setHashRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Initialize ERP API with token getter
  useEffect(() => { initErpApi(getToken); }, []);

  const selectedDossier = dossiers.find((d) => d._id === selectedId) || null;
  const editDossier = dossiers.find((d) => d._id === editDossierId) || null;

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
    // A stale #/reset-password/… hash must not resurface after logout
    if (window.location.hash) window.location.hash = '';
    loadDossiers();
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setScreen('dashboard');
    setDossiers([]);
    setSelectedId(null);
    // Always land on the login page, never on a leftover hash route
    if (window.location.hash) window.location.hash = '';
  };

  const openDossier = (dossier: Dossier) => {
    setSelectedId(dossier._id);
    setCompliance(null);
    setScreen('dossier-detail');
  };

  const editDossierAction = (dossier: Dossier) => {
    setEditDossierId(dossier._id);
    setScreen('dossier-edit');
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
    // Check for reset-password hash route
    if (hashRoute.startsWith('#/reset-password/')) {
      const token = hashRoute.replace('#/reset-password/', '');
      return <ResetPasswordPage token={token} onDone={() => { window.location.hash = ''; }} />;
    }
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
    'dossier-edit': { title: editDossier ? `Modifier — ${editDossier.customerDetails.name}` : 'Modifier dossier', subtitle: 'Modifiez les informations du dossier' },
    admin: { title: 'Administration', subtitle: 'Gestion des utilisateurs et des rôles' },
    profile: { title: 'Mon profil', subtitle: 'Gérez votre compte et votre Face ID' },
    'erp-dashboard': { title: 'ERP Overview', subtitle: 'Enterprise Resource Planning' },
    'erp-customers': { title: 'CRM', subtitle: 'Customers & Suppliers management' },
    'erp-products': { title: 'Products', subtitle: 'Product catalog & inventory' },
    'erp-quotes': { title: 'Quotes', subtitle: 'Quotations & estimations' },
    'erp-sales': { title: 'Sales', subtitle: 'Sales orders & invoices' },
    'erp-purchases': { title: 'Purchases', subtitle: 'Purchase orders & suppliers' },
    'erp-stock': { title: 'Stock', subtitle: 'Warehouses & stock movements' },
    'erp-accounting': { title: 'Accounting', subtitle: 'Chart of accounts & journal entries' },
    'erp-hr': { title: 'HR', subtitle: 'Employees & attendance' },
    'erp-settings': { title: 'Settings', subtitle: 'ERP configuration & preferences' },
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
          onEditDossier={editDossierAction}
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

      {screen === 'dossier-edit' && editDossier && (
        <DossierCreatePage
          editDossier={editDossier}
          onCreated={() => {
            loadDossiers();
            setScreen('dossiers');
          }}
          onCancel={() => setScreen('dossiers')}
        />
      )}

      {screen === 'admin' && currentUser.role === 'admin' && <AdminPage currentUser={currentUser} />}

      {screen === 'profile' && (
        <ProfilePage currentUser={currentUser} onUserUpdated={setCurrentUser} />
      )}

      {screen === 'erp-dashboard' && <ErpDashboardPage onNavigate={setScreen} />}
      {screen === 'erp-customers' && <CustomersPage />}
      {screen === 'erp-products' && <ProductsPage />}
      {screen === 'erp-quotes' && <QuotesPage />}
      {screen === 'erp-sales' && <SalesPage />}
      {screen === 'erp-purchases' && <PurchasesPage />}
      {screen === 'erp-stock' && <StockPage />}
      {screen === 'erp-accounting' && <AccountingPage />}
      {screen === 'erp-hr' && <EmployeesPage />}
      {screen === 'erp-settings' && <SettingsPage />}
    </AppLayout>
  );
}

export default App;
