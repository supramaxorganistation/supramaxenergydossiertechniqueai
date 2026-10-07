import { useEffect, useState } from 'react';
import { erpApi } from '../erpApi';
import type { ErpStats } from '../erpTypes';
import { StatCard, EmptyState } from '../components/ui';
import InstallationsDashboardWidget from '../components/installations/InstallationsDashboardWidget';
import type { Screen } from '../layout/AppLayout';

export default function ErpDashboardPage({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [stats, setStats] = useState<ErpStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    erpApi.stats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><span className="spinner" /> Chargement des données ERP...</div>;
  if (!stats) return <EmptyState icon="dashboard" title="Impossible de charger les données ERP" />;

  return (
    <>
      <div className="grid grid-4 mb-16">
        <StatCard icon="users" value={stats.customerCount} label="Clients" color="blue" />
        <StatCard icon="box" value={stats.productCount} label="Produits" color="green" />
        <StatCard icon="file-text" value={stats.quoteCount} label="Devis" color="amber" />
        <StatCard icon="cart" value={stats.salesOrderCount} label="Commandes de vente" color="blue" />
      </div>

      <div className="grid grid-4 mb-16">
        <StatCard icon="clipboard" value={stats.purchaseOrderCount} label="Commandes d’achat" color="red" />
        <StatCard icon="building" value={stats.supplierCount} label="Fournisseurs" color="blue" />
        <StatCard icon="file-text" value={stats.invoiceCount} label="Factures" color="green" />
        <StatCard icon="user" value={stats.employeeCount} label="Employés" color="amber" />
      </div>

      <div className="grid grid-4 mb-16">
        <StatCard icon="alert-triangle" value={stats.lowStockProducts} label="Articles en stock faible" color="red" />
        <StatCard icon="clock" value={stats.overdueInvoices} label="Factures en retard" color="red" />
      </div>

      <InstallationsDashboardWidget onNavigate={onNavigate} />

      <div className="grid grid-2 mb-16">
        <div className="card">
          <h4 className="card-title">Chiffre d’affaires</h4>
          <p className="card-subtitle">Montant total facturé</p>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#059669' }}>{stats.totalRevenue.toFixed(2)} <span style={{ fontSize: 14, fontWeight: 600 }}>TND</span></div>
        </div>
        <div className="card">
          <h4 className="card-title">Impayés</h4>
          <p className="card-subtitle">Montants des factures impayées</p>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#dc2626' }}>{stats.totalOutstanding.toFixed(2)} <span style={{ fontSize: 14, fontWeight: 600 }}>TND</span></div>
        </div>
      </div>

      <div className="card">
        <h4 className="card-title">Actions rapides</h4>
        <p className="card-subtitle">Accéder à un module ERP</p>
        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-customers')}>CRM</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-products')}>Produits</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-quotes')}>Devis</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-installations')}>Installations</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-sales')}>Ventes</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-purchases')}>Achats</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-stock')}>Stock</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-accounting')}>Comptabilité</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-hr')}>RH</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-settings')}>Paramètres</button>
        </div>
      </div>
    </>
  );
}
