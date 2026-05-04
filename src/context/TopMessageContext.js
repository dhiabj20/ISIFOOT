import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './ThemeContext';

const TopMessageContext = createContext({
  showMessage: () => {},
  showInfo: () => {},
  showSuccess: () => {},
  showError: () => {},
});

function normalizeMessage(input, fallbackType) {
  if (typeof input === 'string') {
    return { type: fallbackType, title: '', message: input, duration: 2800 };
  }

  if (input && typeof input === 'object') {
    return {
      type: input.type || fallbackType,
      title: input.title || '',
      message: input.message || '',
      duration: typeof input.duration === 'number' ? input.duration : 2800,
    };
  }

  return { type: fallbackType, title: '', message: '', duration: 2800 };
}

export function TopMessageProvider({ children }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const y = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimeoutRef = useRef(null);
  const isHidingRef = useRef(false);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const hideCurrent = useCallback(() => {
    if (!current || isHidingRef.current) {
      return;
    }
    isHidingRef.current = true;
    clearHideTimeout();
    Animated.parallel([
      Animated.timing(y, { toValue: -140, duration: 240, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      isHidingRef.current = false;
      setCurrent(null);
    });
  }, [clearHideTimeout, current, opacity, y]);

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((prev) => prev.slice(1));
    }
  }, [current, queue]);

  useEffect(() => {
    if (!current) {
      return undefined;
    }

    y.setValue(-140);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      hideCurrent();
    }, Math.max(1200, current.duration));

    return () => {
      clearHideTimeout();
    };
  }, [clearHideTimeout, current, hideCurrent, opacity, y]);

  const enqueue = useCallback((payload) => {
    if (!payload.message && !payload.title) {
      return;
    }
    setQueue((prev) => [...prev, payload]);
  }, []);

  const showMessage = useCallback((input) => {
    enqueue(normalizeMessage(input, 'info'));
  }, [enqueue]);

  const showInfo = useCallback((input) => {
    enqueue(normalizeMessage(input, 'info'));
  }, [enqueue]);

  const showSuccess = useCallback((input) => {
    enqueue(normalizeMessage(input, 'success'));
  }, [enqueue]);

  const showError = useCallback((input) => {
    enqueue(normalizeMessage(input, 'error'));
  }, [enqueue]);

  const value = useMemo(
    () => ({ showMessage, showInfo, showSuccess, showError }),
    [showMessage, showInfo, showSuccess, showError]
  );

  const toneStyle = current?.type === 'error'
    ? styles.error
    : current?.type === 'success'
      ? styles.success
      : styles.info;

  return (
    <TopMessageContext.Provider value={value}>
      {children}
      {current ? (
        <View pointerEvents="none" style={styles.overlay}>
          <Animated.View
            style={[
              styles.banner,
              toneStyle,
              { opacity, transform: [{ translateY: y }] },
            ]}
          >
            {current.title ? <Text style={styles.title}>{current.title}</Text> : null}
            {current.message ? <Text style={styles.message}>{current.message}</Text> : null}
          </Animated.View>
        </View>
      ) : null}
    </TopMessageContext.Provider>
  );
}

export function useTopMessage() {
  return useContext(TopMessageContext);
}

function createStyles(colors) {
  const topOffset = Platform.OS === 'android'
    ? (StatusBar.currentHeight || 0) + 8
    : 48;

  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 9999,
      elevation: 9999,
    },
    banner: {
      position: 'absolute',
      top: topOffset,
      left: 12,
      right: 12,
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10,
    },
    info: {
      backgroundColor: colors.bgCardSolid,
      borderColor: colors.greenBorder,
    },
    success: {
      backgroundColor: colors.greenDimStrong,
      borderColor: colors.greenBorderActive,
    },
    error: {
      backgroundColor: colors.redDim,
      borderColor: colors.redBorder,
    },
    title: {
      color: colors.white,
      fontWeight: '800',
      fontSize: 13,
      marginBottom: 2,
    },
    message: {
      color: colors.whiteMuted,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
