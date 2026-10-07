import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Icon } from '../components/Icon';
import { colors, radius, spacing, fontSize } from '../theme';

type Module = { label: string; icon: string; route: string };

const MODULES: Module[] = [
  { label: 'Aperçu ERP', icon: 'building', route: 'ErpDashboard' },
  { label: 'CRM', icon: 'users', route: 'ErpCustomers' },
  { label: 'Produits', icon: 'box', route: 'ErpProducts' },
  { label: 'Devis', icon: 'file-text', route: 'ErpQuotes' },
  { label: 'Installations', icon: 'sun', route: 'Installations' },
  { label: 'Ventes', icon: 'cart', route: 'ErpSales' },
  { label: 'Achats', icon: 'clipboard', route: 'ErpPurchases' },
  { label: 'Stock', icon: 'inbox', route: 'ErpStock' },
  { label: 'Comptabilité', icon: 'wallet', route: 'ErpAccounting' },
  { label: 'RH', icon: 'user', route: 'ErpHr' },
  { label: 'Paramètres', icon: 'settings', route: 'ErpSettings' },
];

export default function ErpHubScreen() {
  const navigation = useNavigation<any>();
  return (
    <Screen title="Modules ERP" subtitle="Progiciel de gestion intégré">
      <View style={styles.grid}>
        {MODULES.map((m) => (
          <Pressable
            key={m.route}
            onPress={() => navigation.navigate(m.route)}
            style={({ pressed }) => [styles.tile, pressed ? { backgroundColor: colors.sunken } : null]}
          >
            <View style={styles.tileIcon}>
              <Icon name={m.icon} size={22} color={colors.primary} />
            </View>
            <Text style={styles.tileLabel} numberOfLines={2}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    minHeight: 96,
  },
  tileIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  tileLabel: { fontSize: fontSize.sm, color: colors.foreground, fontWeight: '600', textAlign: 'center' },
});
