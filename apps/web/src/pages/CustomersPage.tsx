import { useEffect, useMemo, useState } from 'react';
import { erpApi } from '../erpApi';
import type { ErpCustomer, ErpSupplier, CustomerGroup, SupplierGroup } from '../erpTypes';
import { Badge, EmptyState } from '../components/ui';
import { useFormValidation, required, minLength, email, phone } from '../useFormValidation';

type Tab = 'customers' | 'suppliers';

export default function CustomersPage() {
  const [tab, setTab] = useState<Tab>('customers');
  const [customers, setCustomers] = useState<ErpCustomer[]>([]);
  const [suppliers, setSuppliers] = useState<ErpSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', taxId: '', customerGroup: 'individual' as CustomerGroup, supplierGroup: 'equipment' as SupplierGroup, notes: '' });

  const rules = useMemo(() => ({
    name: [required('Nom'), minLength('Nom', 2)],
    email: [email('E-mail')],
    phone: [phone('Téléphone')],
  }), []);
  const { errors, validate, clearErrors } = useFormValidation(rules);

  const load = async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([erpApi.listCustomers(), erpApi.listSuppliers()]);
      setCustomers(c); setSuppliers(s);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ name: '', email: '', phone: '', address: '', city: '', taxId: '', customerGroup: 'individual' as CustomerGroup, supplierGroup: 'equipment' as SupplierGroup, notes: '' }); setEditingId(null); setShowForm(false); clearErrors(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(form)) return;
    try {
      if (tab === 'customers') {
        if (editingId) await erpApi.updateCustomer(editingId, form);
        else await erpApi.createCustomer(form);
      } else {
        if (editingId) await erpApi.updateSupplier(editingId, form);
        else await erpApi.createSupplier(form);
      }
      resetForm(); await load();
    } catch (err: any) { alert(err.message); }
  };

  const handleEdit = (item: ErpCustomer | ErpSupplier) => {
    setForm({ name: item.name || '', email: item.email || '', phone: item.phone || '', address: item.address || '', city: item.city || '', taxId: item.taxId || '', customerGroup: ((item as ErpCustomer).customerGroup || 'individual') as CustomerGroup, supplierGroup: ((item as ErpSupplier).supplierGroup || 'equipment') as SupplierGroup, notes: item.notes || '' });
    setEditingId(item._id); setShowForm(true); clearErrors();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet enregistrement ?')) return;
    try {
      if (tab === 'customers') await erpApi.deleteCustomer(id);
      else await erpApi.deleteSupplier(id);
      await load();
    } catch (err: any) { alert(err.message); }
  };

  const items = tab === 'customers' ? customers : suppliers;
  const groupLabel = tab === 'customers' ? 'customerGroup' : 'supplierGroup';

  return (
    <>
      <div className="tabs">
        <button className={`tab ${tab === 'customers' ? 'active' : ''}`} onClick={() => setTab('customers')}>Clients ({customers.length})</button>
        <button className={`tab ${tab === 'suppliers' ? 'active' : ''}`} onClick={() => setTab('suppliers')}>Fournisseurs ({suppliers.length})</button>
      </div>

      <div className="flex-between mb-16">
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>{tab === 'customers' ? 'Clients' : 'Fournisseurs'}</h3>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Ajouter {tab === 'customers' ? 'un client' : 'un fournisseur'}</button>
      </div>

      {showForm && (
        <div className="card mb-16">
          <h4 className="card-title">{editingId ? 'Modifier' : 'Nouveau'} — {tab === 'customers' ? 'Client' : 'Fournisseur'}</h4>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Nom *</label>
                <input className={`input ${errors.name ? 'input-invalid' : ''}`} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className={`input ${errors.email ? 'input-invalid' : ''}`} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input className={`input ${errors.phone ? 'input-invalid' : ''}`} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                {errors.phone && <span className="field-error">{errors.phone}</span>}
              </div>
              <div className="form-group"><label className="form-label">Ville</label><input className="input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Adresse</label><input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Matricule fiscal</label><input className="input" value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })} /></div>
              {tab === 'customers' ? (
                <div className="form-group"><label className="form-label">Groupe</label><select className="select" value={form.customerGroup} onChange={e => setForm({ ...form, customerGroup: e.target.value as CustomerGroup })}><option value="individual">Particulier</option><option value="company">Société</option><option value="government">Administration</option></select></div>
              ) : (
                <div className="form-group"><label className="form-label">Groupe</label><select className="select" value={form.supplierGroup} onChange={e => setForm({ ...form, supplierGroup: e.target.value as SupplierGroup })}><option value="equipment">Équipement</option><option value="raw_material">Matière première</option><option value="service">Service</option><option value="other">Autre</option></select></div>
              )}
            </div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="textarea" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex gap-8"><button type="submit" className="btn btn-primary">{editingId ? 'Mettre à jour' : 'Créer'}</button><button type="button" className="btn btn-ghost" onClick={resetForm}>Annuler</button></div>
          </form>
        </div>
      )}

      {loading ? <div className="loading-screen"><span className="spinner" /> Chargement...</div> : items.length === 0 ? (
        <EmptyState icon={tab === 'customers' ? 'users' : 'building'} title={tab === 'customers' ? 'Aucun client' : 'Aucun fournisseur'} subtitle="Ajoutez votre premier enregistrement pour commencer." />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Nom</th><th>E-mail</th><th>Téléphone</th><th>Ville</th><th>Groupe</th><th>Solde</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>{item.email || '—'}</td>
                  <td>{item.phone || '—'}</td>
                  <td>{item.city || '—'}</td>
                  <td><Badge color="blue">{(item as any)[groupLabel] || '—'}</Badge></td>
                  <td style={{ fontWeight: 600 }}>{(item.totalBalance || 0).toFixed(2)} TND</td>
                  <td><div className="row-actions"><button className="btn btn-ghost btn-sm" onClick={() => handleEdit(item)}>Modifier</button><button className="btn btn-danger btn-sm" onClick={() => handleDelete(item._id)}>Supprimer</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
