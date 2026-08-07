import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Role, User } from '../types';
import { Badge, LoadingScreen, EmptyState } from '../components/ui';

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  technician: 'Technicien',
  client: 'Client',
};

const ROLE_BADGE: Record<Role, 'blue' | 'green' | 'gray'> = {
  admin: 'blue',
  technician: 'green',
  client: 'gray',
};

export default function AdminPage({ currentUser }: { currentUser: User }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'technician' as Role,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await api.listUsers());
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (user: User, role: Role) => {
    if (user._id === currentUser.id) return;
    setSaving(user._id);
    setError('');
    try {
      const updated = await api.updateUserRole(user._id, role);
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
    } catch (err: any) {
      setError(err.message || 'Erreur lors du changement de rôle');
    } finally {
      setSaving(null);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const created = await api.createUser(
        createForm.name,
        createForm.email,
        createForm.password,
        createForm.role
      );
      setUsers((prev) => [created, ...prev]);
      setCreateForm({ name: '', email: '', password: '', role: 'technician' });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingScreen label="Chargement des utilisateurs..." />;

  return (
    <>
      <div className="grid grid-4 mb-16">
        <div className="stat-card" style={{ display: 'block' }}>
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">Utilisateurs</div>
        </div>
        <div className="stat-card" style={{ display: 'block' }}>
          <div className="stat-value">{users.filter((u) => u.role === 'admin').length}</div>
          <div className="stat-label">Administrateurs</div>
        </div>
        <div className="stat-card" style={{ display: 'block' }}>
          <div className="stat-value">{users.filter((u) => u.role === 'technician').length}</div>
          <div className="stat-label">Techniciens</div>
        </div>
        <div className="stat-card" style={{ display: 'block' }}>
          <div className="stat-value">{users.filter((u) => u.role === 'client').length}</div>
          <div className="stat-label">Clients</div>
        </div>
      </div>

      {error && <div className="msg-box error mb-16">{error}</div>}

      <div className="card">
        <h4 className="card-title">👥 Gestion des utilisateurs</h4>
        <p className="card-subtitle">
          Attribuez les rôles : <strong>admin</strong> (gestion complète),{' '}
          <strong>technician</strong> (création de dossiers) et <strong>client</strong> (consultation).
        </p>

        <form
          onSubmit={createUser}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr 1fr 180px auto',
            gap: 12,
            alignItems: 'end',
            marginBottom: 20,
            paddingBottom: 20,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Nom</label>
            <input
              className="input"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="Nom complet"
              required
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Email</label>
            <input
              className="input"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="email@mail.com"
              required
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Mot de passe</label>
            <input
              className="input"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Rôle</label>
            <select
              className="select"
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as Role })}
            >
              <option value="admin">Administrateur</option>
              <option value="technician">Technicien</option>
              <option value="client">Client</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={creating}>
            {creating ? 'Création...' : '+ Créer'}
          </button>
        </form>

        {users.length === 0 ? (
          <EmptyState icon="👥" title="Aucun utilisateur" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Inscrit le</th>
                  <th>Changer le rôle</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user._id === currentUser.id;
                  return (
                    <tr key={user._id}>
                      <td>
                        <strong>{user.name}</strong>
                        {isSelf && <Badge color="amber">vous</Badge>}
                      </td>
                      <td>{user.email}</td>
                      <td><Badge color={ROLE_BADGE[user.role]}>{ROLE_LABELS[user.role]}</Badge></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td>
                        <select
                          className="select"
                          style={{ width: 170 }}
                          value={user.role}
                          disabled={isSelf || saving === user._id}
                          onChange={(e) => changeRole(user, e.target.value as Role)}
                        >
                          <option value="admin">Administrateur</option>
                          <option value="technician">Technicien</option>
                          <option value="client">Client</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
