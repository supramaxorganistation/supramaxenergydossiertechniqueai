import { useEffect, useMemo, useState } from 'react';
import { erpApi } from '../erpApi';
import type { ErpQuote, ErpCustomer, ErpProduct, QuoteStatus, LineItem } from '../erpTypes';
import { Badge, EmptyState } from '../components/ui';
import { Icon } from '../components/Icon';
import { useFormValidation, required, nonNegative, atLeastOneItem } from '../useFormValidation';

const STATUS_OPTS: { value: QuoteStatus; label: string; color: 'gray' | 'blue' | 'green' | 'amber' | 'red' }[] = [
  { value: 'draft', label: 'Draft', color: 'gray' }, { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'approved', label: 'Approved', color: 'green' }, { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'expired', label: 'Expired', color: 'amber' }, { value: 'converted', label: 'Converted', color: 'green' },
];
const emptyItem: LineItem = { product: '', productName: '', qty: 1, rate: 0, amount: 0 };

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<ErpQuote[]>([]);
  const [customers, setCustomers] = useState<ErpCustomer[]>([]);
  const [products, setProducts] = useState<ErpProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer: '', taxRate: 19, discount: 0, notes: '', terms: '', currency: 'TND', items: [{ ...emptyItem }] as LineItem[], expiryDate: '' });

  const rules = useMemo(() => ({
    customer: [required('Customer')],
    items: [atLeastOneItem('line item')],
    taxRate: [nonNegative('Tax rate')],
    discount: [nonNegative('Discount')],
  }), []);
  const { errors, validate, clearErrors } = useFormValidation(rules);

  const load = async () => {
    setLoading(true);
    try { const [q, c, p] = await Promise.all([erpApi.listQuotes(), erpApi.listCustomers(), erpApi.listProducts()]); setQuotes(q); setCustomers(c); setProducts(p); } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ customer: '', taxRate: 19, discount: 0, notes: '', terms: '', currency: 'TND', items: [{ ...emptyItem }], expiryDate: '' }); setShowForm(false); clearErrors(); };

  const updateItem = (idx: number, field: keyof LineItem, val: any) => {
    const updated = [...form.items]; (updated[idx] as any)[field] = val;
    if (field === 'product') { const p = products.find(pr => pr._id === val); if (p) { updated[idx].productName = p.name; updated[idx].rate = p.sellingPrice || 0; } }
    updated[idx].amount = (updated[idx].qty || 0) * (updated[idx].rate || 0);
    setForm({ ...form, items: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(form)) return;
    try { await erpApi.createQuote({ ...form, items: form.items.filter(i => i.product) }); resetForm(); await load(); } catch (err: any) { alert(err.message); }
  };

  const updateStatus = async (id: string, status: QuoteStatus) => {
    try { await erpApi.updateQuote(id, { status }); await load(); } catch (err: any) { alert(err.message); }
  };

  const convertToInvoice = async (id: string) => {
    if (!confirm('Convert this quote to an invoice?')) return;
    try { await erpApi.convertQuoteToInvoice(id); await load(); alert('Quote converted to invoice!'); } catch (err: any) { alert(err.message); }
  };

  return (
    <>
      <div className="flex-between mb-16">
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>Quotes / Estimations</h3>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ New Quote</button>
      </div>

      {showForm && (
        <div className="card mb-16">
          <h4 className="card-title">New Quote</h4>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Customer *</label>
                <select className={`select ${errors.customer ? 'input-invalid' : ''}`} value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })}><option value="">Select...</option>{customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
                {errors.customer && <span className="field-error">{errors.customer}</span>}
              </div>
              <div className="form-group"><label className="form-label">Expiry Date</label><input className="input" type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} /></div>
              <div className="form-group">
                <label className="form-label">Tax Rate (%)</label>
                <input className={`input ${errors.taxRate ? 'input-invalid' : ''}`} type="number" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: +e.target.value })} />
                {errors.taxRate && <span className="field-error">{errors.taxRate}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Discount (TND)</label>
                <input className={`input ${errors.discount ? 'input-invalid' : ''}`} type="number" step="0.01" value={form.discount} onChange={e => setForm({ ...form, discount: +e.target.value })} />
                {errors.discount && <span className="field-error">{errors.discount}</span>}
              </div>
              <div className="form-group"><label className="form-label">Currency</label><select className="select" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}><option value="TND">TND</option><option value="EUR">EUR</option><option value="USD">USD</option></select></div>
            </div>
            <div className="form-section-title">Line Items</div>
            {errors.items && <div className="form-error-banner"><Icon name="alert-triangle" size={15} /> {errors.items}</div>}
            {form.items.map((item, idx) => (
              <div key={idx} className="flex gap-8 mb-16" style={{ alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}><label className="form-label">Product</label><select className="select" value={item.product as string} onChange={e => updateItem(idx, 'product', e.target.value)}><option value="">Select...</option>{products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku || '—'})</option>)}</select></div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}><label className="form-label">Qty</label><input className="input" type="number" min="1" value={item.qty} onChange={e => updateItem(idx, 'qty', +e.target.value)} /></div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}><label className="form-label">Rate</label><input className="input" type="number" step="0.01" value={item.rate} onChange={e => updateItem(idx, 'rate', +e.target.value)} /></div>
                <div style={{ fontWeight: 700, minWidth: 80, paddingBottom: 10 }}>{((item.qty || 0) * (item.rate || 0)).toFixed(2)}</div>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}>×</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm mb-16" onClick={() => setForm({ ...form, items: [...form.items, { ...emptyItem }] })}>+ Add Line</button>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="textarea" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Terms & Conditions</label><textarea className="textarea" rows={2} value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} placeholder="Payment terms, validity, etc." /></div>
            <div className="flex gap-8"><button type="submit" className="btn btn-primary">Create</button><button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button></div>
          </form>
        </div>
      )}

      {loading ? <div className="loading-screen"><span className="spinner" /> Loading...</div> : quotes.length === 0 ? (
        <EmptyState icon="file-text" title="No quotes yet" subtitle="Create your first quote/estimation." />
      ) : (
        <div className="table-wrap"><table className="data"><thead><tr><th>Quote #</th><th>Customer</th><th>Date</th><th>Expiry</th><th>Total</th><th>Currency</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {quotes.map(q => (
            <tr key={q._id}>
              <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{q.quoteNumber}</td>
              <td>{typeof q.customer === 'object' ? q.customer.name : q.customerName}</td>
              <td>{q.date ? new Date(q.date).toLocaleDateString() : '—'}</td>
              <td>{q.expiryDate ? new Date(q.expiryDate).toLocaleDateString() : '—'}</td>
              <td style={{ fontWeight: 700 }}>{(q.grandTotal || 0).toFixed(2)}</td>
              <td>{q.currency || 'TND'}</td>
              <td><Badge color={STATUS_OPTS.find(s => s.value === q.status)?.color || 'gray'}>{STATUS_OPTS.find(s => s.value === q.status)?.label || q.status}</Badge></td>
              <td><div className="row-actions">
                {q.status === 'draft' && <><button className="btn btn-success btn-sm" onClick={() => updateStatus(q._id, 'sent')}>Send</button><button className="btn btn-primary btn-sm" onClick={() => convertToInvoice(q._id)}>To Invoice</button></>}
                {q.status === 'sent' && <><button className="btn btn-success btn-sm" onClick={() => updateStatus(q._id, 'approved')}>Approve</button><button className="btn btn-primary btn-sm" onClick={() => convertToInvoice(q._id)}>To Invoice</button></>}
                <button className="btn btn-danger btn-sm" onClick={async () => { await erpApi.deleteQuote(q._id); await load(); }}>Delete</button>
              </div></td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </>
  );
}
