import { useEffect, useMemo, useState } from 'react';
import { erpApi } from '../erpApi';
import type { ErpPurchaseOrder, ErpSupplier, ErpProduct, PurchaseOrderStatus, LineItem } from '../erpTypes';
import { Badge, EmptyState } from '../components/ui';
import { useFormValidation, required, nonNegative, atLeastOneItem } from '../useFormValidation';

const STATUS_OPTS: { value: PurchaseOrderStatus; label: string; color: 'gray' | 'blue' | 'green' | 'red' }[] = [
  { value: 'draft', label: 'Draft', color: 'gray' }, { value: 'ordered', label: 'Ordered', color: 'blue' },
  { value: 'received', label: 'Received', color: 'green' }, { value: 'cancelled', label: 'Cancelled', color: 'red' },
];
const emptyItem: LineItem = { product: '', productName: '', qty: 1, rate: 0, amount: 0 };

export default function PurchasesPage() {
  const [orders, setOrders] = useState<ErpPurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<ErpSupplier[]>([]);
  const [products, setProducts] = useState<ErpProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ supplier: '', taxRate: 19, notes: '', items: [{ ...emptyItem }] as LineItem[], expectedDate: '' });

  const rules = useMemo(() => ({
    supplier: [required('Supplier')],
    items: [atLeastOneItem('line item')],
    taxRate: [nonNegative('Tax rate')],
  }), []);
  const { errors, validate, clearErrors } = useFormValidation(rules);

  const load = async () => {
    setLoading(true);
    try { const [o, s, p] = await Promise.all([erpApi.listPurchaseOrders(), erpApi.listSuppliers(), erpApi.listProducts()]); setOrders(o); setSuppliers(s); setProducts(p); } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ supplier: '', taxRate: 19, notes: '', items: [{ ...emptyItem }], expectedDate: '' }); setShowForm(false); clearErrors(); };

  const updateItem = (idx: number, field: keyof LineItem, val: any) => {
    const updated = [...form.items]; (updated[idx] as any)[field] = val;
    if (field === 'product') { const p = products.find(pr => pr._id === val); if (p) { updated[idx].productName = p.name; updated[idx].rate = p.buyingPrice || 0; } }
    updated[idx].amount = (updated[idx].qty || 0) * (updated[idx].rate || 0);
    setForm({ ...form, items: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(form)) return;
    try { await erpApi.createPurchaseOrder({ ...form, items: form.items.filter(i => i.product) }); resetForm(); await load(); } catch (err: any) { alert(err.message); }
  };

  const updateStatus = async (id: string, status: PurchaseOrderStatus) => {
    try { await erpApi.updatePurchaseOrder(id, { status }); await load(); } catch (err: any) { alert(err.message); }
  };

  return (
    <>
      <div className="flex-between mb-16">
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>Purchase Orders</h3>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ New Purchase Order</button>
      </div>

      {showForm && (
        <div className="card mb-16">
          <h4 className="card-title">New Purchase Order</h4>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Supplier *</label>
                <select className={`select ${errors.supplier ? 'input-invalid' : ''}`} value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}><option value="">Select...</option>{suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select>
                {errors.supplier && <span className="field-error">{errors.supplier}</span>}
              </div>
              <div className="form-group"><label className="form-label">Expected Date</label><input className="input" type="date" value={form.expectedDate} onChange={e => setForm({ ...form, expectedDate: e.target.value })} /></div>
              <div className="form-group">
                <label className="form-label">Tax Rate (%)</label>
                <input className={`input ${errors.taxRate ? 'input-invalid' : ''}`} type="number" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: +e.target.value })} />
                {errors.taxRate && <span className="field-error">{errors.taxRate}</span>}
              </div>
            </div>
            <div className="form-section-title">Line Items</div>
            {errors.items && <div className="form-error-banner">⚠ {errors.items}</div>}
            {form.items.map((item, idx) => (
              <div key={idx} className="flex gap-8 mb-16" style={{ alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}><label className="form-label">Product</label><select className="select" value={item.product as string} onChange={e => updateItem(idx, 'product', e.target.value)}><option value="">Select...</option>{products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}><label className="form-label">Qty</label><input className="input" type="number" min="1" value={item.qty} onChange={e => updateItem(idx, 'qty', +e.target.value)} /></div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}><label className="form-label">Rate</label><input className="input" type="number" step="0.01" value={item.rate} onChange={e => updateItem(idx, 'rate', +e.target.value)} /></div>
                <div style={{ fontWeight: 700, minWidth: 80, paddingBottom: 10 }}>{((item.qty || 0) * (item.rate || 0)).toFixed(2)}</div>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}>×</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm mb-16" onClick={() => setForm({ ...form, items: [...form.items, { ...emptyItem }] })}>+ Add Line</button>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="textarea" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex gap-8"><button type="submit" className="btn btn-primary">Create</button><button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button></div>
          </form>
        </div>
      )}

      {loading ? <div className="loading-screen"><span className="spinner" /> Loading...</div> : orders.length === 0 ? (
        <EmptyState icon="📋" title="No purchase orders" subtitle="Create your first purchase order." />
      ) : (
        <div className="table-wrap"><table className="data"><thead><tr><th>PO #</th><th>Supplier</th><th>Date</th><th>Expected</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {orders.map(o => (
            <tr key={o._id}>
              <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{o.orderNumber}</td>
              <td>{typeof o.supplier === 'object' ? o.supplier.name : o.supplierName}</td>
              <td>{o.date ? new Date(o.date).toLocaleDateString() : '—'}</td>
              <td>{o.expectedDate ? new Date(o.expectedDate).toLocaleDateString() : '—'}</td>
              <td style={{ fontWeight: 700 }}>{(o.grandTotal || 0).toFixed(2)} TND</td>
              <td><Badge color={STATUS_OPTS.find(s => s.value === o.status)?.color || 'gray'}>{STATUS_OPTS.find(s => s.value === o.status)?.label || o.status}</Badge></td>
              <td><div className="row-actions">
                {o.status === 'draft' && <button className="btn btn-success btn-sm" onClick={() => updateStatus(o._id, 'ordered')}>Order</button>}
                {o.status === 'ordered' && <button className="btn btn-success btn-sm" onClick={() => updateStatus(o._id, 'received')}>Receive</button>}
                <button className="btn btn-danger btn-sm" onClick={async () => { await erpApi.deletePurchaseOrder(o._id); await load(); }}>Delete</button>
              </div></td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </>
  );
}
