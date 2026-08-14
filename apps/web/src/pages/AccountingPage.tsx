import { useEffect, useMemo, useState } from 'react';
import { erpApi } from '../erpApi';
import type { ErpAccount, ErpJournalEntry, AccountType, JournalLine } from '../erpTypes';
import { Badge, EmptyState } from '../components/ui';
import { Icon } from '../components/Icon';
import { useFormValidation, required, minLength } from '../useFormValidation';

type Tab = 'accounts' | 'journal';
const TYPE_COLORS: Record<AccountType, 'blue' | 'green' | 'amber' | 'red' | 'gray'> = { asset: 'blue', liability: 'red', income: 'green', expense: 'amber', equity: 'gray' };
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
    accountNumber: [required('Account number'), minLength('Account number', 1)],
    name: [required('Account name'), minLength('Account name', 2)],
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
    if (validLines.length === 0) { setJeError('Add at least one journal line with an account and amount'); return; }
    const totalDebit = validLines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = validLines.reduce((s, l) => s + (l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) { setJeError(`Debits (${totalDebit.toFixed(2)}) must equal Credits (${totalCredit.toFixed(2)})`); return; }
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
        <div className="stat-card"><div className="stat-icon stat-blue"><Icon name="wallet" size={22} /></div><div><div className="stat-value">{totalAssets.toFixed(0)}</div><div className="stat-label">Total Assets</div></div></div>
        <div className="stat-card"><div className="stat-icon stat-red"><Icon name="bar-chart" size={22} /></div><div><div className="stat-value">{totalLiabilities.toFixed(0)}</div><div className="stat-label">Liabilities</div></div></div>
        <div className="stat-card"><div className="stat-icon stat-green"><Icon name="trending-up" size={22} /></div><div><div className="stat-value">{totalIncome.toFixed(0)}</div><div className="stat-label">Income</div></div></div>
        <div className="stat-card"><div className="stat-icon stat-amber"><Icon name="trending-down" size={22} /></div><div><div className="stat-value">{totalExpenses.toFixed(0)}</div><div className="stat-label">Expenses</div></div></div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'accounts' ? 'active' : ''}`} onClick={() => { setTab('accounts'); setShowJeForm(false); }}>Chart of Accounts</button>
        <button className={`tab ${tab === 'journal' ? 'active' : ''}`} onClick={() => { setTab('journal'); setShowAccForm(false); }}>Journal Entries ({entries.length})</button>
      </div>

      {tab === 'accounts' && (
        <>
          <div className="flex-between mb-16">
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Chart of Accounts</h3>
            <button className="btn btn-primary" onClick={() => setShowAccForm(true)}>+ Add Account</button>
          </div>
          {showAccForm && (
            <div className="card mb-16">
              <h4 className="card-title">New Account</h4>
              <form onSubmit={handleAccSubmit} noValidate>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Account Number *</label>
                    <input className={`input ${accValidation.errors.accountNumber ? 'input-invalid' : ''}`} value={accForm.accountNumber} onChange={e => setAccForm({ ...accForm, accountNumber: e.target.value })} />
                    {accValidation.errors.accountNumber && <span className="field-error">{accValidation.errors.accountNumber}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Name *</label>
                    <input className={`input ${accValidation.errors.name ? 'input-invalid' : ''}`} value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} />
                    {accValidation.errors.name && <span className="field-error">{accValidation.errors.name}</span>}
                  </div>
                  <div className="form-group"><label className="form-label">Type *</label><select className="select" value={accForm.type} onChange={e => setAccForm({ ...accForm, type: e.target.value as AccountType })}><option value="asset">Asset</option><option value="liability">Liability</option><option value="income">Income</option><option value="expense">Expense</option><option value="equity">Equity</option></select></div>
                </div>
                <div className="flex gap-8"><button type="submit" className="btn btn-primary">Create</button><button type="button" className="btn btn-ghost" onClick={() => { setShowAccForm(false); accValidation.clearErrors(); }}>Cancel</button></div>
              </form>
            </div>
          )}
          {loading ? <div className="loading-screen"><span className="spinner" /> Loading...</div> : accounts.length === 0 ? (
            <EmptyState icon="wallet" title="No accounts" subtitle="Seed default accounts or add manually." />
          ) : (
            <div className="table-wrap"><table className="data"><thead><tr><th>#</th><th>Name</th><th>Type</th><th>Balance</th><th>Active</th></tr></thead><tbody>
              {accounts.map(a => (
                <tr key={a._id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{a.accountNumber}</td>
                  <td style={{ fontWeight: 600 }}>{a.name}</td>
                  <td><Badge color={TYPE_COLORS[a.type]}>{a.type}</Badge></td>
                  <td style={{ fontWeight: 700 }}>{(a.balance || 0).toFixed(2)}</td>
                  <td>{a.isActive ? <Badge color="green">Yes</Badge> : <Badge color="gray">No</Badge>}</td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </>
      )}

      {tab === 'journal' && (
        <>
          <div className="flex-between mb-16">
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Journal Entries</h3>
            <button className="btn btn-primary" onClick={() => setShowJeForm(true)}>+ New Entry</button>
          </div>
          {showJeForm && (
            <div className="card mb-16">
              <h4 className="card-title">New Journal Entry</h4>
              <form onSubmit={handleJeSubmit} noValidate>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Description</label><input className="input" value={jeForm.description} onChange={e => setJeForm({ ...jeForm, description: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Reference</label><input className="input" value={jeForm.reference} onChange={e => setJeForm({ ...jeForm, reference: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Status</label><select className="select" value={jeForm.status} onChange={e => setJeForm({ ...jeForm, status: e.target.value as any })}><option value="draft">Draft</option><option value="submitted">Submit</option></select></div>
                </div>
                <div className="form-section-title">Lines</div>
                {jeError && <div className="form-error-banner"><Icon name="alert-triangle" size={15} /> {jeError}</div>}
                {jeForm.lines.map((line, idx) => (
                  <div key={idx} className="flex gap-8 mb-16" style={{ alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 3, marginBottom: 0 }}><label className="form-label">Account</label><select className="select" value={line.account as string} onChange={e => { const updated = [...jeForm.lines]; updated[idx].account = e.target.value; updated[idx].accountName = accounts.find(a => a._id === e.target.value)?.name || ''; setJeForm({ ...jeForm, lines: updated }); setJeError(null); }}><option value="">Select...</option>{accounts.map(a => <option key={a._id} value={a._id}>{a.accountNumber} - {a.name}</option>)}</select></div>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}><label className="form-label">Debit</label><input className="input" type="number" step="0.01" min="0" value={line.debit || ''} onChange={e => { const updated = [...jeForm.lines]; updated[idx].debit = +e.target.value; setJeForm({ ...jeForm, lines: updated }); setJeError(null); }} /></div>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}><label className="form-label">Credit</label><input className="input" type="number" step="0.01" min="0" value={line.credit || ''} onChange={e => { const updated = [...jeForm.lines]; updated[idx].credit = +e.target.value; setJeForm({ ...jeForm, lines: updated }); setJeError(null); }} /></div>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => setJeForm({ ...jeForm, lines: jeForm.lines.filter((_, i) => i !== idx) })}>×</button>
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm mb-16" onClick={() => setJeForm({ ...jeForm, lines: [...jeForm.lines, { ...emptyLine }] })}>+ Add Line</button>
                <div className="flex gap-8"><button type="submit" className="btn btn-primary">Create</button><button type="button" className="btn btn-ghost" onClick={() => { setShowJeForm(false); setJeError(null); }}>Cancel</button></div>
              </form>
            </div>
          )}
          {loading ? <div className="loading-screen"><span className="spinner" /> Loading...</div> : entries.length === 0 ? (
            <EmptyState icon="file-text" title="No journal entries" />
          ) : (
            <div className="table-wrap"><table className="data"><thead><tr><th>Entry #</th><th>Date</th><th>Description</th><th>Debit</th><th>Credit</th><th>Status</th></tr></thead><tbody>
              {entries.map(e => (
                <tr key={e._id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{e.entryNumber}</td>
                  <td>{e.date ? new Date(e.date).toLocaleDateString() : '—'}</td>
                  <td>{e.description || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{(e.totalDebit || 0).toFixed(2)}</td>
                  <td style={{ fontWeight: 700 }}>{(e.totalCredit || 0).toFixed(2)}</td>
                  <td><Badge color={e.status === 'submitted' ? 'green' : e.status === 'cancelled' ? 'red' : 'gray'}>{e.status}</Badge></td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </>
      )}
    </>
  );
}
