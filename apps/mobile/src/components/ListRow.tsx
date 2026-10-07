import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, fontSize } from '../theme';
import { Icon } from './Icon';

export function ListRow({
  title,
  subtitle,
  meta,
  icon,
  right,
  onPress,
  style,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress ? { backgroundColor: colors.sunken } : null, style]}
    >
      {icon ? (
        <View style={styles.iconBox}>
          <Icon name={icon} size={18} color={colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
        {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-right" size={18} color={colors.faint} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[3],
  },
  iconBox: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: fontSize.md, fontWeight: '600', color: colors.foreground },
  subtitle: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  meta: { fontSize: fontSize.micro, color: colors.faint, marginTop: 4 },
});
