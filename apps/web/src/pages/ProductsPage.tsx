import { useEffect, useMemo, useState } from 'react';
import { erpApi } from '../erpApi';
import type { ErpProduct, ProductCategory } from '../erpTypes';
import { Badge, EmptyState } from '../components/ui';
import { Icon } from '../components/Icon';
import { useFormValidation, required, minLength, nonNegative } from '../useFormValidation';

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'panel', label: 'Solar Panel' }, { value: 'inverter', label: 'Inverter' },
  { value: 'cable', label: 'Cable' }, { value: 'protection', label: 'Protection' },
  { value: 'structure', label: 'Structure' }, { value: 'accessory', label: 'Accessory' },
  { value: 'service', label: 'Service' }, { value: 'other', label: 'Other' },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<ErpProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', sku: '', description: '', category: 'other' as ProductCategory, unit: 'pcs', buyingPrice: 0, sellingPrice: 0, stockQty: 0, minStockQty: 0 });

  const rules = useMemo(() => ({
    name: [required('Name'), minLength('Name', 2)],
    buyingPrice: [nonNegative('Buying price')],
    sellingPrice: [nonNegative('Selling price')],
    stockQty: [nonNegative('Stock quantity')],
    minStockQty: [nonNegative('Min stock quantity')],
  }), []);
  const { errors, validate, clearErrors } = useFormValidation(rules);

  const load = async () => { setLoading(true); try { setProducts(await erpApi.listProducts()); } catch (e) { console.error(e); } setLoading(false); };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ name: '', sku: '', description: '', category: 'other', unit: 'pcs', buyingPrice: 0, sellingPrice: 0, stockQty: 0, minStockQty: 0 }); setEditingId(null); setShowForm(false); clearErrors(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(form)) return;
    try {
      if (editingId) await erpApi.updateProduct(editingId, form);
      else await erpApi.createProduct(form);
      resetForm(); await load();
    } catch (err: any) { alert(err.message); }
  };

  const handleEdit = (p: ErpProduct) => {
    setForm({ name: p.name, sku: p.sku || '', description: p.description || '', category: p.category || 'other', unit: p.unit || 'pcs', buyingPrice: p.buyingPrice || 0, sellingPrice: p.sellingPrice || 0, stockQty: p.stockQty || 0, minStockQty: p.minStockQty || 0 });
    setEditingId(p._id); setShowForm(true); clearErrors();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try { await erpApi.deleteProduct(id); await load(); } catch (err: any) { alert(err.message); }
  };

  const lowStock = products.filter(p => (p.stockQty || 0) <= (p.minStockQty || 0));

  return (
    <>
      <div className="grid grid-4 mb-16">
        <div className="stat-card"><div className="stat-icon stat-blue"><Icon name="box" size={22} /></div><div><div className="stat-value">{products.length}</div><div className="stat-label">Total Products</div></div></div>
        <div className="stat-card"><div className="stat-icon stat-green"><Icon name="check-circle" size={22} /></div><div><div className="stat-value">{products.filter(p => p.isActive).length}</div><div className="stat-label">Active</div></div></div>
        <div className="stat-card"><div className="stat-icon stat-amber"><Icon name="alert-triangle" size={22} /></div><div><div className="stat-value">{lowStock.length}</div><div className="stat-label">Low Stock</div></div></div>
        <div className="stat-card"><div className="stat-icon stat-red"><Icon name="trending-down" size={22} /></div><div><div className="stat-value">{products.reduce((s, p) => s + ((p.stockQty || 0) * (p.buyingPrice || 0)), 0).toFixed(0)}</div><div className="stat-label">Stock Value (TND)</div></div></div>
      </div>

      <div className="flex-between mb-16">
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>Products</h3>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Add Product</button>
      </div>

      {showForm && (
        <div className="card mb-16">
          <h4 className="card-title">{editingId ? 'Edit' : 'New'} Product</h4>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className={`input ${errors.name ? 'input-invalid' : ''}`} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>
              <div className="form-group"><label className="form-label">SKU</label><input className="input" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="Auto-generated if empty" /></div>
              <div className="form-group"><label className="form-label">Category</label><select className="select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as ProductCategory })}>{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Unit</label><input className="input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
              <div className="form-group">
                <label className="form-label">Buying Price (TND)</label>
                <input className={`input ${errors.buyingPrice ? 'input-invalid' : ''}`} type="number" step="0.01" value={form.buyingPrice} onChange={e => setForm({ ...form, buyingPrice: +e.target.value })} />
                {errors.buyingPrice && <span className="field-error">{errors.buyingPrice}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Selling Price (TND)</label>
                <input className={`input ${errors.sellingPrice ? 'input-invalid' : ''}`} type="number" step="0.01" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: +e.target.value })} />
                {errors.sellingPrice && <span className="field-error">{errors.sellingPrice}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Stock Qty</label>
                <input className={`input ${errors.stockQty ? 'input-invalid' : ''}`} type="number" value={form.stockQty} onChange={e => setForm({ ...form, stockQty: +e.target.value })} />
                {errors.stockQty && <span className="field-error">{errors.stockQty}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Min Stock Qty</label>
                <input className={`input ${errors.minStockQty ? 'input-invalid' : ''}`} type="number" value={form.minStockQty} onChange={e => setForm({ ...form, minStockQty: +e.target.value })} />
                {errors.minStockQty && <span className="field-error">{errors.minStockQty}</span>}
              </div>
            </div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="textarea" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex gap-8"><button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Create'}</button><button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button></div>
          </form>
        </div>
      )}

      {loading ? <div className="loading-screen"><span className="spinner" /> Loading...</div> : products.length === 0 ? (
        <EmptyState icon="box" title="No products yet" subtitle="Add your first product to the catalog." />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Buying</th><th>Selling</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.sku || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td><Badge color="blue">{CATEGORIES.find(c => c.value === p.category)?.label || p.category}</Badge></td>
                  <td>{(p.buyingPrice || 0).toFixed(2)}</td>
                  <td>{(p.sellingPrice || 0).toFixed(2)}</td>
                  <td style={{ fontWeight: 600, color: (p.stockQty || 0) <= (p.minStockQty || 0) ? '#dc2626' : undefined }}>{p.stockQty || 0}</td>
                  <td>{(p.stockQty || 0) <= (p.minStockQty || 0) ? <Badge color="red">Low</Badge> : <Badge color="green">OK</Badge>}</td>
                  <td><div className="row-actions"><button className="btn btn-ghost btn-sm" onClick={() => handleEdit(p)}>Edit</button><button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
