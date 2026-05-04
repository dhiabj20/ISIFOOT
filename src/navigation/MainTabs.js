import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import HomeScreen from '../screens/HomeScreen';
import PlanningScreen from '../screens/PlanningScreen';
import ReservationScreen from '../screens/ReservationScreen';
import FixturesScreen from '../screens/FixturesScreen';
import ChatsScreen from '../screens/ChatsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const TAB_CONFIG = [
  { name: 'Home', label: 'Accueil', icon: 'home', component: HomeScreen },
  { name: 'Planning', label: 'Planning', icon: 'calendar', component: PlanningScreen },
  { name: 'Reservation', label: 'Reserver', icon: 'plus-circle', component: ReservationScreen },
  { name: 'Fixtures', label: 'Matchs', icon: 'trophy', component: FixturesScreen },
  { name: 'Chats', label: 'Chats', icon: 'message-circle', component: ChatsScreen },
  { name: 'Profile', label: 'Profil', icon: 'user', component: ProfileScreen },
];

const TAB_INDEX = TAB_CONFIG.reduce((acc, tab, index) => {
  acc[tab.name] = index;
  return acc;
}, {});

function TabLabel({ scrollX, index, label, icon, width, colors }) {
  const inputRange = TAB_CONFIG.map((_, i) => i * width);
  const outputRange = TAB_CONFIG.map((_, i) => i === index ? 1 : 0);

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: outputRange.map((v) => v === 1 ? 1.18 : 0.88),
    extrapolate: 'clamp',
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: outputRange.map((v) => v === 1 ? 1 : 0.55),
    extrapolate: 'clamp',
  });

  const translateY = scrollX.interpolate({
    inputRange,
    outputRange: outputRange.map((v) => v === 1 ? -2 : 2),
    extrapolate: 'clamp',
  });

  const dotOpacity = scrollX.interpolate({
    inputRange,
    outputRange,
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.tabLabelWrap}>
      <Animated.View style={{ transform: [{ scale }, { translateY }], opacity }}>
        <Icon
          name={icon}
          size={22}
          color={colors.green}
          style={styles.tabIcon}
        />
      </Animated.View>
      <Text style={[styles.tabText, { color: colors.textSecondary }]}>{label}</Text>
      <Animated.View style={[styles.dot, { opacity: dotOpacity, backgroundColor: colors.green }]} />
    </View>
  );
}

export default function MainTabs({ navigation, route }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pagerRef = useRef(null);
  const historyRef = useRef([0]);
  const activeIndexRef = useRef(0);

  const scrollX = useRef(new Animated.Value(0)).current;

  const [activeIndex, setActiveIndex] = useState(0);
  const [tabParams, setTabParams] = useState({});
  const [mountedTabIndexes, setMountedTabIndexes] = useState(() => new Set([0, 1]));

  const markTabMounted = useCallback((index) => {
    if (index == null || index < 0 || index >= TAB_CONFIG.length) {
      return;
    }

    setMountedTabIndexes((prev) => {
      if (prev.has(index)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const mountAround = useCallback((index) => {
    [index - 1, index, index + 1].forEach(markTabMounted);
  }, [markTabMounted]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    mountAround(activeIndex);
  }, [activeIndex, mountAround]);

  const scrollToIndex = useCallback((index, animated) => {
    if (!pagerRef.current || width <= 0) return;
    pagerRef.current.scrollTo({ x: width * index, y: 0, animated });
  }, [width]);

  const switchToTab = useCallback((name, params, animated = true, recordHistory = true) => {
    const nextIndex = TAB_INDEX[name];
    if (nextIndex == null) return false;
    mountAround(nextIndex);

    if (params && typeof params === 'object') {
      setTabParams((prev) => ({
        ...prev,
        [name]: { ...(prev[name] || {}), ...params },
      }));
    }

    if (recordHistory && historyRef.current[historyRef.current.length - 1] !== nextIndex) {
      historyRef.current = [...historyRef.current, nextIndex];
    }

    if (activeIndexRef.current !== nextIndex) setActiveIndex(nextIndex);

    scrollToIndex(nextIndex, animated);
    return true;
  }, [mountAround, scrollToIndex]);

  useEffect(() => {
    const requestedTab = route?.params?.screen;
    if (!requestedTab) return;
    switchToTab(requestedTab, route?.params?.params, false, false);
  }, [route?.params, switchToTab]);

  useEffect(() => {
    scrollToIndex(activeIndex, false);
  }, [activeIndex, scrollToIndex, width]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        if (width <= 0) {
          return;
        }
        const current = event.nativeEvent.contentOffset.x / width;
        mountAround(Math.floor(current));
        mountAround(Math.ceil(current));
      },
    }
  );

  const handleMomentumEnd = useCallback((event) => {
    if (width <= 0) return;

    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    const safeIndex = Math.max(0, Math.min(TAB_CONFIG.length - 1, nextIndex));

    if (safeIndex !== activeIndexRef.current) {
      setActiveIndex(safeIndex);
      if (historyRef.current[historyRef.current.length - 1] !== safeIndex) {
        historyRef.current = [...historyRef.current, safeIndex];
      }
    }
  }, [width]);

  const buildNavigation = useCallback((tabName) => ({
    navigate: (target, params) => {
      if (target === 'MainTabs' && params?.screen) {
        switchToTab(params.screen, params.params, true, true);
        return;
      }

      if (switchToTab(target, params, true, true)) return;

      navigation.navigate(target, params);
    },
    goBack: () => {
      if (historyRef.current.length > 1) {
        const trimmed = historyRef.current.slice(0, -1);
        const prevIndex = trimmed[trimmed.length - 1];
        historyRef.current = trimmed;
        setActiveIndex(prevIndex);
        scrollToIndex(prevIndex, true);
        return;
      }

      if (navigation.canGoBack()) navigation.goBack();
    },
    canGoBack: () => historyRef.current.length > 1 || navigation.canGoBack(),
    setParams: (params) => {
      if (!params || typeof params !== 'object') return;
      setTabParams((prev) => ({
        ...prev,
        [tabName]: { ...(prev[tabName] || {}), ...params },
      }));
    },
  }), [navigation, scrollToIndex, switchToTab]);

  return (
    <View style={styles.root}>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        bounces={false}
        removeClippedSubviews={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        directionalLockEnabled
        decelerationRate="fast"
        style={styles.pager}
      >
        {TAB_CONFIG.map((tab) => {
          const ScreenComponent = tab.component;
          const isMounted = mountedTabIndexes.has(TAB_INDEX[tab.name]);
          return (
            <View key={tab.name} style={[styles.page, { width }]}>
              {isMounted ? (
                <ScreenComponent
                  navigation={buildNavigation(tab.name)}
                  route={{ key: tab.name, name: tab.name, params: tabParams[tab.name] }}
                />
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.tabBar}>
        {TAB_CONFIG.map((tab, i) => (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabButton}
            onPress={() => switchToTab(tab.name, undefined, true, true)}
            activeOpacity={0.85}
          >
            <TabLabel
              scrollX={scrollX}
              index={i}
              label={tab.label}
              icon={tab.icon}
              width={width}
              colors={colors}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabLabelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 55,
    marginTop: 2,
  },
  tabIcon: {
    marginTop: 2,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  dot: {
    marginTop: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

function createStyles(colors) {
  const solidTabBarColor = colors.bgCardSolid || colors.bgCardAlt || colors.bg;
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    pager: {
      flex: 1,
    },
    page: {
      flex: 1,
    },
    tabBar: {
      backgroundColor: solidTabBarColor,
      borderTopColor: colors.greenBorder,
      borderTopWidth: 1,
      borderRadius: 24,
      height: 74,
      paddingTop: 8,
      paddingBottom: 6,
      marginHorizontal: 12,
      marginBottom: 12,
      flexDirection: 'row',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 10,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
