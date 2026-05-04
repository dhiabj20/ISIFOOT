import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import GlassPanel from './GlassPanel';

export default function EmptyState({ title, subtitle }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <GlassPanel compact style={styles.container}>
      <Text style={styles.title}>{title || 'Rien a afficher'}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </GlassPanel>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 26,
      paddingHorizontal: 20,
      marginTop: 32,
    },
    title: {
      color: colors.white,
      fontWeight: '700',
      fontSize: 17,
      lineHeight: 22,
      textAlign: 'center',
    },
    subtitle: {
      color: colors.textSecondary,
      marginTop: 8,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
      maxWidth: 280,
    },
  });
}
