import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function GlassPanel({ children, style, compact = false }) {
  const { colors, glass } = useTheme();
  const styles = createStyles(colors, glass);

  return (
    <View style={[styles.base, compact ? styles.compact : styles.regular, style]}>
      <View style={styles.topLine} />
      {children}
    </View>
  );
}

function createStyles(colors, glass) {
  return StyleSheet.create({
    base: {
      overflow: 'hidden',
    },
    regular: {
      ...glass.panel,
    },
    compact: {
      ...glass.panelAlt,
    },
    topLine: {
      position: 'absolute',
      top: 0,
      left: 14,
      right: 14,
      height: 1,
      backgroundColor: colors.panelHighlight,
    },
  });
}
