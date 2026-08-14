import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

// Models are served from the jsDelivr CDN (same weights used by face-api.js demos)
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model';

type Status = 'loading-models' | 'starting-camera' | 'scanning' | 'matched' | 'error';
type Frame = 'idle' | 'bad' | 'ok';

interface Props {
  mode: 'login' | 'register';
  onClose: () => void;
  /** register mode: called with the averaged descriptor once 3 samples are captured */
  onCaptured?: (descriptor: number[]) => void;
  /** login mode: asks the backend whether this descriptor belongs to an enrolled user */
  onVerify?: (descriptor: number[]) => Promise<boolean>;
  /** login mode: called after the green circle, once the user is confirmed */
  onMatched?: () => void;
}

function averageDescriptors(list: Float32Array[]): number[] {
  const n = list[0].length;
  const out = new Array<number>(n).fill(0);
  for (const d of list) {
    for (let i = 0; i < n; i++) out[i] += d[i];
  }
  return out.map((v) => v / list.length);
}

// Login requires 2 consecutive server-confirmed matches (anti false-positive)
const LOGIN_MATCH_STREAK = 2;
const REGISTER_SAMPLES = 3;
const MAX_FAILS = 4;

export default function FaceScannerModal({ mode, onClose, onCaptured, onVerify, onMatched }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const doneRef = useRef(false);
  const samplesRef = useRef<Float32Array[]>([]);
  const streakRef = useRef(0);
  const failsRef = useRef(0);

  const [status, setStatus] = useState<Status>('loading-models');
  const [frame, setFrame] = useState<Frame>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [samples, setSamples] = useState(0);
  const [fails, setFails] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let frameResetTimer: ReturnType<typeof setTimeout> | null = null;

    const stopStream = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    const start = async () => {
      try {
        // Lazy-load face-api (keeps the main bundle small)
        setStatus('loading-models');
        const faceapi = await import('@vladmandic/face-api');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (cancelled) return;

        // Start the webcam
        setStatus('starting-camera');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('scanning');

        // Continuous scan loop
        interval = setInterval(async () => {
          if (cancelled || busyRef.current || doneRef.current) return;
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;
          busyRef.current = true;
          try {
            const result = await faceapi
              .detectSingleFace(
                video,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
              )
              .withFaceLandmarks()
              .withFaceDescriptor();

            if (!result) {
              setFaceDetected(false);
              busyRef.current = false;
              return;
            }
            setFaceDetected(true);

            if (mode === 'register') {
              // Collect 3 samples then average them
              samplesRef.current.push(result.descriptor);
              setSamples(samplesRef.current.length);
              if (samplesRef.current.length >= REGISTER_SAMPLES) {
                doneRef.current = true;
                if (interval) clearInterval(interval);
                setFrame('ok');
                setStatus('matched');
                const descriptor = averageDescriptors(samplesRef.current);
                stopStream();
                onCaptured?.(descriptor);
              }
            } else {
              // Login: ask the backend if this face belongs to an enrolled user
              const isMatch = onVerify ? await onVerify(Array.from(result.descriptor)) : false;
              if (cancelled || doneRef.current) { busyRef.current = false; return; }

              if (isMatch) {
                streakRef.current += 1;
                failsRef.current = 0;
                setFails(0);
                if (streakRef.current >= LOGIN_MATCH_STREAK) {
                  // Recognized: green circle, then log the user in
                  doneRef.current = true;
                  if (interval) clearInterval(interval);
                  setFrame('ok');
                  setStatus('matched');
                  stopStream();
                  setTimeout(() => { if (!cancelled) onMatched?.(); }, 900);
                } else {
                  setFrame('ok');
                  frameResetTimer = setTimeout(() => !cancelled && setFrame('idle'), 500);
                }
              } else {
                // Unknown face: red circle, keep scanning for retries
                streakRef.current = 0;
                failsRef.current += 1;
                setFails(failsRef.current);
                setFrame('bad');
                if (frameResetTimer) clearTimeout(frameResetTimer);
                frameResetTimer = setTimeout(() => !cancelled && setFrame('idle'), 900);
              }
            }
          } catch {
            // Ignore individual frame errors
          }
          busyRef.current = false;
        }, 700);
      } catch (err: any) {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(
            err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
              ? 'Accès caméra refusé. Autorisez la caméra dans les paramètres du navigateur.'
              : err?.name === 'NotFoundError'
                ? 'Aucune caméra détectée sur cet appareil.'
                : err?.message || 'Impossible de démarrer le scanner facial.'
          );
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (frameResetTimer) clearTimeout(frameResetTimer);
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="face-modal-overlay" onClick={() => !doneRef.current && onClose()}>
      <div className="face-modal" onClick={(e) => e.stopPropagation()}>
        <div className="face-modal-head">
          <h3><Icon name={mode === 'login' ? 'face-scan' : 'camera'} size={17} /> {mode === 'login' ? 'Connexion par Face ID' : 'Enregistrement du visage'}</h3>
          <button className="face-modal-close" onClick={onClose} title="Fermer"><Icon name="x" size={16} /></button>
        </div>

        <div className="face-video-wrap">
          <video ref={videoRef} className="face-video" muted playsInline />
          <div className={`face-frame ${frame}`} />
          {status === 'error' && <div className="face-video-cover"><Icon name="alert-triangle" size={32} /></div>}
        </div>

        <div className="face-status">
          {status === 'loading-models' && <span>Chargement du modèle de reconnaissance…</span>}
          {status === 'starting-camera' && <span>Démarrage de la caméra…</span>}
          {status === 'scanning' && !faceDetected && (
            <span>Placez votre visage face à la caméra, dans un endroit lumineux…</span>
          )}
          {status === 'scanning' && faceDetected && mode === 'register' && (
            <span className="ok">Visage détecté — analyse ({samples}/{REGISTER_SAMPLES})…</span>
          )}
          {status === 'scanning' && faceDetected && mode === 'login' && frame === 'bad' && (
            <span className="bad">Visage non reconnu — ce compte n'est pas autorisé</span>
          )}
          {status === 'scanning' && faceDetected && mode === 'login' && frame === 'ok' && (
            <span className="ok">Vérification du visage…</span>
          )}
          {status === 'scanning' && faceDetected && mode === 'login' && frame === 'idle' && (
            <span>Analyse du visage…</span>
          )}
          {status === 'scanning' && mode === 'login' && fails >= MAX_FAILS && frame !== 'bad' && (
            <span className="bad">
              Visage inconnu. Connectez-vous avec mot de passe ou enregistrez votre visage dans « Mon profil ».
            </span>
          )}
          {status === 'matched' && (
            <span className="ok">
              {mode === 'login' ? 'Visage reconnu — connexion…' : 'Visage analysé'}
            </span>
          )}
          {status === 'error' && <span className="err">{errorMsg}</span>}
        </div>

        {mode === 'register' && status !== 'error' && (
          <div className="face-progress">
            {Array.from({ length: REGISTER_SAMPLES }).map((_, i) => (
              <span key={i} className={`face-dot ${i < samples ? 'on' : ''}`} />
            ))}
          </div>
        )}

        <button className="btn btn-ghost btn-block" onClick={onClose} style={{ marginTop: 12 }}>
          Annuler
        </button>
      </div>
    </div>
  );
}
