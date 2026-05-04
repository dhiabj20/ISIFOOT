import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

export default function LoadingState({ size = 'large' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={COLORS.green} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
});
