import { useEffect, useMemo, useState } from 'react';
import { erpApi } from '../erpApi';
import type { ErpEmployee, ErpAttendance, EmployeeDepartment, EmployeeStatus, AttendanceStatus } from '../erpTypes';
import { Badge, EmptyState } from '../components/ui';
import { Icon } from '../components/Icon';
import { useFormValidation, required, minLength, email, phone, nonNegative } from '../useFormValidation';

type Tab = 'employees' | 'attendance';
const DEPARTMENTS: { value: EmployeeDepartment; label: string }[] = [
  { value: 'management', label: 'Management' }, { value: 'sales', label: 'Sales' },
  { value: 'engineering', label: 'Engineering' }, { value: 'installation', label: 'Installation' },
  { value: 'maintenance', label: 'Maintenance' }, { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'HR' }, { value: 'other', label: 'Other' },
];

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
    firstName: [required('First name'), minLength('First name', 2)],
    lastName: [required('Last name'), minLength('Last name', 2)],
    email: [email('Email')],
    phone: [phone('Phone')],
    salary: [nonNegative('Salary')],
  }), []);
  const empValidation = useFormValidation(empRules);

  const attRules = useMemo(() => ({
    employee: [required('Employee')],
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
        <div className="stat-card"><div className="stat-icon stat-blue"><Icon name="users" size={22} /></div><div><div className="stat-value">{employees.length}</div><div className="stat-label">Total Employees</div></div></div>
        <div className="stat-card"><div className="stat-icon stat-green"><Icon name="check-circle" size={22} /></div><div><div className="stat-value">{activeCount}</div><div className="stat-label">Active</div></div></div>
        <div className="stat-card"><div className="stat-icon stat-amber"><Icon name="banknote" size={22} /></div><div><div className="stat-value">{totalSalary.toFixed(0)}</div><div className="stat-label">Monthly Payroll</div></div></div>
        <div className="stat-card"><div className="stat-icon stat-red"><Icon name="calendar" size={22} /></div><div><div className="stat-value">{attendance.length}</div><div className="stat-label">Attendance Records</div></div></div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'employees' ? 'active' : ''}`} onClick={() => { setTab('employees'); setShowAttForm(false); }}>Employees ({employees.length})</button>
        <button className={`tab ${tab === 'attendance' ? 'active' : ''}`} onClick={() => { setTab('attendance'); setShowEmpForm(false); }}>Attendance ({attendance.length})</button>
      </div>

      {tab === 'employees' && (
        <>
          <div className="flex-between mb-16">
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Employees</h3>
            <button className="btn btn-primary" onClick={() => { resetEmpForm(); setShowEmpForm(true); }}>+ Add Employee</button>
          </div>
          {showEmpForm && (
            <div className="card mb-16">
              <h4 className="card-title">{editingId ? 'Edit' : 'New'} Employee</h4>
              <form onSubmit={handleEmpSubmit} noValidate>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input className={`input ${empValidation.errors.firstName ? 'input-invalid' : ''}`} value={empForm.firstName} onChange={e => setEmpForm({ ...empForm, firstName: e.target.value })} />
                    {empValidation.errors.firstName && <span className="field-error">{empValidation.errors.firstName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input className={`input ${empValidation.errors.lastName ? 'input-invalid' : ''}`} value={empForm.lastName} onChange={e => setEmpForm({ ...empForm, lastName: e.target.value })} />
                    {empValidation.errors.lastName && <span className="field-error">{empValidation.errors.lastName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className={`input ${empValidation.errors.email ? 'input-invalid' : ''}`} value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} />
                    {empValidation.errors.email && <span className="field-error">{empValidation.errors.email}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className={`input ${empValidation.errors.phone ? 'input-invalid' : ''}`} value={empForm.phone} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} />
                    {empValidation.errors.phone && <span className="field-error">{empValidation.errors.phone}</span>}
                  </div>
                  <div className="form-group"><label className="form-label">Department</label><select className="select" value={empForm.department} onChange={e => setEmpForm({ ...empForm, department: e.target.value as EmployeeDepartment })}>{DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Designation</label><input className="input" value={empForm.designation} onChange={e => setEmpForm({ ...empForm, designation: e.target.value })} /></div>
                  <div className="form-group">
                    <label className="form-label">Salary (TND)</label>
                    <input className={`input ${empValidation.errors.salary ? 'input-invalid' : ''}`} type="number" step="0.01" value={empForm.salary} onChange={e => setEmpForm({ ...empForm, salary: +e.target.value })} />
                    {empValidation.errors.salary && <span className="field-error">{empValidation.errors.salary}</span>}
                  </div>
                  <div className="form-group"><label className="form-label">Status</label><select className="select" value={empForm.status} onChange={e => setEmpForm({ ...empForm, status: e.target.value as EmployeeStatus })}><option value="active">Active</option><option value="inactive">Inactive</option><option value="on_leave">On Leave</option></select></div>
                </div>
                <div className="form-group"><label className="form-label">Address</label><textarea className="textarea" rows={2} value={empForm.address} onChange={e => setEmpForm({ ...empForm, address: e.target.value })} /></div>
                <div className="flex gap-8"><button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Create'}</button><button type="button" className="btn btn-ghost" onClick={resetEmpForm}>Cancel</button></div>
              </form>
            </div>
          )}
          {loading ? <div className="loading-screen"><span className="spinner" /> Loading...</div> : employees.length === 0 ? (
            <EmptyState icon="user" title="No employees" subtitle="Add your first employee." />
          ) : (
            <div className="table-wrap"><table className="data"><thead><tr><th>ID</th><th>Name</th><th>Department</th><th>Designation</th><th>Salary</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {employees.map(emp => (
                <tr key={emp._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{emp.employeeId}</td>
                  <td style={{ fontWeight: 600 }}>{emp.firstName} {emp.lastName}</td>
                  <td><Badge color="blue">{DEPARTMENTS.find(d => d.value === emp.department)?.label || emp.department}</Badge></td>
                  <td>{emp.designation || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{(emp.salary || 0).toFixed(2)}</td>
                  <td><Badge color={emp.status === 'active' ? 'green' : emp.status === 'on_leave' ? 'amber' : 'red'}>{emp.status}</Badge></td>
                  <td><div className="row-actions"><button className="btn btn-ghost btn-sm" onClick={() => handleEdit(emp)}>Edit</button><button className="btn btn-danger btn-sm" onClick={async () => { if (confirm('Delete?')) { await erpApi.deleteEmployee(emp._id); await load(); } }}>Delete</button></div></td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </>
      )}

      {tab === 'attendance' && (
        <>
          <div className="flex-between mb-16">
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Attendance</h3>
            <button className="btn btn-primary" onClick={() => setShowAttForm(true)}>+ Record Attendance</button>
          </div>
          {showAttForm && (
            <div className="card mb-16">
              <h4 className="card-title">Record Attendance</h4>
              <form onSubmit={handleAttSubmit} noValidate>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Employee *</label>
                    <select className={`select ${attValidation.errors.employee ? 'input-invalid' : ''}`} value={attForm.employee} onChange={e => setAttForm({ ...attForm, employee: e.target.value })}><option value="">Select...</option>{employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>)}</select>
                    {attValidation.errors.employee && <span className="field-error">{attValidation.errors.employee}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input className={`input ${attValidation.errors.date ? 'input-invalid' : ''}`} type="date" value={attForm.date} onChange={e => setAttForm({ ...attForm, date: e.target.value })} />
                    {attValidation.errors.date && <span className="field-error">{attValidation.errors.date}</span>}
                  </div>
                  <div className="form-group"><label className="form-label">Check In</label><input className="input" type="time" value={attForm.checkIn} onChange={e => setAttForm({ ...attForm, checkIn: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Check Out</label><input className="input" type="time" value={attForm.checkOut} onChange={e => setAttForm({ ...attForm, checkOut: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Status</label><select className="select" value={attForm.status} onChange={e => setAttForm({ ...attForm, status: e.target.value as AttendanceStatus })}><option value="present">Present</option><option value="absent">Absent</option><option value="half_day">Half Day</option><option value="on_leave">On Leave</option><option value="late">Late</option></select></div>
                </div>
                <div className="form-group"><label className="form-label">Notes</label><input className="input" value={attForm.notes} onChange={e => setAttForm({ ...attForm, notes: e.target.value })} /></div>
                <div className="flex gap-8"><button type="submit" className="btn btn-primary">Record</button><button type="button" className="btn btn-ghost" onClick={() => { setShowAttForm(false); attValidation.clearErrors(); }}>Cancel</button></div>
              </form>
            </div>
          )}
          {loading ? <div className="loading-screen"><span className="spinner" /> Loading...</div> : attendance.length === 0 ? (
            <EmptyState icon="calendar" title="No attendance records" subtitle="Record your first attendance." />
          ) : (
            <div className="table-wrap"><table className="data"><thead><tr><th>Date</th><th>Employee</th><th>Check In</th><th>Check Out</th><th>Status</th><th>Notes</th></tr></thead><tbody>
              {attendance.map(a => (
                <tr key={a._id}>
                  <td>{a.date ? new Date(a.date).toLocaleDateString() : '—'}</td>
                  <td style={{ fontWeight: 600 }}>{typeof a.employee === 'object' ? `${a.employee.firstName} ${a.employee.lastName}` : a.employeeName}</td>
                  <td>{a.checkIn || '—'}</td>
                  <td>{a.checkOut || '—'}</td>
                  <td><Badge color={a.status === 'present' ? 'green' : a.status === 'absent' ? 'red' : a.status === 'late' ? 'amber' : 'gray'}>{a.status}</Badge></td>
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
