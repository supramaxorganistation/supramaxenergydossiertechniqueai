import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { DossierStatus } from '../types';
import { colors, radius, spacing, fontSize, badgeTones } from '../theme';
import { Icon } from './Icon';

const STATUS_META: Record<DossierStatus, { label: string; tone: keyof typeof badgeTones }> = {
  DRAFT: { label: 'Brouillon', tone: 'gray' },
  PENDING_APPROVAL: { label: 'En attente', tone: 'amber' },
  APPROVED: { label: 'Approuvé', tone: 'green' },
  REJECTED: { label: 'Rejeté', tone: 'red' },
};

export function StatusBadge({ status }: { status: DossierStatus }) {
  const meta = STATUS_META[status] || STATUS_META.DRAFT;
  return <Badge color={meta.tone}>{meta.label}</Badge>;
}

export function Badge({
  color = 'gray',
  children,
}: {
  color?: keyof typeof badgeToneNames;
  children: React.ReactNode;
}) {
  const tone = badgeTones[color] || badgeTones.gray;
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: tone.fg }]} />
      <Text style={[styles.badgeText, { color: tone.fg }]}>{children}</Text>
    </View>
  );
}

const badgeToneNames = badgeTones;

export function StatCard({
  icon,
  value,
  label,
  color = 'blue',
}: {
  icon: string;
  value: React.ReactNode;
  label: string;
  color?: 'blue' | 'green' | 'amber' | 'red';
}) {
  const toneMap = {
    blue: badgeTones.blue,
    green: badgeTones.green,
    amber: badgeTones.amber,
    red: badgeTones.red,
  } as const;
  const tone = toneMap[color];
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tone.bg }]}>
        <Icon name={icon} size={22} color={tone.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

export function EmptyState({
  icon = 'inbox',
  title,
  subtitle,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={40} color={colors.faint} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function LoadingScreen({ label = 'Chargement...' }: { label?: string }) {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2] + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 6,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: fontSize.micro, fontWeight: '600' },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.foreground },
  statLabel: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12] },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.foreground },
  emptySubtitle: { fontSize: fontSize.base, color: colors.muted, marginTop: 4, textAlign: 'center' },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] },
  loadingLabel: { fontSize: fontSize.base, color: colors.muted },
});
