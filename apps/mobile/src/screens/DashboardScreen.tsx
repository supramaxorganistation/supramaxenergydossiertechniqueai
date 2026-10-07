import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, CardTitle } from '../components/Screen';
import { StatCard, EmptyState, LoadingScreen } from '../components/ui';
import { Button } from '../components/Button';
import { colors, radius, spacing, fontSize, badgeTones } from '../theme';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useAuth } from '../context/AuthContext';
import type { Dossier } from '../types';

const STATUS_LABELS: Record<string, { label: string; tone: keyof typeof badgeTones }> = {
  DRAFT: { label: 'Brouillon', tone: 'gray' },
  PENDING_APPROVAL: { label: 'En attente', tone: 'amber' },
  APPROVED: { label: 'Approuvé', tone: 'green' },
  REJECTED: { label: 'Rejeté', tone: 'red' },
};

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync<Dossier[]>(() => api.listDossiers(), []);
  const dossiers = data ?? [];

  const stats = useMemo(() => {
    const totalPower = dossiers.reduce((sum, d) => sum + (d.pvSystemParams?.peakPowerKwc || 0), 0);
    const pending = dossiers.filter((d) => d.status === 'PENDING_APPROVAL').length;
    const approved = dossiers.filter((d) => d.status === 'APPROVED').length;
    return { totalPower, pending, approved };
  }, [dossiers]);

  const distribution = useMemo(() => {
    const counts: Record<string, number> = { DRAFT: 0, PENDING_APPROVAL: 0, APPROVED: 0, REJECTED: 0 };
    dossiers.forEach((d) => {
      counts[d.status] = (counts[d.status] || 0) + 1;
    });
    const total = dossiers.length || 1;
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ key: k, value: v, pct: Math.round((v / total) * 100) }));
  }, [dossiers]);

  const role = user?.role ?? 'client';
  const roleLabel = role === 'admin' ? 'Administrateur' : role === 'technician' ? 'Technicien' : 'Client';
  const canCreate = role === 'admin' || role === 'technician';

  if (loading && !data) {
    return <Screen title="Tableau de bord" subtitle={`Bienvenue, ${user?.name || user?.email || ''}`}><LoadingScreen /></Screen>;
  }

  return (
    <Screen
      title="Tableau de bord"
      subtitle={`Bienvenue, ${user?.name || user?.email || ''}`}
      refreshing={loading}
      onRefresh={reload}
    >
      {error ? (
        <Card><Text style={styles.error}>{error}</Text></Card>
      ) : null}

      <View style={styles.statGrid}>
        <StatCard icon="folder" value={dossiers.length} label="Total dossiers" color="blue" />
        <StatCard icon="sun" value={`${stats.totalPower.toFixed(1)} kWc`} label="Puissance installée" color="amber" />
        <StatCard icon="clock" value={stats.pending} label="En attente d'approbation" color="red" />
        <StatCard icon="check-circle" value={stats.approved} label="Approuvés" color="green" />
      </View>

      {dossiers.length === 0 ? (
        <Card>
          <EmptyState icon="folder" title="Aucun dossier pour le moment" subtitle="Créez votre premier dossier technique pour commencer." />
          {canCreate ? (
            <Button label="+ Nouveau dossier" icon="plus-circle" onPress={() => navigation.navigate('Dossiers')} />
          ) : null}
        </Card>
      ) : (
        <Card>
          <CardTitle subtitle="État des dossiers techniques">Répartition des statuts</CardTitle>
          <View style={{ gap: spacing[3] }}>
            {distribution.map((s) => {
              const meta = STATUS_LABELS[s.key] || STATUS_LABELS.DRAFT;
              const tone = badgeTones[meta.tone];
              return (
                <View key={s.key}>
                  <View style={styles.barLabelRow}>
                    <Text style={styles.barLabel}>{meta.label}</Text>
                    <Text style={styles.barValue}>{s.value} · {s.pct}%</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${s.pct}%`, backgroundColor: tone.fg }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      )}

      <Card>
        <CardTitle>Bonjour, {user?.name || user?.email}</CardTitle>
        <Text style={styles.body}>
          Vous êtes connecté en tant que <Text style={{ fontWeight: '700' }}>{roleLabel}</Text>.{' '}
          {role !== 'client'
            ? 'Gérez les dossiers techniques, vérifiez la conformité STEG et générez les PDF.'
            : 'Suivez l\u2019état d\u2019avancement de vos dossiers.'}
        </Text>
        <View style={styles.actions}>
          <Button label="Voir les dossiers" icon="folder" onPress={() => navigation.navigate('Dossiers')} />
          {canCreate ? (
            <Button label="+ Nouveau dossier" variant="ghost" icon="plus-circle" onPress={() => navigation.navigate('Dossiers')} />
          ) : null}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statGrid: { gap: spacing[3] },
  error: { color: colors.dangerDeep, fontSize: fontSize.sm },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { fontSize: fontSize.sm, color: colors.foreground, fontWeight: '600' },
  barValue: { fontSize: fontSize.sm, color: colors.muted },
  barTrack: { height: 8, borderRadius: radius.full, backgroundColor: colors.sunken, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: radius.full },
  body: { fontSize: fontSize.base, color: colors.muted, lineHeight: 21 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[4] },
});
