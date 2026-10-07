import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, CardTitle } from '../components/Screen';
import { Button } from '../components/Button';
import { StatusBadge, LoadingScreen } from '../components/ui';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { colors, spacing, fontSize } from '../theme';
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

export default function DossierDetailScreen({ route }: { route: { params: { id: string } } }) {
  const navigation = useNavigation<any>();
  const { id } = route.params;
  const { data, loading, error, reload } = useAsync<Dossier>(() => api.getDossier(id), [id]);

  if (loading && !data) {
    return (
      <Screen title="Dossier" subtitle="Chargement...">
        <LoadingScreen label="Chargement du dossier..." />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen title="Dossier" subtitle="Erreur de chargement" refreshing={loading} onRefresh={reload}>
        <Card>
          <Text style={styles.error}>{error || 'Le dossier est introuvable.'}</Text>
          <View style={styles.actions}>
            <Button label="Retour" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
        </Card>
      </Screen>
    );
  }

  const dossier = data;
  const customer = dossier.customerDetails;
  const power = dossier.pvSystemParams?.peakPowerKwc ?? 0;

  return (
    <Screen
      title={customer?.name || 'Dossier'}
      subtitle={`Créé le ${formatDate(dossier.createdAt)}`}
      refreshing={loading}
      onRefresh={reload}
    >
      <Card>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>Statut</Text>
            <StatusBadge status={dossier.status} />
          </View>
          <Button label="Retour" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </Card>

      <Card>
        <CardTitle subtitle="Informations client">Client</CardTitle>
        <View style={styles.infoGrid}>
          <Text style={styles.label}>Nom</Text>
          <Text style={styles.value}>{customer?.name || '—'}</Text>
          <Text style={styles.label}>CIN</Text>
          <Text style={styles.value}>{customer?.cin || '—'}</Text>
          <Text style={styles.label}>Téléphone</Text>
          <Text style={styles.value}>{customer?.phone || '—'}</Text>
          <Text style={styles.label}>Adresse</Text>
          <Text style={styles.value}>{customer?.address || '—'}</Text>
        </View>
      </Card>

      <Card>
        <CardTitle subtitle="Caractéristiques techniques">Installation</CardTitle>
        <View style={styles.infoGrid}>
          <Text style={styles.label}>Puissance</Text>
          <Text style={styles.value}>{power.toFixed(1)} kWc</Text>
          <Text style={styles.label}>Panneaux</Text>
          <Text style={styles.value}>{dossier.pvSystemParams?.panelCount ?? 0}</Text>
          <Text style={styles.label}>Marque</Text>
          <Text style={styles.value}>{dossier.pvSystemParams?.panelBrand || '—'}</Text>
          <Text style={styles.label}>Onduleur</Text>
          <Text style={styles.value}>{dossier.pvSystemParams?.inverterModel || '—'}</Text>
        </View>
      </Card>

      <Card>
        <CardTitle subtitle="Documents joints">Pièces jointes</CardTitle>
        {dossier.documents?.length ? (
          <View style={styles.docList}>
            {dossier.documents.map((doc, index) => (
              <Text key={`${doc.fileName}-${index}`} style={styles.docItem}>{doc.fileName}</Text>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>Aucun document n’a été ajouté à ce dossier.</Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
  },
  smallLabel: { fontSize: fontSize.sm, color: colors.muted, marginBottom: 6 },
  infoGrid: {
    gap: spacing[2],
  },
  label: { fontSize: fontSize.sm, color: colors.muted },
  value: { fontSize: fontSize.base, color: colors.foreground, fontWeight: '600' },
  docList: { gap: spacing[2] },
  docItem: { fontSize: fontSize.base, color: colors.foreground },
  empty: { fontSize: fontSize.base, color: colors.muted },
  error: { color: colors.dangerDeep, fontSize: fontSize.sm },
  actions: { marginTop: spacing[4] },
});
