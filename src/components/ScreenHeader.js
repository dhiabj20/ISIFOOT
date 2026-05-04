import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { COLORS, GLASS } from '../theme';

export default function ScreenHeader({
  title,
  showBack = true,
  onBack,
  rightAction,
  rightText,
  navigation,
}) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.wrap}>
        <View style={styles.header}>
          {showBack ? (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backText}>{'<'} Retour</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {rightAction ? (
            <TouchableOpacity onPress={rightAction} style={styles.rightBtn} activeOpacity={0.7}>
              <Text style={styles.rightText}>{rightText}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.rightBtn} />
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 14,
    marginBottom: 8,
    ...GLASS.panelAlt,
    borderRadius: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 46 : 28,
    paddingBottom: 14,
  },
  backBtn: { width: 70 },
  backText: { color: COLORS.green, fontWeight: '700', fontSize: 14 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.white, flex: 1, textAlign: 'center' },
  rightBtn: { width: 70, alignItems: 'flex-end' },
  rightText: { color: COLORS.green, fontWeight: '700', fontSize: 14 },
});
