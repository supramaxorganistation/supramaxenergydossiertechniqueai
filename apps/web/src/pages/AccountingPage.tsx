import { useEffect, useMemo, useState } from 'react';
import { erpApi } from '../erpApi';
import type { ErpAccount, ErpJournalEntry, AccountType, JournalLine } from '../erpTypes';
import { Badge, EmptyState } from '../components/ui';
import { Icon } from '../components/Icon';
import { useFormValidation, required, minLength } from '../useFormValidation';

type Tab = 'accounts' | 'journal';
const TYPE_COLORS: Record<AccountType, 'blue' | 'green' | 'amber' | 'red' | 'gray'> = { asset: 'blue', liability: 'red', income: 'green', expense: 'amber', equity: 'gray' };
const TYPE_LABELS: Record<AccountType, string> = { asset: 'Actif', liability: 'Passif', income: 'Produit', expense: 'Charge', equity: 'Capitaux propres' };
const JE_STATUS_LABELS: Record<string, string> = { draft: 'Brouillon', submitted: 'Soumise', cancelled: 'Annulée', posted: 'Comptabilisée' };
const emptyLine: JournalLine = { account: '', debit: 0, credit: 0 };

export default function AccountingPage() {
  const [tab, setTab] = useState<Tab>('accounts');
  const [accounts, setAccounts] = useState<ErpAccount[]>([]);
  const [entries, setEntries] = useState<ErpJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccForm, setShowAccForm] = useState(false);
  const [showJeForm, setShowJeForm] = useState(false);
  const [accForm, setAccForm] = useState({ accountNumber: '', name: '', type: 'asset' as AccountType });
  const [jeForm, setJeForm] = useState({ description: '', reference: '', status: 'draft' as 'draft' | 'submitted', lines: [{ ...emptyLine }] as JournalLine[] });
  const [jeError, setJeError] = useState<string | null>(null);

  const accRules = useMemo(() => ({
    accountNumber: [required('Numéro de compte'), minLength('Numéro de compte', 1)],
    name: [required('Nom du compte'), minLength('Nom du compte', 2)],
  }), []);
  const accValidation = useFormValidation(accRules);

  const load = async () => {
    setLoading(true);
    try {
      const [a, j] = await Promise.all([erpApi.listAccounts(), erpApi.listJournalEntries()]);
      setAccounts(a); setEntries(j);
      if (a.length === 0) { try { await erpApi.seedAccounts(); const fresh = await erpApi.listAccounts(); setAccounts(fresh); } catch {} }
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleAccSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accValidation.validate(accForm)) return;
    try { await erpApi.createAccount(accForm); setAccForm({ accountNumber: '', name: '', type: 'asset' }); setShowAccForm(false); accValidation.clearErrors(); await load(); } catch (err: any) { alert(err.message); }
  };

  const handleJeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = jeForm.lines.filter(l => l.account && (l.debit > 0 || l.credit > 0));
    if (validLines.length === 0) { setJeError('Ajoutez au moins une ligne d’écriture avec un compte et un montant'); return; }
    const totalDebit = validLines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = validLines.reduce((s, l) => s + (l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) { setJeError(`Les débits (${totalDebit.toFixed(2)}) doivent être égaux aux crédits (${totalCredit.toFixed(2)})`); return; }
    setJeError(null);
    try {
      const payload = { ...jeForm, lines: validLines };
      await erpApi.createJournalEntry(payload);
      setJeForm({ description: '', reference: '', status: 'draft', lines: [{ ...emptyLine }] });
      setShowJeForm(false); await load();
    } catch (err: any) { alert(err.message); }
  };

  const totalAssets = accounts.filter(a => a.type === 'asset').reduce((s, a) => s + (a.balance || 0), 0);
  const totalLiabilities = accounts.filter(a => a.type === 'liability').reduce((s, a) => s + (a.balance || 0), 0);
  const totalIncome = accounts.filter(a => a.type === 'income').reduce((s, a) => s + (a.balance || 0), 0);
  const totalExpenses = accounts.filter(a => a.type === 'expense').reduce((s, a) => s + (a.balance || 0), 0);

  return (
    <>
      <div className="grid grid-4 mb-16">
        <div className="stat-card"><div className="stat-icon stat-blue"><Icon name="wallet" size={22} /></div><div><div className="stat-value">{totalAssets.toFixed(0)}</div><div className="stat-label">Total actifs</div></div></div>
        <div className="stat-card"><div className="stat-icon stat-red"><Icon name="bar-chart" size={22} /></div><div><div className="stat-value">{totalLiabilities.toFixed(0)}</div><div className="stat-label">Passifs</div></div></div>
        <div className="stat-card"><div className="stat-icon stat-green"><Icon name="trending-up" size={22} /></div><div><div className="stat-value">{totalIncome.toFixed(0)}</div><div className="stat-label">Produits</div></div></div>
        <div className="stat-card"><div className="stat-icon stat-amber"><Icon name="trending-down" size={22} /></div><div><div className="stat-value">{totalExpenses.toFixed(0)}</div><div className="stat-label">Charges</div></div></div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'accounts' ? 'active' : ''}`} onClick={() => { setTab('accounts'); setShowJeForm(false); }}>Plan comptable</button>
        <button className={`tab ${tab === 'journal' ? 'active' : ''}`} onClick={() => { setTab('journal'); setShowAccForm(false); }}>Écritures de journal ({entries.length})</button>
      </div>

      {tab === 'accounts' && (
        <>
          <div className="flex-between mb-16">
            <h3 className="page-section-title">Plan comptable</h3>
            <button className="btn btn-primary" onClick={() => setShowAccForm(true)}>+ Ajouter un compte</button>
          </div>
          {showAccForm && (
            <div className="card mb-16">
              <h4 className="card-title">Nouveau compte</h4>
              <form onSubmit={handleAccSubmit} noValidate>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Numéro de compte *</label>
                    <input className={`input ${accValidation.errors.accountNumber ? 'input-invalid' : ''}`} value={accForm.accountNumber} onChange={e => setAccForm({ ...accForm, accountNumber: e.target.value })} />
                    {accValidation.errors.accountNumber && <span className="field-error">{accValidation.errors.accountNumber}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nom *</label>
                    <input className={`input ${accValidation.errors.name ? 'input-invalid' : ''}`} value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} />
                    {accValidation.errors.name && <span className="field-error">{accValidation.errors.name}</span>}
                  </div>
                  <div className="form-group"><label className="form-label">Type *</label><select className="select" value={accForm.type} onChange={e => setAccForm({ ...accForm, type: e.target.value as AccountType })}><option value="asset">Actif</option><option value="liability">Passif</option><option value="income">Produit</option><option value="expense">Charge</option><option value="equity">Capitaux propres</option></select></div>
                </div>
                <div className="flex gap-8"><button type="submit" className="btn btn-primary">Créer</button><button type="button" className="btn btn-ghost" onClick={() => { setShowAccForm(false); accValidation.clearErrors(); }}>Annuler</button></div>
              </form>
            </div>
          )}
          {loading ? <div className="loading-screen"><span className="spinner" /> Chargement...</div> : accounts.length === 0 ? (
            <EmptyState icon="wallet" title="Aucun compte" subtitle="Générez les comptes par défaut ou ajoutez-les manuellement." />
          ) : (
            <div className="table-wrap"><table className="data"><thead><tr><th>#</th><th>Nom</th><th>Type</th><th>Solde</th><th>Actif</th></tr></thead><tbody>
              {accounts.map(a => (
                <tr key={a._id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{a.accountNumber}</td>
                  <td style={{ fontWeight: 600 }}>{a.name}</td>
                  <td><Badge color={TYPE_COLORS[a.type]}>{TYPE_LABELS[a.type]}</Badge></td>
                  <td style={{ fontWeight: 700 }}>{(a.balance || 0).toFixed(2)}</td>
                  <td>{a.isActive ? <Badge color="green">Oui</Badge> : <Badge color="gray">Non</Badge>}</td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </>
      )}

      {tab === 'journal' && (
        <>
          <div className="flex-between mb-16">
            <h3 className="page-section-title">Écritures de journal</h3>
            <button className="btn btn-primary" onClick={() => setShowJeForm(true)}>+ Nouvelle écriture</button>
          </div>
          {showJeForm && (
            <div className="card mb-16">
              <h4 className="card-title">Nouvelle écriture de journal</h4>
              <form onSubmit={handleJeSubmit} noValidate>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Description</label><input className="input" value={jeForm.description} onChange={e => setJeForm({ ...jeForm, description: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Référence</label><input className="input" value={jeForm.reference} onChange={e => setJeForm({ ...jeForm, reference: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Statut</label><select className="select" value={jeForm.status} onChange={e => setJeForm({ ...jeForm, status: e.target.value as any })}><option value="draft">Brouillon</option><option value="submitted">Soumettre</option></select></div>
                </div>
                <div className="form-section-title">Lignes</div>
                {jeError && <div className="form-error-banner"><Icon name="alert-triangle" size={15} /> {jeError}</div>}
                {jeForm.lines.map((line, idx) => (
                  <div key={idx} className="flex gap-8 mb-16" style={{ alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 3, marginBottom: 0 }}><label className="form-label">Compte</label><select className="select" value={line.account as string} onChange={e => { const updated = [...jeForm.lines]; updated[idx].account = e.target.value; updated[idx].accountName = accounts.find(a => a._id === e.target.value)?.name || ''; setJeForm({ ...jeForm, lines: updated }); setJeError(null); }}><option value="">Sélectionner…</option>{accounts.map(a => <option key={a._id} value={a._id}>{a.accountNumber} - {a.name}</option>)}</select></div>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}><label className="form-label">Débit</label><input className="input" type="number" step="0.01" min="0" value={line.debit || ''} onChange={e => { const updated = [...jeForm.lines]; updated[idx].debit = +e.target.value; setJeForm({ ...jeForm, lines: updated }); setJeError(null); }} /></div>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}><label className="form-label">Crédit</label><input className="input" type="number" step="0.01" min="0" value={line.credit || ''} onChange={e => { const updated = [...jeForm.lines]; updated[idx].credit = +e.target.value; setJeForm({ ...jeForm, lines: updated }); setJeError(null); }} /></div>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => setJeForm({ ...jeForm, lines: jeForm.lines.filter((_, i) => i !== idx) })}>×</button>
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm mb-16" onClick={() => setJeForm({ ...jeForm, lines: [...jeForm.lines, { ...emptyLine }] })}>+ Ajouter une ligne</button>
                <div className="flex gap-8"><button type="submit" className="btn btn-primary">Créer</button><button type="button" className="btn btn-ghost" onClick={() => { setShowJeForm(false); setJeError(null); }}>Annuler</button></div>
              </form>
            </div>
          )}
          {loading ? <div className="loading-screen"><span className="spinner" /> Chargement...</div> : entries.length === 0 ? (
            <EmptyState icon="file-text" title="Aucune écriture de journal" />
          ) : (
            <div className="table-wrap"><table className="data"><thead><tr><th>N° écriture</th><th>Date</th><th>Description</th><th>Débit</th><th>Crédit</th><th>Statut</th></tr></thead><tbody>
              {entries.map(e => (
                <tr key={e._id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{e.entryNumber}</td>
                  <td>{e.date ? new Date(e.date).toLocaleDateString() : '—'}</td>
                  <td>{e.description || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{(e.totalDebit || 0).toFixed(2)}</td>
                  <td style={{ fontWeight: 700 }}>{(e.totalCredit || 0).toFixed(2)}</td>
                  <td><Badge color={e.status === 'submitted' ? 'green' : e.status === 'cancelled' ? 'red' : 'gray'}>{JE_STATUS_LABELS[e.status ?? ''] || e.status}</Badge></td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </>
      )}
    </>
  );
}
