import { useEffect, useState } from 'react';
import './App.css';

type Item = {
  _id: string;
  name: string;
  description?: string;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // Auth form state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      setIsAuthenticated(true);
      loadItems();
    }
  }, [token]);

  const loadItems = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/items', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Error loading items:', err);
    }
  };

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister
        ? { name: authName, email: authEmail, password: authPassword }
        : { email: authEmail, password: authPassword };

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Authentication failed');
        return;
      }

      const newToken = data.token;
      setToken(newToken);
      localStorage.setItem('token', newToken);
      setIsAuthenticated(true);
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
    } catch (err) {
      setError('Network error');
      console.error(err);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    try {
      await fetch('http://localhost:5000/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, description })
      });
      setName('');
      setDescription('');
      loadItems();
    } catch (err) {
      console.error('Error adding item:', err);
    }
  };

  const handleLogout = () => {
    setToken('');
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    setItems([]);
  };

  if (!isAuthenticated) {
    return (
      <main className="app-shell">
        <section className="hero-card">
          <h1>Supramax Energy Dashboard</h1>
          <p>Login or register to access your energy dossier</p>
        </section>

        <form onSubmit={handleAuth} className="form-card">
          {isRegister && (
            <input
              value={authName}
              onChange={(e) => setAuthName(e.target.value)}
              placeholder="Full name"
              required
            />
          )}
          <input
            type="email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <input
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <button type="submit">{isRegister ? 'Register' : 'Login'}</button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            style={{ backgroundColor: '#6b7280' }}
          >
            {isRegister ? 'Back to Login' : 'Create Account'}
          </button>
        </form>

        {error && <div style={{ color: 'red', textAlign: 'center', marginTop: 16 }}>{error}</div>}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Supramax Energy Dashboard</h1>
            <p>Manage your energy dossiers and contracts</p>
          </div>
          <button onClick={handleLogout} style={{ backgroundColor: '#ef4444' }}>
            Logout
          </button>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="form-card">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" required />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
        <button type="submit">Add item</button>
      </form>

      <section className="list-card">
        <h2>Items</h2>
        {items.length === 0 ? (
          <p>No items yet. Add one above!</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item._id}>
                <strong>{item.name}</strong>
                {item.description ? ` — ${item.description}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;
