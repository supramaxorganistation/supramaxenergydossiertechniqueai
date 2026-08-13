import { useState, useEffect, useRef } from 'react';
import { api, setToken } from '../api';
import type { User } from '../types';
import FaceScannerModal from '../components/FaceScannerModal';

type View = 'login' | 'register' | 'forgot';

// Generate a strong random password (letters, digits, symbols)
function generateStrongPassword(length = 16): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*_-+=?';
  const all = upper + lower + digits + symbols;
  const rand = (n: number) => {
    const arr = new Uint32Array(n);
    window.crypto.getRandomValues(arr);
    return Array.from(arr);
  };
  const pick = (chars: string, n: number) =>
    rand(n).map((v) => chars[v % chars.length]).join('');
  // Guarantee at least one char of each class, then fill the rest
  const base = pick(upper, 3) + pick(lower, 5) + pick(digits, 3) + pick(symbols, 2);
  const rest = pick(all, Math.max(0, length - base.length));
  const combined = base + rest;
  // Shuffle positions using fresh random values
  const order = rand(combined.length);
  return combined
    .split('')
    .map((ch, i) => ({ ch, k: order[i] }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.ch)
    .join('');
}

declare global {
  interface Window {
    grecaptcha?: {
      render: (el: HTMLElement, opts: Record<string, any>) => number;
      getResponse: (id: number) => string;
      reset: (id: number) => void;
    };
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (el: HTMLElement, opts: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [view, setView] = useState<View>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState('');
  const [faceModal, setFaceModal] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaId = useRef<number | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // --- Load reCAPTCHA site key ---
  useEffect(() => {
    api.getRecaptchaKey().then(({ siteKey }) => {
      if (siteKey) setRecaptchaSiteKey(siteKey);
    }).catch(() => {});
  }, []);

  // --- Load reCAPTCHA script and render widget ---
  useEffect(() => {
    if (!recaptchaSiteKey) return;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled) return;
      if (!recaptchaRef.current || !window.grecaptcha) return;
      // Always reset: old widget may be stale if view changed
      recaptchaId.current = null;
      try {
        recaptchaId.current = window.grecaptcha.render(recaptchaRef.current, {
          sitekey: recaptchaSiteKey,
          theme: 'light',
        });
      } catch {
        // Widget already rendered in this container — that's fine
      }
    };

    // Load script if not already loaded
    if (!document.querySelector('script[src*="recaptcha"]')) {
      const s = document.createElement('script');
      s.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }

    // Poll for grecaptcha to become available, then render
    const interval = setInterval(() => {
      if (window.grecaptcha) {
        clearInterval(interval);
        // Small delay to ensure the div is mounted
        setTimeout(renderWidget, 100);
      }
    }, 200);

    // Give up after 10 seconds
    setTimeout(() => clearInterval(interval), 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [recaptchaSiteKey, view]);

  // --- Google Identity Services ---
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
  const googleInitialized = useRef(false);

  useEffect(() => {
    if (!googleClientId || googleClientId.startsWith('YOUR_')) return;

    const initGoogle = () => {
      if (!window.google || googleInitialized.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: { credential: string }) => {
          setError('');
          setLoading(true);
          try {
            const data = await api.loginWithGoogle(response.credential);
            setToken(data.token);
            onLogin(data.user);
          } catch (err: any) {
            setError(err.message || 'Google login failed');
          } finally {
            setLoading(false);
          }
        },
      });
      googleInitialized.current = true;
    };

    const renderGoogleButton = () => {
      if (!window.google || !googleBtnRef.current || !googleInitialized.current) return;
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 352,
      });
    };

    // Load script if needed
    if (!document.querySelector('script[src*="accounts.google.com"]')) {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => {
        initGoogle();
        renderGoogleButton();
      };
      document.head.appendChild(s);
    } else {
      initGoogle();
      renderGoogleButton();
    }
  }, [googleClientId, onLogin]);

  // Re-render Google button when returning to login/register view
  useEffect(() => {
    if (!window.google || !googleBtnRef.current || !googleInitialized.current) return;
    if (view !== 'forgot') {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 352,
      });
    }
  }, [view]);

  // --- Face ID login (camera scanner) ---
  const pendingFaceAuth = useRef<{ token: string; user: User } | null>(null);

  // Called by the scanner for each detected face: true only if the backend
  // recognizes this specific face as an enrolled user.
  const handleFaceVerify = async (descriptor: number[]): Promise<boolean> => {
    try {
      pendingFaceAuth.current = await api.faceLogin(descriptor);
      return true;
    } catch {
      return false;
    }
  };

  // Called after the green circle: log the matched user in
  const handleFaceMatched = () => {
    const data = pendingFaceAuth.current;
    if (!data) return;
    setToken(data.token);
    onLogin(data.user);
  };

  // --- Get reCAPTCHA token ---
  const getRecaptchaToken = (): string | undefined => {
    if (window.grecaptcha && recaptchaId.current !== null) {
      return window.grecaptcha.getResponse(recaptchaId.current) || undefined;
    }
    return undefined;
  };

  const resetCaptcha = () => {
    if (window.grecaptcha && recaptchaId.current !== null) {
      window.grecaptcha.reset(recaptchaId.current);
    }
  };

  // === FORM SUBMIT ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (view === 'login') {
        const recaptchaToken = getRecaptchaToken();
        const data = await api.login(email, password, recaptchaToken);
        setToken(data.token);
        onLogin(data.user);
      } else if (view === 'register') {
        const data = await api.register(name, email, password);
        setToken(data.token);
        onLogin(data.user);
      } else if (view === 'forgot') {
        const result = await api.forgotPassword(email);
        setSuccess(result.message);
        setError('');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur d\'authentification');
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const isForgot = view === 'forgot';
  const isRegister = view === 'register';

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
          <h2>
            {isRegister ? 'Créer un compte' : isForgot ? 'Mot de passe oublié' : 'Connexion'}
          </h2>
          <p className="login-sub">
            {isRegister
              ? 'Créez votre compte pour accéder à la plateforme'
              : isForgot
                ? 'Entrez votre email pour recevoir le lien de réinitialisation'
                : 'Accédez à vos dossiers techniques'}
          </p>

          <form noValidate onSubmit={handleSubmit}>
            {isRegister && (
              <div className="form-group">
                <label className="form-label">Nom complet</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Ahmed Ben Salah" />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemple@mail.com" />
            </div>

            {!isForgot && (
              <div className="form-group">
                <div className="pw-label-row">
                  <label className="form-label">Mot de passe</label>
                  {isRegister && (
                    <button
                      type="button"
                      className="pw-suggest"
                      onClick={() => { setPassword(generateStrongPassword()); setShowPw(true); }}
                      title="Générer un mot de passe fort"
                    >
                      🔑 Suggérer un mot de passe
                    </button>
                  )}
                </div>
                <div className="pw-input-wrap">
                  <input
                    className="input"
                    type={showPw && isRegister ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  {isRegister && password && (
                    <button type="button" className="pw-eye" onClick={() => setShowPw((s) => !s)} title={showPw ? 'Masquer' : 'Afficher'}>
                      {showPw ? '🙈' : '👁'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* reCAPTCHA (login/register only) */}
            {recaptchaSiteKey && !isForgot && (
              <div style={{ marginBottom: 14 }}>
                <div ref={recaptchaRef}></div>
              </div>
            )}

            {error && <div className="msg-box error">{error}</div>}
            {success && <div className="msg-box info">{success}</div>}

            <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading
                ? 'Patientez...'
                : isRegister
                  ? 'S\'inscrire'
                  : isForgot
                    ? 'Envoyer le lien de réinitialisation'
                    : 'Se connecter'}
            </button>
          </form>

          {/* Face ID login (opens the camera scanner) */}
          {!isForgot && !isRegister && (
            <button
              type="button"
              className="btn btn-outline btn-block"
              onClick={() => { setError(''); setFaceModal(true); }}
              disabled={loading}
              style={{ marginTop: 6 }}
            >
              🔐 Se connecter avec Face ID
            </button>
          )}

          {/* Divider + Social */}
          {!isForgot && (
            <>
              <div className="login-divider">
                <span>ou continuer avec</span>
              </div>

              {/* Google button */}
              <div ref={googleBtnRef} className="login-google-container"></div>
            </>
          )}

          {/* Navigation links */}
          <div className="login-links">
            {isForgot ? (
              <span>
                <a href="#" onClick={(e) => { e.preventDefault(); setView('login'); setError(''); setSuccess(''); }}>
                  ← Retour à la connexion
                </a>
              </span>
            ) : isRegister ? (
              <span>
                Déjà un compte ?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setView('login'); setError(''); setSuccess(''); }}>
                  Se connecter
                </a>
              </span>
            ) : (
              <div className="login-links-row">
                <span>
                  Pas de compte ?{' '}
                  <a href="#" onClick={(e) => { e.preventDefault(); setView('register'); setError(''); setSuccess(''); }}>
                    S'inscrire
                  </a>
                </span>
                <a href="#" className="login-forgot-link" onClick={(e) => { e.preventDefault(); setView('forgot'); setError(''); setSuccess(''); }}>
                  Mot de passe oublié ?
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {faceModal && (
        <FaceScannerModal
          mode="login"
          onClose={() => setFaceModal(false)}
          onVerify={handleFaceVerify}
          onMatched={handleFaceMatched}
        />
      )}
    </div>
  );
}

// === RESET PASSWORD PAGE (rendered from hash route) ===
export function ResetPasswordPage({ token, onDone }: { token: string; onDone: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Suggest a strong password and fill both fields with it
  const suggestPassword = () => {
    const pw = generateStrongPassword();
    setNewPassword(pw);
    setConfirm(pw);
    setShowPw(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const result = await api.resetPassword(token, newPassword);
      setSuccess(result.message || 'Password reset successfully. You can now log in.');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
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
        <h1>Réinitialisation du mot de passe</h1>
        <p>Entrez votre nouveau mot de passe ci-dessous.</p>
      </div>
      <div className="login-panel">
        <div className="login-card">
          <h2>Nouveau mot de passe</h2>
          <p className="login-sub">Choisissez un mot de passe sécurisé (min. 6 caractères)</p>

          <form noValidate onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="pw-label-row">
                <label className="form-label">Nouveau mot de passe</label>
                <button type="button" className="pw-suggest" onClick={suggestPassword} title="Générer un mot de passe fort">
                  🔑 Suggérer un mot de passe
                </button>
              </div>
              <div className="pw-input-wrap">
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
                {newPassword && (
                  <button type="button" className="pw-eye" onClick={() => setShowPw((s) => !s)} title={showPw ? 'Masquer' : 'Afficher'}>
                    {showPw ? '🙈' : '👁'}
                  </button>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirmer le mot de passe</label>
              <input
                className="input"
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && <div className="msg-box error">{error}</div>}
            {success && <div className="msg-box info">{success}</div>}
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
            </button>
          </form>
          {success && (
            <div className="login-links" style={{ marginTop: 16 }}>
              <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; onDone(); }}>
                ← Retour à la connexion
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
