import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme';
import GlassPanel from './GlassPanel';

export default function EmptyState({ title, subtitle }) {
  return (
    <GlassPanel compact style={styles.container}>
      <Text style={styles.title}>{title || 'Rien a afficher'}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 26,
    paddingHorizontal: 20,
    marginTop: 32,
  },
  title: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
