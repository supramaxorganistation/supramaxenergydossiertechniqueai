import { useEffect, useState } from 'react';
import { erpApi } from '../erpApi';
import type { ErpStats } from '../erpTypes';
import { StatCard, EmptyState } from '../components/ui';
import type { Screen } from '../layout/AppLayout';

export default function ErpDashboardPage({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [stats, setStats] = useState<ErpStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    erpApi.stats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><span className="spinner" /> Loading ERP data...</div>;
  if (!stats) return <EmptyState icon="📊" title="Could not load ERP data" />;

  return (
    <>
      <div className="grid grid-4 mb-16">
        <StatCard icon="👥" value={stats.customerCount} label="Customers" color="blue" />
        <StatCard icon="📦" value={stats.productCount} label="Products" color="green" />
        <StatCard icon="📝" value={stats.quoteCount} label="Quotes" color="amber" />
        <StatCard icon="🛒" value={stats.salesOrderCount} label="Sales Orders" color="blue" />
      </div>

      <div className="grid grid-4 mb-16">
        <StatCard icon="📋" value={stats.purchaseOrderCount} label="Purchase Orders" color="red" />
        <StatCard icon="🏭" value={stats.supplierCount} label="Suppliers" color="blue" />
        <StatCard icon="📄" value={stats.invoiceCount} label="Invoices" color="green" />
        <StatCard icon="👤" value={stats.employeeCount} label="Employees" color="amber" />
      </div>

      <div className="grid grid-4 mb-16">
        <StatCard icon="⚠️" value={stats.lowStockProducts} label="Low Stock Items" color="red" />
        <StatCard icon="🚨" value={stats.overdueInvoices} label="Overdue Invoices" color="red" />
      </div>

      <div className="grid grid-2 mb-16">
        <div className="card">
          <h4 className="card-title">Revenue</h4>
          <p className="card-subtitle">Total invoiced amount</p>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#059669' }}>{stats.totalRevenue.toFixed(2)} <span style={{ fontSize: 14, fontWeight: 600 }}>TND</span></div>
        </div>
        <div className="card">
          <h4 className="card-title">Outstanding</h4>
          <p className="card-subtitle">Unpaid invoice amounts</p>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#dc2626' }}>{stats.totalOutstanding.toFixed(2)} <span style={{ fontSize: 14, fontWeight: 600 }}>TND</span></div>
        </div>
      </div>

      <div className="card">
        <h4 className="card-title">Quick Actions</h4>
        <p className="card-subtitle">Jump to any ERP module</p>
        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-customers')}>CRM</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-products')}>Products</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-quotes')}>Quotes</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-sales')}>Sales</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-purchases')}>Purchases</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-stock')}>Stock</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-accounting')}>Accounting</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-hr')}>HR</button>
          <button className="btn btn-primary" onClick={() => onNavigate('erp-settings')}>Settings</button>
        </div>
      </div>
    </>
  );
}
