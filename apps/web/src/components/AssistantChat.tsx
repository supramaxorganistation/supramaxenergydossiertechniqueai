import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { ChatMessage, Dossier } from '../types';

const QUICK_PROMPTS = [
  'Que manque-t-il pour un dossier parfait ?',
  'Vérifie la conformité STEG et explique les erreurs',
  'Rédige les textes narratifs du dossier',
  'Corrige les champs manquants avec des valeurs cohérentes',
];

const ACTION_LABELS: Record<string, string> = {
  update_dossier: '✏️ Dossier mis à jour',
  attach_user_images: '🖼️ Images enregistrées',
  generate_texts: '📝 Textes rédigés',
  get_dossier: '👁️ Lecture du dossier',
  get_compliance: '✅ Analyse conformité',
};

function fileToBase64(file: File): Promise<{ mimeType: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ mimeType: file.type || 'image/png', base64: String(reader.result) });
    reader.onerror = () => reject(new Error(`Impossible de lire ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function AssistantChat({
  dossier,
  canManage,
  onSaved,
}: {
  dossier: Dossier;
  canManage: boolean;
  onSaved: () => Promise<void>;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(dossier.chatHistory || []);
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resync when switching to another dossier
  useEffect(() => {
    setMessages(dossier.chatHistory || []);
  }, [dossier._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to the newest message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  // Revoke object URLs on unmount
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const next = [...pendingFiles];
    const nextPreviews = [...previews];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue;
      if (next.length >= 3) break;
      next.push(f);
      nextPreviews.push(URL.createObjectURL(f));
    }
    setPendingFiles(next);
    setPreviews(nextPreviews);
  }, [pendingFiles, previews]);

  const removeFile = useCallback((idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  }, [previews]);

  const send = useCallback(async (text: string) => {
    const message = text.trim();
    if ((!message && pendingFiles.length === 0) || isSending) return;
    setIsSending(true);
    setError('');
    setMessages((prev) => [...prev, { role: 'user', text: message || `[${pendingFiles.length} image(s) jointe(s)]`, images: pendingFiles.length }]);
    try {
      const images = await Promise.all(pendingFiles.map(fileToBase64));
      const res = await api.chat(dossier._id, message, images);
      setMessages(res.history || [
        ...(dossier.chatHistory || []),
        { role: 'user', text: message },
        { role: 'assistant', text: res.reply, actions: res.actions, fallback: res.fallback },
      ]);
      setPendingFiles([]);
      setPreviews((prev) => { prev.forEach((u) => URL.revokeObjectURL(u)); return []; });
      setInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      // The agent may have modified the dossier or attached documents
      if ((res.actions || []).length > 0) await onSaved();
    } catch (err: any) {
      setError(err.message || 'Erreur de communication avec l\u2019assistant.');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  }, [pendingFiles, isSending, dossier._id, dossier.chatHistory, onSaved]);

  return (
    <div className="card chat-card">
      <div className="chat-header">
        <div>
          <h4 className="card-title">🤖 Supramax Assistant</h4>
          <p className="card-subtitle">
            Agent IA connecté au dossier : il lit, corrige et complète les données, vérifie la
            conformité STEG, rédige les textes et enregistre vos images.
          </p>
        </div>
      </div>

      <div className="chat-window" ref={scrollRef}>
        {messages.length === 0 && !isSending && (
          <div className="chat-empty">
            <div style={{ fontSize: 34 }}>🤖</div>
            <p style={{ fontWeight: 600 }}>Bonjour, je suis votre assistant dossier.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Demandez-moi d'analyser ce dossier, de corriger des valeurs, de rédiger les
              descriptions ou joignez une photo (plaque signalétique, fiche technique) et je
              m'occupe du reste.
            </p>
            <div className="chat-quick">
              {QUICK_PROMPTS.map((q) => (
                <button key={q} className="chat-quick-btn" onClick={() => send(q)} disabled={!canManage}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => (
          <div key={idx} className={`chat-row ${m.role === 'user' ? 'chat-row-user' : ''}`}>
            <div className={`chat-bubble ${m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>
              {m.text && <div className="chat-text">{m.text}</div>}
              {!m.text && m.images ? <div className="chat-text">🖼️ {m.images} image(s) jointe(s)</div> : null}
              {m.role === 'assistant' && m.actions && m.actions.length > 0 && (
                <div className="chat-actions">
                  {m.actions.map((a, i) => (
                    <span key={i} className="chat-action-chip" title={a.note}>
                      {ACTION_LABELS[a.tool] || `🔧 ${a.tool}`}
                      {a.note ? ` — ${a.note}` : ''}
                    </span>
                  ))}
                </div>
              )}
              {m.role === 'assistant' && m.fallback && (
                <div className="chat-fallback-note">
                  Réponse automatique (clé GEMINI_API_KEY invalide) — l'agent conversationnel
                  complet sera actif avec une clé valide.
                </div>
              )}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="chat-row">
            <div className="chat-bubble chat-bubble-bot chat-typing">
              <span className="spinner" style={{ width: 14, height: 14 }} />
              L'assistant analyse le dossier…
            </div>
          </div>
        )}
      </div>

      {error && <div className="msg-box error chat-error">{error}</div>}

      {previews.length > 0 && (
        <div className="chat-previews">
          {previews.map((url, idx) => (
            <div key={idx} className="chat-preview-item">
              <img src={url} alt={pendingFiles[idx]?.name} />
              <button className="chat-preview-remove" onClick={() => removeFile(idx)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="chat-input-row">
        <label className="chat-attach-btn" title="Joindre des images (plaque signalétique, fiche technique…)">
          📎
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>
        <textarea
          className="chat-input"
          rows={2}
          placeholder="Ex. : mets l'onduleur en GOODWE GW5000 et vérifie la conformité…"
          value={input}
          disabled={!canManage}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button
          className="btn btn-primary chat-send-btn"
          onClick={() => send(input)}
          disabled={!canManage || isSending || (!input.trim() && pendingFiles.length === 0)}
        >
          {isSending ? '…' : 'Envoyer'}
        </button>
      </div>
      {!canManage && (
        <p className="card-subtitle" style={{ marginTop: 8 }}>
          Votre rôle ne permet pas de modifier ce dossier — lecture seule.
        </p>
      )}
    </div>
  );
}
