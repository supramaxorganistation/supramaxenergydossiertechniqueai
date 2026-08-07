import { useState } from 'react';
import { api, setToken } from '../api';
import type { User } from '../types';

export default function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = isRegister
        ? await api.register(name, email, password)
        : await api.login(email, password);
      setToken(data.token);
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message || 'Erreur d’authentification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="hero-logo">
          <span className="logo-box">⚡</span>
          <span>Supramax Energy</span>
        </div>
        <h1>Génération automatique des dossiers techniques photovoltaïques</h1>
        <p>
          Plateforme de gestion de bout en bout : saisie des installations, calculs de
          conformité STEG, analyse des datasheets par IA et export du dossier technique PDF.
        </p>
        <div className="hero-points">
          <div className="hp"><span>✓</span> Conformité STEG en un clic (câbles, protections, vent, chaînes)</div>
          <div className="hp"><span>✓</span> Extraction IA des caractéristiques équipements (Gemini)</div>
          <div className="hp"><span>✓</span> Dossier technique PDF complet et prêt à soumettre</div>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-card">
          <h2>{isRegister ? 'Créer un compte' : 'Connexion'}</h2>
          <p className="login-sub">
            {isRegister
              ? 'Créez votre compte pour accéder à la plateforme'
              : 'Accédez à vos dossiers techniques'}
          </p>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="form-group">
                <label className="form-label">Nom complet</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Ahmed Ben Salah"
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@mail.com"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="msg-box error mb-16">{error}</div>
            )}

            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? 'Patientez...' : isRegister ? 'S’inscrire' : 'Se connecter'}
            </button>
          </form>

          <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13 }}>
            {isRegister ? (
              <span>
                Déjà un compte ?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(false); setError(''); }}>
                  Se connecter
                </a>
              </span>
            ) : (
              <span>
                Pas de compte ?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(true); setError(''); }}>
                  S’inscrire
                </a>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
