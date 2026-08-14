import { useState } from 'react';
import { api } from '../api';
import type { User } from '../types';
import { Badge } from '../components/ui';
import { Icon } from '../components/Icon';
import FaceScannerModal from '../components/FaceScannerModal';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  technician: 'Technicien',
  client: 'Client',
};

export default function ProfilePage({
  currentUser,
  onUserUpdated,
}: {
  currentUser: User;
  onUserUpdated: (u: User) => void;
}) {
  const [hasFace, setHasFace] = useState(!!currentUser.hasFace);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const initials = (currentUser.name || currentUser.email || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleFaceCaptured = async (descriptor: number[]) => {
    setError('');
    try {
      await api.faceRegister(currentUser.id, descriptor);
      setHasFace(true);
      setMsg('Visage enregistré avec succès. Vous pouvez maintenant vous connecter avec Face ID.');
      setScannerOpen(false);
      onUserUpdated({ ...currentUser, hasFace: true });
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement du visage");
      setScannerOpen(false);
    }
  };

  return (
    <>
      <div className="profile-grid">
        {/* Account info */}
        <div className="card">
          <h4 className="card-title"><Icon name="user" size={15} /> Informations du compte</h4>
          <div className="profile-head">
            <div className="profile-avatar">{initials}</div>
            <div>
              <div className="profile-name">{currentUser.name || currentUser.email}</div>
              <div className="profile-email">{currentUser.email}</div>
            </div>
          </div>
          <div className="profile-rows">
            <div className="profile-row">
              <span className="profile-key">Rôle</span>
              <Badge color={currentUser.role === 'admin' ? 'blue' : currentUser.role === 'technician' ? 'green' : 'gray'}>
                {ROLE_LABELS[currentUser.role] || currentUser.role}
              </Badge>
            </div>
            <div className="profile-row">
              <span className="profile-key">Email</span>
              <span>{currentUser.email}</span>
            </div>
            {currentUser.createdAt && (
              <div className="profile-row">
                <span className="profile-key">Inscrit le</span>
                <span>{new Date(currentUser.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Face ID management */}
        <div className="card">
          <h4 className="card-title"><Icon name="face-scan" size={15} /> Face ID</h4>
          <p className="card-subtitle">
            Enregistrez votre visage pour vous connecter en un scan depuis la page de connexion.
          </p>

          <div className="profile-row" style={{ marginBottom: 14 }}>
            <span className="profile-key">Statut</span>
            {hasFace ? <Badge color="green"><Icon name="check" size={13} /> Visage enregistré</Badge> : <Badge color="gray">Non enregistré</Badge>}
          </div>

          {msg && <div className="msg-box info">{msg}</div>}
          {error && <div className="msg-box error">{error}</div>}

          <button
            className="btn btn-primary"
            onClick={() => { setMsg(''); setError(''); setScannerOpen(true); }}
          >
            {hasFace ? <><Icon name="refresh" size={15} /> Ré-enregistrer mon visage</> : <><Icon name="face-scan" size={15} /> Ajouter mon visage</>}
          </button>
        </div>
      </div>

      {scannerOpen && (
        <FaceScannerModal
          mode="register"
          onClose={() => setScannerOpen(false)}
          onCaptured={handleFaceCaptured}
        />
      )}
    </>
  );
}
