import { useEffect, useMemo, useState } from 'react';
import { erpApi } from '../erpApi';
import type { ErpEmployee, ErpAttendance, EmployeeDepartment, EmployeeStatus, AttendanceStatus } from '../erpTypes';
import { Badge, EmptyState } from '../components/ui';
import { Icon } from '../components/Icon';
import { useFormValidation, required, minLength, email, phone, nonNegative } from '../useFormValidation';

type Tab = 'employees' | 'attendance';
const DEPARTMENTS: { value: EmployeeDepartment; label: string }[] = [
  { value: 'management', label: 'Direction' }, { value: 'sales', label: 'Ventes' },
  { value: 'engineering', label: 'Ingénierie' }, { value: 'installation', label: 'Installation' },
  { value: 'maintenance', label: 'Maintenance' }, { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'RH' }, { value: 'other', label: 'Autre' },
];
const EMP_STATUS_LABELS: Record<string, string> = { active: 'Actif', inactive: 'Inactif', on_leave: 'En congé' };
const ATT_STATUS_LABELS: Record<string, string> = { present: 'Présent', absent: 'Absent', half_day: 'Demi-journée', on_leave: 'En congé', late: 'En retard' };

export default function EmployeesPage() {
  const [tab, setTab] = useState<Tab>('employees');
  const [employees, setEmployees] = useState<ErpEmployee[]>([]);
  const [attendance, setAttendance] = useState<ErpAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [showAttForm, setShowAttForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState({ firstName: '', lastName: '', email: '', phone: '', department: 'other' as EmployeeDepartment, designation: '', salary: 0, status: 'active' as EmployeeStatus, address: '' });
  const [attForm, setAttForm] = useState({ employee: '', date: new Date().toISOString().split('T')[0], checkIn: '', checkOut: '', status: 'present' as AttendanceStatus, notes: '' });

  const empRules = useMemo(() => ({
    firstName: [required('Prénom'), minLength('Prénom', 2)],
    lastName: [required('Nom'), minLength('Nom', 2)],
    email: [email('E-mail')],
    phone: [phone('Téléphone')],
    salary: [nonNegative('Salaire')],
  }), []);
  const empValidation = useFormValidation(empRules);

  const attRules = useMemo(() => ({
    employee: [required('Employé')],
    date: [required('Date')],
  }), []);
  const attValidation = useFormValidation(attRules);

  const load = async () => {
    setLoading(true);
    try { const [e, a] = await Promise.all([erpApi.listEmployees(), erpApi.listAttendance()]); setEmployees(e); setAttendance(a); } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetEmpForm = () => { setEmpForm({ firstName: '', lastName: '', email: '', phone: '', department: 'other', designation: '', salary: 0, status: 'active', address: '' }); setEditingId(null); setShowEmpForm(false); empValidation.clearErrors(); };

  const handleEmpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empValidation.validate(empForm)) return;
    try {
      if (editingId) await erpApi.updateEmployee(editingId, empForm);
      else await erpApi.createEmployee(empForm);
      resetEmpForm(); await load();
    } catch (err: any) { alert(err.message); }
  };

  const handleAttSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attValidation.validate(attForm)) return;
    try { await erpApi.createAttendance(attForm); setAttForm({ employee: '', date: new Date().toISOString().split('T')[0], checkIn: '', checkOut: '', status: 'present', notes: '' }); setShowAttForm(false); attValidation.clearErrors(); await load(); } catch (err: any) { alert(err.message); }
  };

  const handleEdit = (emp: ErpEmployee) => {
    setEmpForm({ firstName: emp.firstName, lastName: emp.lastName, email: emp.email || '', phone: emp.phone || '', department: emp.department || 'other', designation: emp.designation || '', salary: emp.salary || 0, status: emp.status || 'active', address: emp.address || '' });
    setEditingId(emp._id); setShowEmpForm(true); empValidation.clearErrors();
  };

  const activeCount = employees.filter(e => e.status === 'active').length;
  const totalSalary = employees.filter(e => e.status === 'active').reduce((s, e) => s + (e.salary || 0), 0);

  return (
    <>
      <div className="grid grid-4 mb-16">
        <div className="stat-card"><div className="stat-icon stat-blue"><Icon name="users" size={22} /></div><div><div className="stat-value">{employees.length}</div><div className="stat-label">Total employés</div></div></div>
        <div className="stat-card"><div className="stat-icon stat-green"><Icon name="check-circle" size={22} /></div><div><div className="stat-value">{activeCount}</div><div className="stat-label">Actifs</div></div></div>
        <div className="stat-card"><div className="stat-icon stat-amber"><Icon name="banknote" size={22} /></div><div><div className="stat-value">{totalSalary.toFixed(0)}</div><div className="stat-label">Masse salariale mensuelle</div></div></div>
        <div className="stat-card"><div className="stat-icon stat-red"><Icon name="calendar" size={22} /></div><div><div className="stat-value">{attendance.length}</div><div className="stat-label">Pointages</div></div></div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'employees' ? 'active' : ''}`} onClick={() => { setTab('employees'); setShowAttForm(false); }}>Employés ({employees.length})</button>
        <button className={`tab ${tab === 'attendance' ? 'active' : ''}`} onClick={() => { setTab('attendance'); setShowEmpForm(false); }}>Pointage ({attendance.length})</button>
      </div>

      {tab === 'employees' && (
        <>
          <div className="flex-between mb-16">
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Employés</h3>
            <button className="btn btn-primary" onClick={() => { resetEmpForm(); setShowEmpForm(true); }}>+ Ajouter un employé</button>
          </div>
          {showEmpForm && (
            <div className="card mb-16">
              <h4 className="card-title">{editingId ? 'Modifier' : 'Nouvel'} employé</h4>
              <form onSubmit={handleEmpSubmit} noValidate>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Prénom *</label>
                    <input className={`input ${empValidation.errors.firstName ? 'input-invalid' : ''}`} value={empForm.firstName} onChange={e => setEmpForm({ ...empForm, firstName: e.target.value })} />
                    {empValidation.errors.firstName && <span className="field-error">{empValidation.errors.firstName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nom *</label>
                    <input className={`input ${empValidation.errors.lastName ? 'input-invalid' : ''}`} value={empForm.lastName} onChange={e => setEmpForm({ ...empForm, lastName: e.target.value })} />
                    {empValidation.errors.lastName && <span className="field-error">{empValidation.errors.lastName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">E-mail</label>
                    <input className={`input ${empValidation.errors.email ? 'input-invalid' : ''}`} value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} />
                    {empValidation.errors.email && <span className="field-error">{empValidation.errors.email}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Téléphone</label>
                    <input className={`input ${empValidation.errors.phone ? 'input-invalid' : ''}`} value={empForm.phone} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} />
                    {empValidation.errors.phone && <span className="field-error">{empValidation.errors.phone}</span>}
                  </div>
                  <div className="form-group"><label className="form-label">Département</label><select className="select" value={empForm.department} onChange={e => setEmpForm({ ...empForm, department: e.target.value as EmployeeDepartment })}>{DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Fonction</label><input className="input" value={empForm.designation} onChange={e => setEmpForm({ ...empForm, designation: e.target.value })} /></div>
                  <div className="form-group">
                    <label className="form-label">Salaire (TND)</label>
                    <input className={`input ${empValidation.errors.salary ? 'input-invalid' : ''}`} type="number" step="0.01" value={empForm.salary} onChange={e => setEmpForm({ ...empForm, salary: +e.target.value })} />
                    {empValidation.errors.salary && <span className="field-error">{empValidation.errors.salary}</span>}
                  </div>
                  <div className="form-group"><label className="form-label">Statut</label><select className="select" value={empForm.status} onChange={e => setEmpForm({ ...empForm, status: e.target.value as EmployeeStatus })}><option value="active">Actif</option><option value="inactive">Inactif</option><option value="on_leave">En congé</option></select></div>
                </div>
                <div className="form-group"><label className="form-label">Adresse</label><textarea className="textarea" rows={2} value={empForm.address} onChange={e => setEmpForm({ ...empForm, address: e.target.value })} /></div>
                <div className="flex gap-8"><button type="submit" className="btn btn-primary">{editingId ? 'Mettre à jour' : 'Créer'}</button><button type="button" className="btn btn-ghost" onClick={resetEmpForm}>Annuler</button></div>
              </form>
            </div>
          )}
          {loading ? <div className="loading-screen"><span className="spinner" /> Chargement...</div> : employees.length === 0 ? (
            <EmptyState icon="user" title="Aucun employé" subtitle="Ajoutez votre premier employé." />
          ) : (
            <div className="table-wrap"><table className="data"><thead><tr><th>ID</th><th>Nom</th><th>Département</th><th>Fonction</th><th>Salaire</th><th>Statut</th><th>Actions</th></tr></thead><tbody>
              {employees.map(emp => (
                <tr key={emp._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{emp.employeeId}</td>
                  <td style={{ fontWeight: 600 }}>{emp.firstName} {emp.lastName}</td>
                  <td><Badge color="blue">{DEPARTMENTS.find(d => d.value === emp.department)?.label || emp.department}</Badge></td>
                  <td>{emp.designation || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{(emp.salary || 0).toFixed(2)}</td>
                  <td><Badge color={emp.status === 'active' ? 'green' : emp.status === 'on_leave' ? 'amber' : 'red'}>{EMP_STATUS_LABELS[emp.status ?? ''] || emp.status}</Badge></td>
                  <td><div className="row-actions"><button className="btn btn-ghost btn-sm" onClick={() => handleEdit(emp)}>Modifier</button><button className="btn btn-danger btn-sm" onClick={async () => { if (confirm('Supprimer ?')) { await erpApi.deleteEmployee(emp._id); await load(); } }}>Supprimer</button></div></td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </>
      )}

      {tab === 'attendance' && (
        <>
          <div className="flex-between mb-16">
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Pointage</h3>
            <button className="btn btn-primary" onClick={() => setShowAttForm(true)}>+ Enregistrer un pointage</button>
          </div>
          {showAttForm && (
            <div className="card mb-16">
              <h4 className="card-title">Enregistrer un pointage</h4>
              <form onSubmit={handleAttSubmit} noValidate>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Employé *</label>
                    <select className={`select ${attValidation.errors.employee ? 'input-invalid' : ''}`} value={attForm.employee} onChange={e => setAttForm({ ...attForm, employee: e.target.value })}><option value="">Sélectionner…</option>{employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>)}</select>
                    {attValidation.errors.employee && <span className="field-error">{attValidation.errors.employee}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input className={`input ${attValidation.errors.date ? 'input-invalid' : ''}`} type="date" value={attForm.date} onChange={e => setAttForm({ ...attForm, date: e.target.value })} />
                    {attValidation.errors.date && <span className="field-error">{attValidation.errors.date}</span>}
                  </div>
                  <div className="form-group"><label className="form-label">Arrivée</label><input className="input" type="time" value={attForm.checkIn} onChange={e => setAttForm({ ...attForm, checkIn: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Départ</label><input className="input" type="time" value={attForm.checkOut} onChange={e => setAttForm({ ...attForm, checkOut: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Statut</label><select className="select" value={attForm.status} onChange={e => setAttForm({ ...attForm, status: e.target.value as AttendanceStatus })}><option value="present">Présent</option><option value="absent">Absent</option><option value="half_day">Demi-journée</option><option value="on_leave">En congé</option><option value="late">En retard</option></select></div>
                </div>
                <div className="form-group"><label className="form-label">Notes</label><input className="input" value={attForm.notes} onChange={e => setAttForm({ ...attForm, notes: e.target.value })} /></div>
                <div className="flex gap-8"><button type="submit" className="btn btn-primary">Enregistrer</button><button type="button" className="btn btn-ghost" onClick={() => { setShowAttForm(false); attValidation.clearErrors(); }}>Annuler</button></div>
              </form>
            </div>
          )}
          {loading ? <div className="loading-screen"><span className="spinner" /> Chargement...</div> : attendance.length === 0 ? (
            <EmptyState icon="calendar" title="Aucun pointage" subtitle="Enregistrez votre premier pointage." />
          ) : (
            <div className="table-wrap"><table className="data"><thead><tr><th>Date</th><th>Employé</th><th>Arrivée</th><th>Départ</th><th>Statut</th><th>Notes</th></tr></thead><tbody>
              {attendance.map(a => (
                <tr key={a._id}>
                  <td>{a.date ? new Date(a.date).toLocaleDateString() : '—'}</td>
                  <td style={{ fontWeight: 600 }}>{typeof a.employee === 'object' ? `${a.employee.firstName} ${a.employee.lastName}` : a.employeeName}</td>
                  <td>{a.checkIn || '—'}</td>
                  <td>{a.checkOut || '—'}</td>
                  <td><Badge color={a.status === 'present' ? 'green' : a.status === 'absent' ? 'red' : a.status === 'late' ? 'amber' : 'gray'}>{ATT_STATUS_LABELS[a.status ?? ''] || a.status}</Badge></td>
                  <td>{a.notes || '—'}</td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </>
      )}
    </>
  );
}
