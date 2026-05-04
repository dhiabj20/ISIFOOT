import React, { useMemo } from 'react';
import { Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import GlassPanel from './GlassPanel';

export default function StatCard({ value, label, color }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cardWidth = Math.max(140, (width - 56) / 2);

  return (
    <GlassPanel compact style={[styles.card, { width: cardWidth }]}>
      <Text style={[styles.value, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </GlassPanel>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    value: {
      color: colors.white,
      fontSize: 30,
      fontWeight: '900',
    },
    label: {
      color: colors.textSecondary,
      marginTop: 6,
      fontWeight: '600',
      fontSize: 12,
      letterSpacing: 0.2,
    },
  });
}
