import { useEffect, useMemo, useState } from 'react';
import { erpApi } from '../erpApi';
import type { ErpWarehouse, ErpStockMovement, ErpProduct, StockMovementType } from '../erpTypes';
import { Badge, EmptyState } from '../components/ui';
import { useFormValidation, required, minLength, positive } from '../useFormValidation';

type Tab = 'warehouses' | 'movements';

export default function StockPage() {
  const [tab, setTab] = useState<Tab>('warehouses');
  const [warehouses, setWarehouses] = useState<ErpWarehouse[]>([]);
  const [movements, setMovements] = useState<ErpStockMovement[]>([]);
  const [products, setProducts] = useState<ErpProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWhForm, setShowWhForm] = useState(false);
  const [showMvForm, setShowMvForm] = useState(false);
  const [whForm, setWhForm] = useState({ name: '', address: '', city: '' });
  const [mvForm, setMvForm] = useState({ product: '', warehouse: '', type: 'in' as StockMovementType, qty: 1, rate: 0, reason: '' });

  const whRules = useMemo(() => ({ name: [required('Name'), minLength('Name', 2)] }), []);
  const whValidation = useFormValidation(whRules);

  const mvRules = useMemo(() => ({
    product: [required('Product')],
    qty: [required('Quantity'), positive('Quantity')],
  }), []);
  const mvValidation = useFormValidation(mvRules);

  const load = async () => {
    setLoading(true);
    try { const [w, m, p] = await Promise.all([erpApi.listWarehouses(), erpApi.listStockMovements(), erpApi.listProducts()]); setWarehouses(w); setMovements(m); setProducts(p); } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleWhSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whValidation.validate(whForm)) return;
    try { await erpApi.createWarehouse(whForm); setWhForm({ name: '', address: '', city: '' }); setShowWhForm(false); whValidation.clearErrors(); await load(); } catch (err: any) { alert(err.message); }
  };

  const handleMvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mvValidation.validate(mvForm)) return;
    try { await erpApi.createStockMovement(mvForm); setMvForm({ product: '', warehouse: '', type: 'in', qty: 1, rate: 0, reason: '' }); setShowMvForm(false); mvValidation.clearErrors(); await load(); } catch (err: any) { alert(err.message); }
  };

  return (
    <>
      <div className="tabs">
        <button className={`tab ${tab === 'warehouses' ? 'active' : ''}`} onClick={() => setTab('warehouses')}>Warehouses ({warehouses.length})</button>
        <button className={`tab ${tab === 'movements' ? 'active' : ''}`} onClick={() => setTab('movements')}>Stock Movements ({movements.length})</button>
      </div>

      {tab === 'warehouses' && (
        <>
          <div className="flex-between mb-16">
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Warehouses</h3>
            <button className="btn btn-primary" onClick={() => setShowWhForm(true)}>+ Add Warehouse</button>
          </div>
          {showWhForm && (
            <div className="card mb-16">
              <h4 className="card-title">New Warehouse</h4>
              <form onSubmit={handleWhSubmit} noValidate>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Name *</label>
                    <input className={`input ${whValidation.errors.name ? 'input-invalid' : ''}`} value={whForm.name} onChange={e => setWhForm({ ...whForm, name: e.target.value })} />
                    {whValidation.errors.name && <span className="field-error">{whValidation.errors.name}</span>}
                  </div>
                  <div className="form-group"><label className="form-label">City</label><input className="input" value={whForm.city} onChange={e => setWhForm({ ...whForm, city: e.target.value })} /></div>
                </div>
                <div className="form-group"><label className="form-label">Address</label><input className="input" value={whForm.address} onChange={e => setWhForm({ ...whForm, address: e.target.value })} /></div>
                <div className="flex gap-8"><button type="submit" className="btn btn-primary">Create</button><button type="button" className="btn btn-ghost" onClick={() => { setShowWhForm(false); whValidation.clearErrors(); }}>Cancel</button></div>
              </form>
            </div>
          )}
          {loading ? <div className="loading-screen"><span className="spinner" /> Loading...</div> : warehouses.length === 0 ? (
            <EmptyState icon="building" title="No warehouses" subtitle="Add your first warehouse." />
          ) : (
            <div className="table-wrap"><table className="data"><thead><tr><th>Name</th><th>City</th><th>Address</th><th>Active</th><th>Actions</th></tr></thead><tbody>
              {warehouses.map(w => (
                <tr key={w._id}>
                  <td style={{ fontWeight: 600 }}>{w.name}</td>
                  <td>{w.city || '—'}</td>
                  <td>{w.address || '—'}</td>
                  <td>{w.isActive ? <Badge color="green">Active</Badge> : <Badge color="red">Inactive</Badge>}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={async () => { if (confirm('Delete?')) { await erpApi.deleteWarehouse(w._id); await load(); } }}>Delete</button></td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </>
      )}

      {tab === 'movements' && (
        <>
          <div className="flex-between mb-16">
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Stock Movements</h3>
            <button className="btn btn-primary" onClick={() => setShowMvForm(true)}>+ New Movement</button>
          </div>
          {showMvForm && (
            <div className="card mb-16">
              <h4 className="card-title">New Stock Movement</h4>
              <form onSubmit={handleMvSubmit} noValidate>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Product *</label>
                    <select className={`select ${mvValidation.errors.product ? 'input-invalid' : ''}`} value={mvForm.product} onChange={e => setMvForm({ ...mvForm, product: e.target.value })}><option value="">Select...</option>{products.map(p => <option key={p._id} value={p._id}>{p.name} (Stock: {p.stockQty || 0})</option>)}</select>
                    {mvValidation.errors.product && <span className="field-error">{mvValidation.errors.product}</span>}
                  </div>
                  <div className="form-group"><label className="form-label">Warehouse</label><select className="select" value={mvForm.warehouse} onChange={e => setMvForm({ ...mvForm, warehouse: e.target.value })}><option value="">Select...</option>{warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Type *</label><select className="select" value={mvForm.type} onChange={e => setMvForm({ ...mvForm, type: e.target.value as StockMovementType })}><option value="in">Stock In</option><option value="out">Stock Out</option><option value="adjustment">Adjustment</option></select></div>
                  <div className="form-group">
                    <label className="form-label">Qty *</label>
                    <input className={`input ${mvValidation.errors.qty ? 'input-invalid' : ''}`} type="number" min="1" value={mvForm.qty} onChange={e => setMvForm({ ...mvForm, qty: +e.target.value })} />
                    {mvValidation.errors.qty && <span className="field-error">{mvValidation.errors.qty}</span>}
                  </div>
                  <div className="form-group"><label className="form-label">Rate (TND)</label><input className="input" type="number" step="0.01" value={mvForm.rate} onChange={e => setMvForm({ ...mvForm, rate: +e.target.value })} /></div>
                </div>
                <div className="form-group"><label className="form-label">Reason</label><input className="input" value={mvForm.reason} onChange={e => setMvForm({ ...mvForm, reason: e.target.value })} /></div>
                <div className="flex gap-8"><button type="submit" className="btn btn-primary">Record</button><button type="button" className="btn btn-ghost" onClick={() => { setShowMvForm(false); mvValidation.clearErrors(); }}>Cancel</button></div>
              </form>
            </div>
          )}
          {loading ? <div className="loading-screen"><span className="spinner" /> Loading...</div> : movements.length === 0 ? (
            <EmptyState icon="box" title="No stock movements" subtitle="Record your first stock movement." />
          ) : (
            <div className="table-wrap"><table className="data"><thead><tr><th>Date</th><th>Product</th><th>Warehouse</th><th>Type</th><th>Qty</th><th>Before</th><th>After</th><th>Reason</th></tr></thead><tbody>
              {movements.map(m => (
                <tr key={m._id}>
                  <td>{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}</td>
                  <td style={{ fontWeight: 600 }}>{typeof m.product === 'object' ? m.product.name : m.productName}</td>
                  <td>{typeof m.warehouse === 'object' ? m.warehouse?.name : m.warehouseName || '—'}</td>
                  <td><Badge color={m.type === 'in' ? 'green' : m.type === 'out' ? 'red' : 'amber'}>{m.type === 'in' ? 'IN' : m.type === 'out' ? 'OUT' : 'ADJ'}</Badge></td>
                  <td style={{ fontWeight: 700 }}>{m.type === 'out' ? '-' : '+'}{m.qty}</td>
                  <td>{m.previousQty}</td>
                  <td style={{ fontWeight: 600 }}>{m.newQty}</td>
                  <td>{m.reason || '—'}</td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </>
      )}
    </>
  );
}
