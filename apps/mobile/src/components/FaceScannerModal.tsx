import React, { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera } from 'expo-camera';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors, radius, spacing, fontSize } from '../theme';

type Props = {
  mode: 'login' | 'register';
  onClose: () => void;
  onCaptured?: (descriptor: number[]) => void;
  onVerify?: (descriptor: number[]) => Promise<boolean>;
  onMatched?: () => void;
};

const SCANNER_HTML = `
<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;height:100%;background:#08131d;color:#fff;font-family:system-ui,sans-serif}
body{display:flex;flex-direction:column;align-items:center;justify-content:center}
video{width:100%;height:72%;object-fit:cover;transform:scaleX(-1)}
#status{padding:18px;text-align:center;font-size:16px}
.frame{position:absolute;width:65vw;height:65vw;max-width:280px;max-height:280px;border:3px solid #f5b942;border-radius:50%;box-shadow:0 0 0 999px #0005}
.ok{border-color:#36d399}.bad{border-color:#ef6262}
</style></head><body>
<video id="video" autoplay playsinline muted></video><div class="frame" id="frame"></div>
<div id="status">Chargement du modèle de reconnaissance…</div>
<script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.js"></script>
<script>
const mode = '%MODE%'; const video = document.getElementById('video');
const status = document.getElementById('status'); const frame = document.getElementById('frame');
const MODEL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model';
let samples = [], busy = false, streak = 0, stopped = false;
const send = (type, data) => window.ReactNativeWebView.postMessage(JSON.stringify({type, ...data}));
const average = list => { const out = new Array(128).fill(0); list.forEach(d => d.forEach((v,i) => out[i] += v)); return out.map(v => v/list.length); };
async function start() {
  try {
    status.textContent = 'Démarrage de la caméra…';
    video.srcObject = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
    await new Promise(resolve => {
      if (video.readyState >= 2) resolve();
      else video.onloadedmetadata = () => resolve();
    });
    status.textContent = 'Chargement du modèle de reconnaissance…';
    await Promise.race([
      Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL)
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Le modèle facial met trop de temps à se charger. Vérifiez la connexion internet.')), 30000))
    ]);
    status.textContent = 'Placez votre visage dans le cercle';
    setInterval(scan, 800);
  } catch (e) {
    send('error', {message: e && e.name === 'NotAllowedError' ? 'Accès caméra refusé. Autorisez la caméra.' : (e.message || 'Impossible de démarrer la caméra.')});
  }
}
async function scan() {
  if (stopped || busy || video.readyState < 2) return; busy = true;
  try {
    const result = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:.5})).withFaceLandmarks().withFaceDescriptor();
    if (!result) { status.textContent = 'Placez votre visage dans le cercle'; frame.className='frame'; return; }
    const descriptor = Array.from(result.descriptor);
    if (mode === 'register') {
      samples.push(descriptor); status.textContent = 'Visage détecté — analyse (' + samples.length + '/3)…';
      if (samples.length >= 3) { stopped = true; frame.className='frame ok'; status.textContent='Visage analysé'; send('captured',{descriptor:average(samples)}); }
    } else {
      const response = await new Promise(resolve => { send('verify',{descriptor}); window.__faceResult = resolve; });
      if (response) { streak++; frame.className='frame ok'; status.textContent='Vérification du visage…'; }
      else { streak=0; frame.className='frame bad'; status.textContent='Visage non reconnu'; }
      if (streak >= 2) { stopped=true; status.textContent='Visage reconnu — connexion…'; send('matched',{}); }
    }
  } catch (e) { send('error',{message:e.message || 'Erreur de reconnaissance faciale.'}); }
  finally { busy=false; }
}
window.__resolveFaceResult = value => { if (window.__faceResult) { window.__faceResult(value); window.__faceResult=null; } };
start();
</script></body></html>`;

export default function FaceScannerModal({ mode, onClose, onCaptured, onVerify, onMatched }: Props) {
  const webViewRef = useRef<WebView>(null);
  const [error, setError] = useState('');
  const [permissionReady, setPermissionReady] = useState(false);
  const html = useMemo(() => SCANNER_HTML.replace('%MODE%', mode), [mode]);

  React.useEffect(() => {
    let active = true;
    Camera.requestCameraPermissionsAsync()
      .then(({ status }) => {
        if (active && status === 'granted') setPermissionReady(true);
        else if (active) setError('Accès caméra refusé. Autorisez la caméra dans les paramètres.');
      })
      .catch(() => {
        if (active) setError('Impossible de demander l’accès à la caméra.');
      });
    return () => { active = false; };
  }, []);

  async function handleMessage(event: WebViewMessageEvent) {
    let message: { type: string; descriptor?: number[]; message?: string };
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      setError('Réponse invalide du scanner facial.');
      return;
    }
    if (message.type === 'error') setError(message.message || 'Impossible de démarrer le scanner facial.');
    if (message.type === 'captured' && message.descriptor) onCaptured?.(message.descriptor);
    if (message.type === 'matched') onMatched?.();
    if (message.type === 'verify' && message.descriptor) {
      try {
        const matched = onVerify ? await onVerify(message.descriptor) : false;
        webViewRef.current?.injectJavaScript(`window.__resolveFaceResult(${matched ? 'true' : 'false'}); true;`);
      } catch {
        webViewRef.current?.injectJavaScript('window.__resolveFaceResult(false); true;');
      }
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{mode === 'login' ? 'Connexion par Face ID' : 'Enregistrement du visage'}</Text>
          <Pressable onPress={onClose} accessibilityLabel="Fermer"><Text style={styles.close}>×</Text></Pressable>
        </View>
        {permissionReady ? (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://localhost' }}
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            mediaCapturePermissionGrantType="grant"
            onMessage={handleMessage}
            onError={() => setError('Impossible de charger le scanner facial. Vérifiez la connexion internet.')}
            onHttpError={() => setError('Le service de reconnaissance faciale est indisponible.')}
            style={styles.webView}
          />
        ) : (
          <View style={styles.permissionState}>
            <Text style={styles.permissionText}>{error || 'Demande d’accès à la caméra…'}</Text>
          </View>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.cancel} onPress={onClose}><Text style={styles.cancelText}>Annuler</Text></Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing[4], backgroundColor: colors.surface },
  title: { fontSize: fontSize.md, fontWeight: '700', color: colors.foreground },
  close: { fontSize: 30, lineHeight: 30, color: colors.muted },
  webView: { flex: 1, backgroundColor: '#08131d' },
  permissionState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  permissionText: { color: colors.foreground, fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 },
  error: { padding: spacing[3], color: colors.dangerDeep, textAlign: 'center' },
  cancel: { margin: spacing[4], padding: spacing[3], borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cancelText: { textAlign: 'center', color: colors.foreground, fontWeight: '600' },
});
