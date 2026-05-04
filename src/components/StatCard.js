import React from 'react';
import { Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../theme';
import GlassPanel from './GlassPanel';

const { width } = Dimensions.get('window');

export default function StatCard({ value, label, color }) {
  return (
    <GlassPanel compact style={styles.card}>
      <Text style={[styles.value, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  card: {
    width: (width - 56) / 2,
    paddingVertical: 18,
    alignItems: 'center',
  },
  value: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '900',
  },
  label: {
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '600',
    fontSize: 12,
  },
});
