import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, GLASS } from '../theme';

export default function GlassPanel({ children, style, compact = false }) {
  return (
    <View style={[styles.base, compact ? styles.compact : styles.regular, style]}>
      <View style={styles.topLine} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  regular: {
    ...GLASS.panel,
  },
  compact: {
    ...GLASS.panelAlt,
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: COLORS.panelHighlight,
  },
});
