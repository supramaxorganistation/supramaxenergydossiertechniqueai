import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, CardTitle } from '../components/Screen';
import { Badge } from '../components/ui';
import { Button } from '../components/Button';
import { colors, radius, spacing, fontSize } from '../theme';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config';
import FaceScannerModal from '../components/FaceScannerModal';
import { api } from '../lib/api';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  technician: 'Technicien',
  client: 'Client',
};

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut, refresh } = useAuth();
  const [faceScannerOpen, setFaceScannerOpen] = React.useState(false);
  const [faceLoading, setFaceLoading] = React.useState(false);
  if (!user) return null;
  const currentUser = user;

  const initials = (user.name || user.email || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roleColor = user.role === 'admin' ? 'blue' : user.role === 'technician' ? 'green' : 'gray';

  function confirmLogout() {
    Alert.alert('Se déconnecter', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  async function registerFace(descriptor: number[]) {
    setFaceLoading(true);
    try {
      await api.faceRegister(currentUser.id || currentUser._id, descriptor);
      await refresh();
      setFaceScannerOpen(false);
      Alert.alert('Face ID', 'Votre visage a été enregistré.');
    } catch (e: any) {
      Alert.alert('Face ID', e?.message || 'Impossible d’enregistrer votre visage.');
    } finally {
      setFaceLoading(false);
    }
  }

  return (
    <Screen title="Mon profil" subtitle="Gérez votre compte">
      <Card>
        <CardTitle>Informations du compte</CardTitle>
        <View style={styles.head}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user.name || user.email}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>

        <View style={styles.rows}>
          <View style={styles.row}>
            <Text style={styles.key}>Rôle</Text>
            <Badge color={roleColor as any}>{ROLE_LABELS[user.role] || user.role}</Badge>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>E-mail</Text>
            <Text style={styles.val}>{user.email}</Text>
          </View>
          {user.createdAt ? (
            <View style={styles.row}>
              <Text style={styles.key}>Inscrit le</Text>
              <Text style={styles.val}>{new Date(user.createdAt).toLocaleDateString('fr-FR')}</Text>
            </View>
          ) : null}
        </View>
      </Card>

      <Card>
        <CardTitle subtitle="Utilisez Face ID pour vous connecter plus rapidement.">Face ID</CardTitle>
        <View style={styles.row}>
          <Text style={styles.key}>Statut</Text>
          <Badge color={user.hasFace ? 'green' : 'gray'}>{user.hasFace ? 'Visage enregistré' : 'Non enregistré'}</Badge>
        </View>
        <Button
          label={faceLoading ? 'Enregistrement...' : user.hasFace ? 'Remplacer mon visage' : 'Enregistrer mon visage'}
          variant="secondary"
          loading={faceLoading}
          onPress={() => setFaceScannerOpen(true)}
          icon="user"
        />
      </Card>

      <Card>
        <View style={styles.row}>
          <Text style={styles.key}>Backend</Text>
          <Text style={styles.val} numberOfLines={1}>{BASE_URL}</Text>
        </View>
      </Card>

      {user.role === 'admin' ? (
        <Button label="Administration" variant="secondary" onPress={() => navigation.navigate('Admin')} />
      ) : null}

      <Button label="Se déconnecter" variant="danger" icon="logout" onPress={confirmLogout} />
      {faceScannerOpen ? (
        <FaceScannerModal
          mode="register"
          onClose={() => !faceLoading && setFaceScannerOpen(false)}
          onCaptured={(descriptor) => void registerFace(descriptor)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] },
  avatar: {
    width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
  name: { fontSize: fontSize.md, fontWeight: '700', color: colors.foreground },
  email: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  rows: { gap: spacing[2] },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing[2], borderTopWidth: 1, borderTopColor: colors.border, gap: spacing[3],
  },
  key: { fontSize: fontSize.sm, color: colors.muted },
  val: { fontSize: fontSize.sm, color: colors.foreground, flexShrink: 1, textAlign: 'right' },
});
