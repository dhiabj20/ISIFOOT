import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { COLORS } from '../theme';

export default function GlassBackground() {
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;
  const driftC = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const buildLoop = (value, duration, pause = 0) => {
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
    };

    const animA = buildLoop(driftA, 12000, 1000);
    const animB = buildLoop(driftB, 16000, 700);
    const animC = buildLoop(driftC, 20000, 1300);

    animA.start();
    animB.start();
    animC.start();

    return () => {
      animA.stop();
      animB.stop();
      animC.stop();
      driftA.stopAnimation();
      driftB.stopAnimation();
      driftC.stopAnimation();
    };
  }, [driftA, driftB, driftC]);

  const glowTopAnim = useMemo(
    () => ({
      transform: [
        {
          translateX: driftA.interpolate({ inputRange: [0, 1], outputRange: [-18, 20] }),
        },
        {
          translateY: driftA.interpolate({ inputRange: [0, 1], outputRange: [-12, 16] }),
        },
        {
          scale: driftA.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] }),
        },
      ],
      opacity: driftA.interpolate({ inputRange: [0, 1], outputRange: [0.65, 0.95] }),
    }),
    [driftA]
  );

  const glowMidAnim = useMemo(
    () => ({
      transform: [
        {
          translateX: driftB.interpolate({ inputRange: [0, 1], outputRange: [22, -16] }),
        },
        {
          translateY: driftB.interpolate({ inputRange: [0, 1], outputRange: [8, -14] }),
        },
        {
          scale: driftB.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }),
        },
      ],
      opacity: driftB.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.88] }),
    }),
    [driftB]
  );

  const glowBottomAnim = useMemo(
    () => ({
      transform: [
        {
          translateX: driftC.interpolate({ inputRange: [0, 1], outputRange: [-14, 18] }),
        },
        {
          translateY: driftC.interpolate({ inputRange: [0, 1], outputRange: [16, -10] }),
        },
        {
          scale: driftC.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] }),
        },
      ],
      opacity: driftC.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.78] }),
    }),
    [driftC]
  );

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={[styles.glowTop, glowTopAnim]} />
      <Animated.View style={[styles.glowMid, glowMidAnim]} />
      <Animated.View style={[styles.glowBottom, glowBottomAnim]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 999,
    top: -110,
    left: -70,
    backgroundColor: COLORS.glowPrimary,
  },
  glowMid: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 999,
    top: '34%',
    right: -95,
    backgroundColor: COLORS.glowSecondary,
  },
  glowBottom: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    bottom: -120,
    left: '22%',
    backgroundColor: 'rgba(43, 230, 123, 0.10)',
  },
});
