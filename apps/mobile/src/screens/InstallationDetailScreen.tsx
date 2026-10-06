import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, CardTitle } from '../components/Screen';
import { Badge, LoadingScreen } from '../components/ui';
import { Button } from '../components/Button';
import { erpApi } from '../lib/erpApi';
import { useAsync } from '../lib/useAsync';
import { colors, radius, spacing, fontSize } from '../theme';
import { INSTALLATION_STAGES, type ErpInstallation } from '../erpTypes';

const STATUS_META = {
  active: { label: 'En cours', tone: 'blue' as const },
  completed: { label: 'Terminé', tone: 'green' as const },
  cancelled: { label: 'Annulé', tone: 'red' as const },
};

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export default function InstallationDetailScreen({ route }: { route: { params: { id: string } } }) {
  const navigation = useNavigation<any>();
  const { id } = route.params;
  const { data, loading, error, reload } = useAsync<ErpInstallation>(() => erpApi.getInstallation(id), [id]);

  if (loading && !data) {
    return (
      <Screen title="Chantier" subtitle="Chargement...">
        <LoadingScreen label="Chargement du chantier..." />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen title="Chantier" subtitle="Erreur" refreshing={loading} onRefresh={reload}>
        <Card>
          <Text style={styles.error}>{error || 'Le chantier est introuvable.'}</Text>
          <View style={styles.actions}>
            <Button label="Retour" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
        </Card>
      </Screen>
    );
  }

  const installation = data;
  const statusMeta = STATUS_META[installation.status ?? 'active'];
  const stageMeta = INSTALLATION_STAGES.find((s) => s.number === installation.currentStage) || INSTALLATION_STAGES[0];

  return (
    <Screen
      title={installation.title || 'Chantier'}
      subtitle={installation.reference || 'Détails du chantier'}
      refreshing={loading}
      onRefresh={reload}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.smallLabel}>Statut</Text>
              <Badge color={statusMeta.tone}>{statusMeta.label}</Badge>
            </View>
            <Button label="Retour" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
        </Card>

        <Card>
          <CardTitle subtitle="Informations générales">Chantier</CardTitle>
          <View style={styles.infoGrid}>
            <Text style={styles.label}>Client</Text>
            <Text style={styles.value}>{installation.customerName || '—'}</Text>
            <Text style={styles.label}>Adresse</Text>
            <Text style={styles.value}>{installation.address || '—'}</Text>
            <Text style={styles.label}>Puissance</Text>
            <Text style={styles.value}>{installation.powerKwc ? `${installation.powerKwc} kWc` : '—'}</Text>
            <Text style={styles.label}>Étape courante</Text>
            <Text style={styles.value}>{stageMeta.label}</Text>
            <Text style={styles.label}>Progression</Text>
            <Text style={styles.value}>{installation.progress ?? 0}%</Text>
          </View>
        </Card>

        <Card>
          <CardTitle subtitle="Calendrier">Planning</CardTitle>
          <View style={styles.infoGrid}>
            <Text style={styles.label}>Début</Text>
            <Text style={styles.value}>{formatDate(installation.startDate)}</Text>
            <Text style={styles.label}>Cible</Text>
            <Text style={styles.value}>{formatDate(installation.targetEndDate)}</Text>
            <Text style={styles.label}>Région</Text>
            <Text style={styles.value}>{installation.governorate || '—'}</Text>
          </View>
        </Card>

        <Card>
          <CardTitle subtitle="Suivi de l’avancement">Étapes</CardTitle>
          <View style={styles.stageList}>
            {INSTALLATION_STAGES.map((stage) => {
              const isDone = (installation.currentStage ?? 0) > stage.number || installation.status === 'completed';
              const isCurrent = (installation.currentStage ?? 0) === stage.number;
              return (
                <View key={stage.number} style={[styles.stageItem, isCurrent && styles.stageActive, isDone && styles.stageDone]}>
                  <View style={[styles.stageDot, { backgroundColor: stage.color }]} />
                  <Text style={styles.stageText}>{stage.label}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing[8], gap: spacing[4] },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] },
  smallLabel: { fontSize: fontSize.sm, color: colors.muted, marginBottom: 6 },
  infoGrid: { gap: spacing[2] },
  label: { fontSize: fontSize.sm, color: colors.muted },
  value: { fontSize: fontSize.base, color: colors.foreground, fontWeight: '600' },
  stageList: { gap: spacing[2] },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.background,
  },
  stageActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  stageDone: { borderColor: colors.success, backgroundColor: colors.successSoft },
  stageDot: { width: 10, height: 10, borderRadius: 999 },
  stageText: { fontSize: fontSize.sm, color: colors.foreground, flex: 1 },
  actions: { marginTop: spacing[4] },
  error: { color: colors.dangerDeep, fontSize: fontSize.sm },
});
