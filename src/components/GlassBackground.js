import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';

function createLoop(value, duration, pause = 0) {
  const sequence = [
    Animated.timing(value, {
      toValue: 1,
      duration,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    }),
    Animated.timing(value, {
      toValue: 0,
      duration,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    }),
  ];

  if (pause > 0) {
    sequence.splice(1, 0, Animated.delay(pause));
  }

  return Animated.loop(Animated.sequence(sequence));
}

function footballMotion(value, x1, x2, y1, y2, scale1, scale2, rotate1, rotate2, op1, op2) {
  return {
    transform: [
      { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [x1, x2] }) },
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [y1, y2] }) },
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [scale1, scale2] }) },
      { rotate: value.interpolate({ inputRange: [0, 1], outputRange: [rotate1, rotate2] }) },
    ],
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [op1, op2] }),
  };
}

export default function GlassBackground() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;
  const driftC = useRef(new Animated.Value(0)).current;
  const driftD = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animA = createLoop(driftA, 6200, 140);
    const animB = createLoop(driftB, 7600, 120);
    const animC = createLoop(driftC, 8900, 180);
    const animD = createLoop(driftD, 6800, 100);

    animA.start();
    animB.start();
    animC.start();
    animD.start();

    return () => {
      animA.stop();
      animB.stop();
      animC.stop();
      animD.stop();
      driftA.stopAnimation();
      driftB.stopAnimation();
      driftC.stopAnimation();
      driftD.stopAnimation();
    };
  }, [driftA, driftB, driftC, driftD]);

  const glowTopAnim = useMemo(
    () => footballMotion(driftA, -38, 46, -26, 36, 0.88, 1.14, '-6deg', '8deg', 0.42, 0.85),
    [driftA]
  );
  const glowMidAnim = useMemo(
    () => footballMotion(driftB, 40, -32, 20, -28, 0.84, 1.2, '9deg', '-11deg', 0.3, 0.78),
    [driftB]
  );
  const ballAAnim = useMemo(
    () => footballMotion(driftC, -66, 72, 58, -52, 0.72, 1.25, '-25deg', '36deg', 0.22, 0.72),
    [driftC]
  );
  const ballBAnim = useMemo(
    () => footballMotion(driftD, 56, -62, -14, 62, 0.78, 1.3, '30deg', '-24deg', 0.2, 0.68),
    [driftD]
  );

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={[styles.glowTop, glowTopAnim]} />
      <Animated.View style={[styles.glowMid, glowMidAnim]} />

      <Animated.View style={[styles.ballWrapA, ballAAnim]}>
        <Icon name="soccer" size={104} color={colors.ballTint} style={styles.ballIcon} />
      </Animated.View>
      <Animated.View style={[styles.ballWrapB, ballBAnim]}>
        <Icon name="soccer" size={136} color={colors.ballTint} style={styles.ballIcon} />
      </Animated.View>
    </View>
  );
}

function createStyles(colors, isDark) {
  return StyleSheet.create({
    wrap: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
    },
    glowTop: {
      position: 'absolute',
      width: 300,
      height: 300,
      borderRadius: 999,
      top: -120,
      left: -80,
      backgroundColor: colors.glowPrimary,
    },
    glowMid: {
      position: 'absolute',
      width: 240,
      height: 240,
      borderRadius: 999,
      top: '38%',
      right: -105,
      backgroundColor: colors.glowSecondary,
    },
    ballWrapA: {
      position: 'absolute',
      top: '14%',
      right: '-5%',
    },
    ballWrapB: {
      position: 'absolute',
      bottom: '-5%',
      left: '14%',
    },
    ballIcon: {
      opacity: isDark ? 0.2 : 0.14,
      textShadowColor: isDark ? 'rgba(43, 230, 123, 0.35)' : 'rgba(23, 155, 82, 0.18)',
      textShadowRadius: 14,
    },
  });
}
