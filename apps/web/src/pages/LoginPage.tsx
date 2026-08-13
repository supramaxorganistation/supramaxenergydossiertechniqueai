import { useState, useEffect, useRef, useCallback } from 'react';
import { api, setToken } from '../api';
import type { User } from '../types';

type View = 'login' | 'register' | 'forgot' | 'biometric';

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
  const [hasWebAuthn, setHasWebAuthn] = useState(false);

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

  // --- Load Google Identity Services ---
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
    if (!clientId || clientId.startsWith('YOUR_')) return;
    if (document.querySelector('script[src*="accounts.google.com"]')) return;

    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
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
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: '100%',
        });
      }
    };
    document.head.appendChild(s);
  }, []);

  // --- Check WebAuthn support for email ---
  const checkWebAuthn = useCallback(async () => {
    if (!email || !window.PublicKeyCredential) {
      setHasWebAuthn(false);
      return;
    }
    try {
      const { hasCredentials } = await api.webauthnHasCredentials(email);
      setHasWebAuthn(hasCredentials);
    } catch {
      setHasWebAuthn(false);
    }
  }, [email]);

  useEffect(() => {
    const t = setTimeout(checkWebAuthn, 600);
    return () => clearTimeout(t);
  }, [email, checkWebAuthn]);

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

  // === FACE ID / WEBAUTHN LOGIN ===
  const handleFaceIdLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const options = await api.webauthnAuthOptions(email);
      const { userId, allowCredentials, challenge, ...rest } = options;

      const credential = await navigator.credentials.get({
        publicKey: {
          ...rest,
          challenge: Uint8Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
          allowCredentials: (allowCredentials || []).map((c: any) => ({
            id: Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), (x) => x.charCodeAt(0)),
            type: 'public-key' as const,
          })),
        },
      }) as PublicKeyCredential | null;

      if (!credential) throw new Error('Authentication cancelled');
      const data = await api.webauthnAuthVerify(userId, credential);
      setToken(data.token);
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message || 'Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // === WEBAUTHN REGISTER ===
  const handleWebAuthnRegister = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const options = await api.webauthnRegisterOptions();
      const { challenge, user, excludeCredentials, pubKeyCredParams, ...restOptions } = options;

      const credential = await navigator.credentials.create({
        publicKey: {
          ...restOptions,
          challenge: Uint8Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
          user: {
            ...user,
            id: Uint8Array.from(atob(user.id.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
          },
          pubKeyCredParams: pubKeyCredParams || [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          excludeCredentials: excludeCredentials?.map((c: any) => ({
            id: Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
            type: 'public-key' as const,
          })) || [],
        },
      }) as PublicKeyCredential | null;

      if (!credential) throw new Error('Registration cancelled');
      const result = await api.webauthnRegisterVerify(credential);
      setSuccess(result.message || 'Face ID registered successfully!');
    } catch (err: any) {
      setError(err.message || 'Biometric registration failed');
    } finally {
      setLoading(false);
    }
  };

  const isBiometricView = view === 'biometric';
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
            {isRegister ? 'Créer un compte' : isForgot ? 'Mot de passe oublié' : isBiometricView ? 'Connexion biométrique' : 'Connexion'}
          </h2>
          <p className="login-sub">
            {isRegister
              ? 'Créez votre compte pour accéder à la plateforme'
              : isForgot
                ? 'Entrez votre email pour notifier l\'administrateur'
                : isBiometricView
                  ? 'Utilisez Face ID ou votre empreinte digitale'
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

            {!isForgot && !isBiometricView && (
              <div className="form-group">
                <label className="form-label">Mot de passe</label>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
            )}

            {/* reCAPTCHA (login/register only) */}
            {recaptchaSiteKey && !isForgot && !isBiometricView && (
              <div style={{ marginBottom: 14 }}>
                <div ref={recaptchaRef}></div>
              </div>
            )}

            {error && <div className="msg-box error">{error}</div>}
            {success && <div className="msg-box info">{success}</div>}

            {!isBiometricView && (
              <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ marginTop: 8 }}>
                {loading
                  ? 'Patientez...'
                  : isRegister
                    ? 'S\'inscrire'
                    : isForgot
                      ? 'Notifier l\'administrateur'
                      : 'Se connecter'}
              </button>
            )}
          </form>

          {/* Biometric login */}
          {isBiometricView && (
            <button className="btn btn-primary btn-block" onClick={handleFaceIdLogin} disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Vérification...' : '🔐 Utiliser Face ID / Biométrie'}
            </button>
          )}

          {/* Register Face ID (only when logged in via password) */}
          {!isForgot && !isRegister && !isBiometricView && email && window.PublicKeyCredential && (
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={handleWebAuthnRegister}
              disabled={loading}
              style={{ marginTop: 6, fontSize: 12.5 }}
            >
              🔒 Enregistrer Face ID pour ce compte
            </button>
          )}

          {/* Divider + Social */}
          {!isForgot && !isBiometricView && (
            <>
              <div className="login-divider">
                <span>ou continuer avec</span>
              </div>

              {/* Google button */}
              <div ref={googleBtnRef} style={{ marginBottom: 10 }}></div>

              {/* Face ID */}
              {hasWebAuthn && email && (
                <button
                  type="button"
                  className="btn btn-outline btn-block login-social-btn"
                  onClick={handleFaceIdLogin}
                  disabled={loading}
                >
                  🔐 Se connecter avec Face ID / Biométrie
                </button>
              )}
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
            ) : isBiometricView ? (
              <span>
                <a href="#" onClick={(e) => { e.preventDefault(); setView('login'); setError(''); }}>
                  ← Retour
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
              <label className="form-label">Nouveau mot de passe</label>
              <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmer le mot de passe</label>
              <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
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
