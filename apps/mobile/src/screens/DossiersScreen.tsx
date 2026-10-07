import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, CardTitle } from '../components/Screen';
import { Button } from '../components/Button';
import { StatusBadge, EmptyState, LoadingScreen } from '../components/ui';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { colors, radius, spacing, fontSize } from '../theme';
import type { Dossier } from '../types';

function formatDate(value?: string) {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function DossiersScreen() {
  const navigation = useNavigation<any>();
  const { data, loading, error, reload } = useAsync<Dossier[]>(() => api.listDossiers(), []);
  const dossiers = data ?? [];

  return (
    <Screen
      title="Dossiers"
      subtitle="Suivi des dossiers techniques"
      refreshing={loading}
      onRefresh={reload}
    >
      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      {loading && !data ? (
        <LoadingScreen label="Chargement des dossiers..." />
      ) : dossiers.length === 0 ? (
        <Card>
          <EmptyState
            icon="folder"
            title="Aucun dossier pour le moment"
            subtitle="Créez votre premier dossier technique ou revenez plus tard."
          />
          <Button label="+ Nouveau dossier" icon="plus-circle" onPress={() => navigation.navigate('DossierCreate')} />
        </Card>
      ) : (
        <View style={styles.list}>
          {dossiers.map((dossier) => {
            const customerName = dossier.customerDetails?.name || 'Client non renseigné';
            const power = dossier.pvSystemParams?.peakPowerKwc ?? 0;

            return (
              <Pressable
                key={dossier._id}
                onPress={() => navigation.navigate('DossierDetail', { id: dossier._id })}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.customerName}>{customerName}</Text>
                  <StatusBadge status={dossier.status} />
                </View>

                <Text style={styles.metadata}>
                  {formatDate(dossier.createdAt)} · {power.toFixed(1)} kWc
                </Text>
                <Text style={styles.address} numberOfLines={2}>
                  {dossier.customerDetails?.address || 'Adresse non renseignée'}
                </Text>

                <View style={styles.footer}>
                  <Text style={styles.docCount}>{(dossier.documents?.length ?? 0)} document(s)</Text>
                  <Text style={styles.link}>Voir</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Card>
        <CardTitle subtitle="Accès rapide">Actions</CardTitle>
        <Button label="Créer un dossier" icon="plus-circle" onPress={() => navigation.navigate('DossierCreate')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing[3] },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[2],
  },
  itemPressed: { backgroundColor: colors.sunken },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[2],
  },
  customerName: { flex: 1, fontSize: fontSize.md, color: colors.foreground, fontWeight: '700' },
  metadata: { fontSize: fontSize.sm, color: colors.muted },
  address: { fontSize: fontSize.sm, color: colors.muted, lineHeight: 20 },
  footer: {
    marginTop: spacing[1],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docCount: { fontSize: fontSize.sm, color: colors.foreground, fontWeight: '600' },
  link: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '700' },
  error: { color: colors.dangerDeep, fontSize: fontSize.sm },
});
