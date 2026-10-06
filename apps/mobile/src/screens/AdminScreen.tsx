import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen, Card, CardTitle } from '../components/Screen';
import { FormField } from '../components/FormField';
import { Badge, EmptyState, LoadingScreen } from '../components/ui';
import { Button } from '../components/Button';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, fontSize } from '../theme';
import type { Role, User } from '../types';

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  technician: 'Technicien',
  client: 'Client',
};

const ROLE_COLORS: Record<Role, 'blue' | 'green' | 'gray'> = {
  admin: 'blue',
  technician: 'green',
  client: 'gray',
};

export default function AdminScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('technician');

  async function loadUsers() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  if (user?.role !== 'admin') {
    return (
      <Screen title="Administration" subtitle="Accès réservé">
        <Card>
          <Text style={styles.error}>Vous n’avez pas les droits nécessaires pour accéder à cette section.</Text>
        </Card>
      </Screen>
    );
  }

  async function createUser() {
    try {
      setSaving(true);
      setError(null);
      if (!name.trim() || !email.trim() || !password.trim()) {
        throw new Error('Nom, email et mot de passe sont obligatoires.');
      }
      await api.createUser(name.trim(), email.trim(), password, role);
      setName('');
      setEmail('');
      setPassword('');
      setRole('technician');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer l’utilisateur.');
    } finally {
      setSaving(false);
    }
  }

  async function updateRole(targetId: string, nextRole: Role) {
    try {
      setSaving(true);
      setError(null);
      await api.updateUserRole(targetId, nextRole);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de modifier le rôle.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Administration" subtitle="Gestion des comptes et des accès">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Card>
          <CardTitle subtitle="Créer un utilisateur">Nouveau compte</CardTitle>
          <View style={styles.fields}>
            <FormField label="Nom" value={name} onChangeText={setName} placeholder="Ex. Youssef Ben Ali" />
            <FormField label="Email" value={email} onChangeText={setEmail} placeholder="user@supramax.tn" keyboardType="email-address" autoCapitalize="none" />
            <FormField label="Mot de passe" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
            <FormField
              label="Rôle"
              value={role}
              onChangeText={(value) => setRole(value as Role)}
              placeholder="technician"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.actions}>
            <Button label={saving ? 'Enregistrement...' : 'Créer le compte'} onPress={createUser} loading={saving} />
          </View>
        </Card>

        {error ? (
          <Card>
            <Text style={styles.error}>{error}</Text>
          </Card>
        ) : null}

        <Card>
          <CardTitle subtitle="Utilisateurs enregistrés">Comptes</CardTitle>

          {loading ? (
            <LoadingScreen label="Chargement des utilisateurs..." />
          ) : users.length === 0 ? (
            <EmptyState icon="users" title="Aucun utilisateur" subtitle="Aucune personne n’est enregistrée pour le moment." />
          ) : (
            <View style={styles.userList}>
              {users.map((item) => {
                const isCurrentUser = item._id === user?._id;
                return (
                  <View key={item._id} style={styles.userItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{item.name}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                    </View>
                    <Badge color={ROLE_COLORS[item.role]}>{ROLE_LABELS[item.role]}</Badge>
                    <View style={styles.roleActions}>
                      {(['admin', 'technician', 'client'] as Role[]).map((nextRole) => (
                        <Button
                          key={nextRole}
                          label={nextRole}
                          variant={item.role === nextRole ? 'primary' : 'secondary'}
                          onPress={() => updateRole(item._id, nextRole)}
                          disabled={isCurrentUser || item.role === nextRole || saving}
                          style={styles.roleButton}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing[8], gap: spacing[4] },
  fields: { gap: spacing[3] },
  actions: { marginTop: spacing[3] },
  userList: { gap: spacing[3] },
  userItem: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[3],
    gap: spacing[3],
  },
  userName: { fontSize: fontSize.md, fontWeight: '700', color: colors.foreground },
  userEmail: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  roleButton: { flex: 1, minHeight: 36 },
  roleActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  error: { color: colors.dangerDeep, fontSize: fontSize.sm },
});
