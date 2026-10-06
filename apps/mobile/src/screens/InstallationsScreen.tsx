import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, CardTitle } from '../components/Screen';
import { Badge, EmptyState, LoadingScreen } from '../components/ui';
import { Button } from '../components/Button';
import { erpApi } from '../lib/erpApi';
import { useAsync } from '../lib/useAsync';
import { colors, radius, spacing, fontSize } from '../theme';
import { INSTALLATION_STAGES, type ErpInstallation, type InstallationListResponse } from '../erpTypes';

const STATUS_META = {
  active: { label: 'En cours', tone: 'blue' as const },
  completed: { label: 'Terminé', tone: 'green' as const },
  cancelled: { label: 'Annulé', tone: 'red' as const },
};

function currentStageLabel(stage?: number) {
  const meta = INSTALLATION_STAGES.find((s) => s.number === stage);
  return meta?.label || 'Étape non définie';
}

export default function InstallationsScreen() {
  const navigation = useNavigation<any>();
  const { data, loading, error, reload } = useAsync<InstallationListResponse>(() => erpApi.listInstallations({ limit: 50 }), []);
  const items = data?.items ?? [];

  return (
    <Screen
      title="Chantiers"
      subtitle="Suivi des installations photovoltaïques"
      refreshing={loading}
      onRefresh={reload}
      headerRight={<Button label="+ Nouveau" onPress={() => navigation.navigate('InstallationCreate')} />}
    >
      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      {loading && !data ? (
        <LoadingScreen label="Chargement des chantiers..." />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon="sun"
            title="Aucun chantier pour le moment"
            subtitle="Aucune installation n’est actuellement en cours."
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {items.map((installation: ErpInstallation) => {
            const meta = STATUS_META[installation.status ?? 'active'];
            return (
              <Pressable
                key={installation._id}
                onPress={() => navigation.navigate('InstallationDetail', { id: installation._id })}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              >
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{installation.title || installation.reference || 'Chantier'}</Text>
                    <Text style={styles.subtitleText}>{installation.reference || 'Référence inconnue'}</Text>
                  </View>
                  <Badge color={meta.tone}>{meta.label}</Badge>
                </View>

                <Text style={styles.meta}>{installation.customerName || 'Client non renseigné'}</Text>
                <Text style={styles.meta}>{installation.address || 'Adresse non renseignée'}</Text>
                <Text style={styles.meta}>Étape : {currentStageLabel(installation.currentStage)}</Text>

                <View style={styles.footer}>
                  <Text style={styles.progress}>Progression : {installation.progress ?? 0}%</Text>
                  <Text style={styles.link}>Voir</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Card>
        <CardTitle subtitle="Suivi opérationnel">Vue d’ensemble</CardTitle>
        <Button label="Actualiser" variant="secondary" onPress={reload} />
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
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[2] },
  title: { fontSize: fontSize.md, fontWeight: '700', color: colors.foreground },
  subtitleText: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  meta: { fontSize: fontSize.sm, color: colors.muted },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[1] },
  progress: { fontSize: fontSize.sm, color: colors.foreground, fontWeight: '600' },
  link: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '700' },
  error: { color: colors.dangerDeep, fontSize: fontSize.sm },
});
