import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, spacing, fontSize } from '../theme';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import FaceScannerModal from '../components/FaceScannerModal';

type ViewMode = 'login' | 'register' | 'forgot';

export default function LoginScreen({ navigation }: { navigation?: any }) {
  const { signIn, signInWithFace } = useAuth();
  const [view, setView] = useState<ViewMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [faceScannerOpen, setFaceScannerOpen] = useState(false);
  const pendingFaceDescriptor = useRef<number[] | null>(null);

  const isRegister = view === 'register';
  const isForgot = view === 'forgot';

  function switchView(next: ViewMode) {
    setView(next);
    setError('');
    setSuccess('');
  }

  async function handleSubmit() {
    setError('');
    setSuccess('');
    if (!email.trim()) {
      setError('Veuillez saisir votre adresse e-mail.');
      return;
    }

    setLoading(true);
    try {
      if (isForgot) {
        const res = await api.forgotPassword(email.trim());
        setSuccess(res.message || 'Si un compte existe, un lien de réinitialisation a été envoyé.');
      } else if (isRegister) {
        if (!name.trim()) {
          setError('Veuillez saisir votre nom complet.');
          return;
        }
        if (password.length < 6) {
          setError('Le mot de passe doit contenir au moins 6 caractères.');
          return;
        }
        const { token, user } = await api.register(name.trim(), email.trim(), password);
        // Reuse the sign-in flow to persist the freshly issued token.
        await signIn(email.trim(), password);
        void token;
        void user;
      } else {
        if (!password) {
          setError('Veuillez saisir votre mot de passe.');
          return;
        }
        await signIn(email.trim(), password);
      }
    } catch (e: any) {
      setError(e?.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyFace(descriptor: number[]) {
    try {
      await api.faceLogin(descriptor);
      pendingFaceDescriptor.current = descriptor;
      return true;
    } catch {
      return false;
    }
  }

  async function completeFaceLogin() {
    const descriptor = pendingFaceDescriptor.current;
    if (!descriptor) return;
    setFaceScannerOpen(false);
    setLoading(true);
    try {
      await signInWithFace(descriptor);
    } catch (e: any) {
      setError(e?.message || 'Impossible de finaliser la connexion faciale.');
    } finally {
      pendingFaceDescriptor.current = null;
      setLoading(false);
    }
  }

  const title = isRegister ? 'Créer un compte' : isForgot ? 'Mot de passe oublié' : 'Connexion';
  const subtitle = isRegister
    ? 'Rejoignez la plateforme Supramax Energy'
    : isForgot
      ? 'Entrez votre e-mail pour recevoir le lien de réinitialisation'
      : 'Accédez à vos dossiers techniques';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={styles.logoBox}>
            <Icon name="sun" size={26} color={colors.accent} />
          </View>
          <Text style={styles.brandName}>Supramax Energy</Text>
        </View>
        <Text style={styles.tagline}>
          Génération automatique des dossiers techniques photovoltaïques
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>

          <View style={styles.form}>
            {isRegister ? (
              <FormField
                label="Nom complet"
                value={name}
                onChangeText={setName}
                placeholder="Ex. Ahmed Ben Salah"
                autoCapitalize="words"
                icon="user"
              />
            ) : null}

            <FormField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="exemple@mail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              icon="mail"
            />

            {!isForgot ? (
              <FormField
                label="Mot de passe"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secure
                autoCapitalize="none"
              />
            ) : null}

            {error ? (
              <View style={[styles.msg, styles.msgError]}>
                <Icon name="alert-triangle" size={15} color={colors.dangerDeep} />
                <Text style={[styles.msgText, { color: colors.dangerDeep }]}>{error}</Text>
              </View>
            ) : null}
            {success ? (
              <View style={[styles.msg, styles.msgInfo]}>
                <Icon name="check-circle" size={15} color={colors.primary} />
                <Text style={[styles.msgText, { color: colors.primary }]}>{success}</Text>
              </View>
            ) : null}

            <Button
              label={
                loading
                  ? 'Patientez...'
                  : isRegister
                    ? "S'inscrire"
                    : isForgot
                      ? 'Envoyer le lien de réinitialisation'
                      : 'Se connecter'
              }
              onPress={handleSubmit}
              loading={loading}
              style={{ marginTop: spacing[2] }}
            />
            {!isForgot && !isRegister ? (
              <Button
                label="Se connecter avec Face ID"
                variant="secondary"
                icon="user"
                onPress={() => { setError(''); setFaceScannerOpen(true); }}
                disabled={loading}
              />
            ) : null}
          </View>

          <View style={styles.links}>
            {isForgot ? (
              <Pressable onPress={() => switchView('login')}>
                <Text style={styles.link}>Retour à la connexion</Text>
              </Pressable>
            ) : isRegister ? (
              <Text style={styles.linkMuted}>
                Déjà un compte ?{' '}
                <Text style={styles.link} onPress={() => switchView('login')}>
                  Se connecter
                </Text>
              </Text>
            ) : (
              <View style={styles.linksRow}>
                <Text style={styles.linkMuted}>
                  Pas de compte ?{' '}
                  <Text style={styles.link} onPress={() => switchView('register')}>
                    S'inscrire
                  </Text>
                </Text>
                <Pressable onPress={() => switchView('forgot')}>
                  <Text style={styles.link}>Mot de passe oublié ?</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.footer}>Face ID est disponible avec l'accès caméra.</Text>
      </ScrollView>
      {faceScannerOpen ? (
        <FaceScannerModal
          mode="login"
          onClose={() => setFaceScannerOpen(false)}
          onVerify={verifyFace}
          onMatched={() => void completeFaceLogin()}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing[6], backgroundColor: colors.background },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[3], marginBottom: spacing[3] },
  logoBox: {
    width: 48, height: 48, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  brandName: { fontSize: fontSize.xl, fontWeight: '800', color: colors.foreground },
  tagline: { fontSize: fontSize.base, color: colors.muted, textAlign: 'center', marginBottom: spacing[6], lineHeight: 20 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
    padding: spacing[6],
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground },
  cardSubtitle: { fontSize: fontSize.sm, color: colors.muted, marginTop: 4, marginBottom: spacing[4] },
  form: { gap: spacing[3] },
  msg: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing[3], borderRadius: radius.md, marginTop: spacing[1] },
  msgError: { backgroundColor: colors.dangerSoft },
  msgInfo: { backgroundColor: colors.primarySoft },
  msgText: { flex: 1, fontSize: fontSize.sm },
  links: { marginTop: spacing[4] },
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing[2] },
  link: { color: colors.primary, fontWeight: '600', fontSize: fontSize.sm },
  linkMuted: { color: colors.muted, fontSize: fontSize.sm },
  footer: { fontSize: fontSize.micro, color: colors.faint, textAlign: 'center', marginTop: spacing[6] },
});
