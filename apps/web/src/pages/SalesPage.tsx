import { useEffect, useMemo, useState } from 'react';
import { erpApi } from '../erpApi';
import type { ErpSalesOrder, ErpInvoice, ErpCustomer, ErpProduct, SalesOrderStatus, InvoiceStatus, LineItem } from '../erpTypes';
import { Badge, EmptyState } from '../components/ui';
import { Icon } from '../components/Icon';
import { useFormValidation, required, nonNegative, atLeastOneItem } from '../useFormValidation';

type Tab = 'orders' | 'invoices';
const SO_STATUS: { value: SalesOrderStatus; label: string; color: 'gray' | 'blue' | 'green' | 'amber' | 'red' }[] = [
  { value: 'draft', label: 'Brouillon', color: 'gray' }, { value: 'confirmed', label: 'Confirmée', color: 'blue' },
  { value: 'delivered', label: 'Livrée', color: 'green' }, { value: 'invoiced', label: 'Facturée', color: 'amber' }, { value: 'cancelled', label: 'Annulée', color: 'red' },
];
const INV_STATUS: { value: InvoiceStatus; label: string; color: 'gray' | 'blue' | 'green' | 'amber' | 'red' }[] = [
  { value: 'draft', label: 'Brouillon', color: 'gray' }, { value: 'unpaid', label: 'Impayée', color: 'red' },
  { value: 'partially_paid', label: 'Partielle', color: 'amber' }, { value: 'paid', label: 'Payée', color: 'green' }, { value: 'cancelled', label: 'Annulée', color: 'red' }, { value: 'overdue', label: 'En retard', color: 'red' },
];

const emptyItem: LineItem = { product: '', productName: '', qty: 1, rate: 0, amount: 0 };

export default function SalesPage() {
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<ErpSalesOrder[]>([]);
  const [invoices, setInvoices] = useState<ErpInvoice[]>([]);
  const [customers, setCustomers] = useState<ErpCustomer[]>([]);
  const [products, setProducts] = useState<ErpProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [soForm, setSoForm] = useState({ customer: '', taxRate: 19, discount: 0, notes: '', items: [{ ...emptyItem }] as LineItem[], deliveryDate: '' });
  const [invForm, setInvForm] = useState({ customer: '', salesOrder: '', taxRate: 19, notes: '', items: [{ ...emptyItem }] as LineItem[], dueDate: '', paidAmount: 0 });

  const soRules = useMemo(() => ({
    customer: [required('Client')],
    items: [atLeastOneItem('ligne')],
    taxRate: [nonNegative('Taux de taxe')],
    discount: [nonNegative('Remise')],
  }), []);
  const soValidation = useFormValidation(soRules);

  const invRules = useMemo(() => ({
    customer: [required('Client')],
    items: [atLeastOneItem('ligne')],
    taxRate: [nonNegative('Taux de taxe')],
    paidAmount: [nonNegative('Montant payé')],
  }), []);
  const invValidation = useFormValidation(invRules);

  const load = async () => {
    setLoading(true);
    try { const [o, i, c, p] = await Promise.all([erpApi.listSalesOrders(), erpApi.listInvoices(), erpApi.listCustomers(), erpApi.listProducts()]); setOrders(o); setInvoices(i); setCustomers(c); setProducts(p); } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetSoForm = () => { setSoForm({ customer: '', taxRate: 19, discount: 0, notes: '', items: [{ ...emptyItem }], deliveryDate: '' }); setEditingId(null); setShowForm(false); soValidation.clearErrors(); };
  const resetInvForm = () => { setInvForm({ customer: '', salesOrder: '', taxRate: 19, notes: '', items: [{ ...emptyItem }], dueDate: '', paidAmount: 0 }); setEditingId(null); setShowForm(false); invValidation.clearErrors(); };

  const updateLineItem = (items: LineItem[], idx: number, field: keyof LineItem, val: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = val;
    if (field === 'product') {
      const p = products.find(pr => pr._id === val);
      if (p) { updated[idx].productName = p.name; updated[idx].rate = p.sellingPrice || 0; }
    }
    updated[idx].amount = (updated[idx].qty || 0) * (updated[idx].rate || 0);
    return updated;
  };

  const addItem = (items: LineItem[]) => [...items, { ...emptyItem }];
  const removeItem = (items: LineItem[], idx: number) => items.length > 1 ? items.filter((_, i) => i !== idx) : items;

  const handleSoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soValidation.validate(soForm)) return;
    try {
      const payload = { ...soForm, items: soForm.items.filter(i => i.product) };
      if (editingId) await erpApi.updateSalesOrder(editingId, payload);
      else await erpApi.createSalesOrder(payload);
      resetSoForm(); await load();
    } catch (err: any) { alert(err.message); }
  };

  const handleInvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invValidation.validate(invForm)) return;
    try {
      const payload = { ...invForm, items: invForm.items.filter(i => i.product) };
      if (editingId) await erpApi.updateInvoice(editingId, payload);
      else await erpApi.createInvoice(payload);
      resetInvForm(); await load();
    } catch (err: any) { alert(err.message); }
  };

  const updateSoStatus = async (id: string, status: SalesOrderStatus) => {
    try { await erpApi.updateSalesOrder(id, { status }); await load(); } catch (err: any) { alert(err.message); }
  };

  return (
    <>
      <div className="tabs">
        <button className={`tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => { setTab('orders'); setShowForm(false); }}>Commandes de vente ({orders.length})</button>
        <button className={`tab ${tab === 'invoices' ? 'active' : ''}`} onClick={() => { setTab('invoices'); setShowForm(false); }}>Factures ({invoices.length})</button>
      </div>

      <div className="flex-between mb-16">
        <h3 className="page-section-title">{tab === 'orders' ? 'Commandes de vente' : 'Factures'}</h3>
        <button className="btn btn-primary" onClick={() => { tab === 'orders' ? resetSoForm() : resetInvForm(); setShowForm(true); }}>+ Nouvelle {tab === 'orders' ? 'commande' : 'facture'}</button>
      </div>

      {showForm && tab === 'orders' && (
        <div className="card mb-16">
          <h4 className="card-title">{editingId ? 'Modifier' : 'Nouvelle'} commande de vente</h4>
          <form onSubmit={handleSoSubmit} noValidate>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Client *</label>
                <select className={`select ${soValidation.errors.customer ? 'input-invalid' : ''}`} value={soForm.customer} onChange={e => setSoForm({ ...soForm, customer: e.target.value })}><option value="">Sélectionner…</option>{customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
                {soValidation.errors.customer && <span className="field-error">{soValidation.errors.customer}</span>}
              </div>
              <div className="form-group"><label className="form-label">Date de livraison</label><input className="input" type="date" value={soForm.deliveryDate} onChange={e => setSoForm({ ...soForm, deliveryDate: e.target.value })} /></div>
              <div className="form-group">
                <label className="form-label">Taux de taxe (%)</label>
                <input className={`input ${soValidation.errors.taxRate ? 'input-invalid' : ''}`} type="number" value={soForm.taxRate} onChange={e => setSoForm({ ...soForm, taxRate: +e.target.value })} />
                {soValidation.errors.taxRate && <span className="field-error">{soValidation.errors.taxRate}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Remise (TND)</label>
                <input className={`input ${soValidation.errors.discount ? 'input-invalid' : ''}`} type="number" step="0.01" value={soForm.discount} onChange={e => setSoForm({ ...soForm, discount: +e.target.value })} />
                {soValidation.errors.discount && <span className="field-error">{soValidation.errors.discount}</span>}
              </div>
            </div>
            <div className="form-section-title">Lignes</div>
            {soValidation.errors.items && <div className="form-error-banner"><Icon name="alert-triangle" size={15} /> {soValidation.errors.items}</div>}
            {soForm.items.map((item, idx) => (
              <div key={idx} className="flex gap-8 mb-16" style={{ alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}><label className="form-label">Produit</label><select className="select" value={item.product as string} onChange={e => setSoForm({ ...soForm, items: updateLineItem(soForm.items, idx, 'product', e.target.value) })}><option value="">Sélectionner…</option>{products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku || '—'})</option>)}</select></div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}><label className="form-label">Qté</label><input className="input" type="number" min="1" value={item.qty} onChange={e => setSoForm({ ...soForm, items: updateLineItem(soForm.items, idx, 'qty', +e.target.value) })} /></div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}><label className="form-label">Prix</label><input className="input" type="number" step="0.01" value={item.rate} onChange={e => setSoForm({ ...soForm, items: updateLineItem(soForm.items, idx, 'rate', +e.target.value) })} /></div>
                <div style={{ fontWeight: 700, minWidth: 80, paddingBottom: 10 }}>{((item.qty || 0) * (item.rate || 0)).toFixed(2)}</div>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setSoForm({ ...soForm, items: removeItem(soForm.items, idx) })}>×</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm mb-16" onClick={() => setSoForm({ ...soForm, items: addItem(soForm.items) })}>+ Ajouter une ligne</button>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="textarea" rows={2} value={soForm.notes} onChange={e => setSoForm({ ...soForm, notes: e.target.value })} /></div>
            <div className="flex gap-8"><button type="submit" className="btn btn-primary">{editingId ? 'Mettre à jour' : 'Créer'}</button><button type="button" className="btn btn-ghost" onClick={resetSoForm}>Annuler</button></div>
          </form>
        </div>
      )}

      {showForm && tab === 'invoices' && (
        <div className="card mb-16">
          <h4 className="card-title">{editingId ? 'Modifier' : 'Nouvelle'} facture</h4>
          <form onSubmit={handleInvSubmit} noValidate>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Client *</label>
                <select className={`select ${invValidation.errors.customer ? 'input-invalid' : ''}`} value={invForm.customer} onChange={e => setInvForm({ ...invForm, customer: e.target.value })}><option value="">Sélectionner…</option>{customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
                {invValidation.errors.customer && <span className="field-error">{invValidation.errors.customer}</span>}
              </div>
              <div className="form-group"><label className="form-label">Commande de vente</label><select className="select" value={invForm.salesOrder} onChange={e => setInvForm({ ...invForm, salesOrder: e.target.value })}><option value="">Aucune</option>{orders.filter(o => o.status !== 'cancelled').map(o => <option key={o._id} value={o._id}>{o.orderNumber}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Date d’échéance</label><input className="input" type="date" value={invForm.dueDate} onChange={e => setInvForm({ ...invForm, dueDate: e.target.value })} /></div>
              <div className="form-group">
                <label className="form-label">Taux de taxe (%)</label>
                <input className={`input ${invValidation.errors.taxRate ? 'input-invalid' : ''}`} type="number" value={invForm.taxRate} onChange={e => setInvForm({ ...invForm, taxRate: +e.target.value })} />
                {invValidation.errors.taxRate && <span className="field-error">{invValidation.errors.taxRate}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Montant payé</label>
                <input className={`input ${invValidation.errors.paidAmount ? 'input-invalid' : ''}`} type="number" step="0.01" value={invForm.paidAmount} onChange={e => setInvForm({ ...invForm, paidAmount: +e.target.value })} />
                {invValidation.errors.paidAmount && <span className="field-error">{invValidation.errors.paidAmount}</span>}
              </div>
            </div>
            <div className="form-section-title">Lignes</div>
            {invValidation.errors.items && <div className="form-error-banner"><Icon name="alert-triangle" size={15} /> {invValidation.errors.items}</div>}
            {invForm.items.map((item, idx) => (
              <div key={idx} className="flex gap-8 mb-16" style={{ alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}><label className="form-label">Produit</label><select className="select" value={item.product as string} onChange={e => setInvForm({ ...invForm, items: updateLineItem(invForm.items, idx, 'product', e.target.value) })}><option value="">Sélectionner…</option>{products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}><label className="form-label">Qté</label><input className="input" type="number" min="1" value={item.qty} onChange={e => setInvForm({ ...invForm, items: updateLineItem(invForm.items, idx, 'qty', +e.target.value) })} /></div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}><label className="form-label">Prix</label><input className="input" type="number" step="0.01" value={item.rate} onChange={e => setInvForm({ ...invForm, items: updateLineItem(invForm.items, idx, 'rate', +e.target.value) })} /></div>
                <div style={{ fontWeight: 700, minWidth: 80, paddingBottom: 10 }}>{((item.qty || 0) * (item.rate || 0)).toFixed(2)}</div>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setInvForm({ ...invForm, items: removeItem(invForm.items, idx) })}>×</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm mb-16" onClick={() => setInvForm({ ...invForm, items: addItem(invForm.items) })}>+ Ajouter une ligne</button>
            <div className="flex gap-8"><button type="submit" className="btn btn-primary">{editingId ? 'Mettre à jour' : 'Créer'}</button><button type="button" className="btn btn-ghost" onClick={resetInvForm}>Annuler</button></div>
          </form>
        </div>
      )}

      {loading ? <div className="loading-screen"><span className="spinner" /> Chargement...</div> : tab === 'orders' ? (
        orders.length === 0 ? <EmptyState icon="cart" title="Aucune commande de vente" /> : (
          <div className="table-wrap"><table className="data"><thead><tr><th>N° commande</th><th>Client</th><th>Date</th><th>Total</th><th>Statut</th><th>Actions</th></tr></thead><tbody>
            {orders.map(o => (
              <tr key={o._id}>
                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{o.orderNumber}</td>
                <td>{typeof o.customer === 'object' ? o.customer.name : o.customerName}</td>
                <td>{o.date ? new Date(o.date).toLocaleDateString() : '—'}</td>
                <td style={{ fontWeight: 700 }}>{(o.grandTotal || 0).toFixed(2)} TND</td>
                <td><Badge color={SO_STATUS.find(s => s.value === o.status)?.color || 'gray'}>{SO_STATUS.find(s => s.value === o.status)?.label || o.status}</Badge></td>
                <td><div className="row-actions">
                  {o.status === 'draft' && <button className="btn btn-success btn-sm" onClick={() => updateSoStatus(o._id, 'confirmed')}>Confirmer</button>}
                  {o.status === 'confirmed' && <button className="btn btn-success btn-sm" onClick={() => updateSoStatus(o._id, 'delivered')}>Livrer</button>}
                  <button className="btn btn-danger btn-sm" onClick={async () => { await erpApi.deleteSalesOrder(o._id); await load(); }}>Supprimer</button>
                </div></td>
              </tr>
            ))}
          </tbody></table></div>
        )
      ) : (
        invoices.length === 0 ? <EmptyState icon="file-text" title="Aucune facture" /> : (
          <div className="table-wrap"><table className="data"><thead><tr><th>N° facture</th><th>Client</th><th>Date</th><th>Total</th><th>Payé</th><th>Impayé</th><th>Statut</th></tr></thead><tbody>
            {invoices.map(inv => (
              <tr key={inv._id}>
                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                <td>{typeof inv.customer === 'object' ? inv.customer.name : inv.customerName}</td>
                <td>{inv.date ? new Date(inv.date).toLocaleDateString() : '—'}</td>
                <td style={{ fontWeight: 700 }}>{(inv.grandTotal || 0).toFixed(2)}</td>
                <td style={{ color: '#059669' }}>{(inv.paidAmount || 0).toFixed(2)}</td>
                <td style={{ color: '#dc2626', fontWeight: 600 }}>{(inv.outstandingAmount || 0).toFixed(2)}</td>
                <td><Badge color={INV_STATUS.find(s => s.value === inv.status)?.color || 'gray'}>{INV_STATUS.find(s => s.value === inv.status)?.label || inv.status}</Badge></td>
              </tr>
            ))}
          </tbody></table></div>
        )
      )}
    </>
  );
}
