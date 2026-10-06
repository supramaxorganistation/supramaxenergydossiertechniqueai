import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, fontSize } from '../theme';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { api } from '../lib/api';

export default function ResetPasswordScreen({ route }: { route?: any }) {
  const token: string = route?.params?.token ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    setSuccess('');
    if (!token) {
      setError('Jeton de réinitialisation manquant.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.resetPassword(token, newPassword);
      setSuccess(res.message || 'Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.');
    } catch (e: any) {
      setError(e?.message || 'Échec de la réinitialisation du mot de passe.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Icon name="key" size={24} color={colors.primary} />
          </View>
          <Text style={styles.title}>Réinitialiser le mot de passe</Text>
          <Text style={styles.subtitle}>Choisissez un nouveau mot de passe pour votre compte.</Text>

          <View style={styles.form}>
            <FormField
              label="Nouveau mot de passe"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="••••••••"
              secure
              autoCapitalize="none"
            />
            <FormField
              label="Confirmer le mot de passe"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              secure
              autoCapitalize="none"
            />

            {error ? (
              <View style={[styles.msg, styles.msgError]}>
                <Icon name="alert-triangle" size={15} color={colors.dangerDeep} />
                <Text style={[styles.msgText, { color: colors.dangerDeep }]}>{error}</Text>
              </View>
            ) : null}
            {success ? (
              <View style={[styles.msg, styles.msgInfo]}>
                <Icon name="check-circle" size={15} color={colors.successDeep} />
                <Text style={[styles.msgText, { color: colors.successDeep }]}>{success}</Text>
              </View>
            ) : null}

            <Button label="Réinitialiser" onPress={handleSubmit} loading={loading} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing[6], backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
    padding: spacing[6],
  },
  iconBox: {
    width: 48, height: 48, borderRadius: radius.lg, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing[3],
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground },
  subtitle: { fontSize: fontSize.sm, color: colors.muted, marginTop: 4, marginBottom: spacing[4] },
  form: { gap: spacing[3] },
  msg: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing[3], borderRadius: radius.md },
  msgError: { backgroundColor: colors.dangerSoft },
  msgInfo: { backgroundColor: colors.successSoft },
  msgText: { flex: 1, fontSize: fontSize.sm },
});
