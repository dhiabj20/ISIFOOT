import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function ScreenHeader({
  title,
  showBack = true,
  onBack,
  rightAction,
  rightText,
  navigation,
}) {
  const { colors, glass, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, glass), [colors, glass]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
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

function createStyles(colors, glass) {
  return StyleSheet.create({
    wrap: {
      marginHorizontal: 14,
      marginBottom: 10,
      ...glass.panelAlt,
      borderRadius: 18,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingTop: Platform.OS === 'ios' ? 46 : 28,
      paddingBottom: 12,
    },
    backBtn: { width: 86 },
    backText: { color: colors.green, fontWeight: '700', fontSize: 13 },
    title: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.white,
      flex: 1,
      textAlign: 'center',
      letterSpacing: 0.2,
    },
    rightBtn: { width: 86, alignItems: 'flex-end' },
    rightText: { color: colors.green, fontWeight: '700', fontSize: 13 },
  });
}
