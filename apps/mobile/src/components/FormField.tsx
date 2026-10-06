import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, TextInputProps } from 'react-native';
import { colors, radius, spacing, fontSize } from '../theme';
import { Icon } from './Icon';

export function FormField({
  label,
  error,
  secure,
  multiline,
  icon,
  ...input
}: TextInputProps & {
  label?: string;
  error?: string | null;
  secure?: boolean;
  icon?: string;
}) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.borderStrong;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, { borderColor }, multiline && styles.multiline]}>
        {icon ? <Icon name={icon} size={18} color={colors.faint} /> : null}
        <TextInput
          {...input}
          multiline={multiline}
          secureTextEntry={secure ? hidden : undefined}
          placeholderTextColor={colors.faint}
          style={[styles.input, multiline && styles.inputMultiline]}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Icon name={hidden ? 'eye' : 'eye-off'} size={18} color={colors.faint} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Icon name="alert-triangle" size={13} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.muted },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surface,
    minHeight: 46,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: spacing[2] },
  input: { flex: 1, fontSize: fontSize.md, color: colors.foreground, paddingVertical: spacing[3] },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errorText: { fontSize: fontSize.micro, color: colors.danger },
});
