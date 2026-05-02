// src/navigation/MainTabs.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import PlanningScreen from '../screens/PlanningScreen';
import ReservationScreen from '../screens/ReservationScreen';
import FixturesScreen from '../screens/FixturesScreen';
import ChatsScreen from '../screens/ChatsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const DARK = '#06120C';
const TAB_BG = '#0A1C13';
const GREEN = '#2BE67B';
const MUTED = '#8AA59A';

const TABS = [
  {
    name: 'Home',
    component: HomeScreen,
    label: 'Home',
    icon: require('../assets/tab-icons/home.png'),
  },
  {
    name: 'Planning',
    component: PlanningScreen,
    label: 'Planning',
    icon: require('../assets/tab-icons/planning.png'),
  },
  {
    name: 'Reservation',
    component: ReservationScreen,
    label: 'Reserver',
    icon: require('../assets/tab-icons/reserve.png'),
  },
  {
    name: 'Fixtures',
    component: FixturesScreen,
    label: 'Fixtures',
    icon: require('../assets/tab-icons/fixtures.png'),
  },
  {
    name: 'Chats',
    component: ChatsScreen,
    label: 'Chats',
    icon: require('../assets/tab-icons/chats.png'),
  },
  {
    name: 'Profile',
    component: ProfileScreen,
    label: 'Profil',
    icon: require('../assets/tab-icons/profile.png'),
  },
];

const TAB_INDEX = TABS.reduce((acc, tab, index) => {
  acc[tab.name] = index;
  return acc;
}, {});

function TabLabel({ focused, label, icon }) {
  return (
    <View style={styles.tabLabelWrap}>
      <Image source={icon} style={[styles.tabIcon, focused && styles.tabIconFocused]} />
      <Text style={[styles.tabText, focused && styles.tabTextFocused]}>{label}</Text>
      {focused ? <View style={styles.dot} /> : null}
    </View>
  );
}

export default function MainTabs({ navigation, route }) {
  const { width } = useWindowDimensions();
  const pagerRef = useRef(null);
  const historyRef = useRef([0]);
  const activeIndexRef = useRef(0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [tabParams, setTabParams] = useState({});

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const scrollToIndex = useCallback((index, animated) => {
    if (!pagerRef.current || width <= 0) {
      return;
    }
    pagerRef.current.scrollTo({ x: width * index, y: 0, animated });
  }, [width]);

  const switchToTab = useCallback((name, params, animated = true, recordHistory = true) => {
    const nextIndex = TAB_INDEX[name];
    if (nextIndex == null) {
      return false;
    }

    if (params && typeof params === 'object') {
      setTabParams((prev) => ({
        ...prev,
        [name]: {
          ...(prev[name] || {}),
          ...params,
        },
      }));
    }

    if (recordHistory && historyRef.current[historyRef.current.length - 1] !== nextIndex) {
      historyRef.current = [...historyRef.current, nextIndex];
    }

    if (activeIndexRef.current !== nextIndex) {
      setActiveIndex(nextIndex);
    }

    scrollToIndex(nextIndex, animated);
    return true;
  }, [scrollToIndex]);

  useEffect(() => {
    const requestedTab = route?.params?.screen;
    if (!requestedTab) {
      return;
    }

    switchToTab(requestedTab, route?.params?.params, false, false);
  }, [route?.params, switchToTab]);

  useEffect(() => {
    scrollToIndex(activeIndex, false);
  }, [activeIndex, scrollToIndex, width]);

  const handleMomentumEnd = useCallback((event) => {
    if (width <= 0) {
      return;
    }
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    const safeIndex = Math.max(0, Math.min(TABS.length - 1, nextIndex));

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

      if (switchToTab(target, params, true, true)) {
        return;
      }

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

      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    },
    canGoBack: () => historyRef.current.length > 1 || navigation.canGoBack(),
    setParams: (params) => {
      if (!params || typeof params !== 'object') {
        return;
      }
      setTabParams((prev) => ({
        ...prev,
        [tabName]: {
          ...(prev[tabName] || {}),
          ...params,
        },
      }));
    },
  }), [navigation, scrollToIndex, switchToTab]);

  const activeRouteName = TABS[activeIndex]?.name;

  const scenes = useMemo(
    () => TABS.map((tab) => {
      const ScreenComponent = tab.component;
      return {
        ...tab,
        element: (
          <View key={tab.name} style={[styles.page, { width }]}>
            <ScreenComponent
              navigation={buildNavigation(tab.name)}
              route={{ key: tab.name, name: tab.name, params: tabParams[tab.name] }}
            />
          </View>
        ),
      };
    }),
    [buildNavigation, tabParams, width]
  );

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
        contentOffset={{ x: width * activeIndex, y: 0 }}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {scenes.map((scene) => scene.element)}
      </ScrollView>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const focused = tab.name === activeRouteName;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabButton}
              onPress={() => switchToTab(tab.name, undefined, true, true)}
              activeOpacity={0.85}
            >
              <TabLabel focused={focused} label={tab.label} icon={tab.icon} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DARK,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: TAB_BG,
    borderTopColor: '#163126',
    borderTopWidth: 1,
    height: 74,
    paddingTop: 8,
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 55,
    marginTop: 2,
  },
  tabIcon: {
    width: 24,
    height: 24,
    opacity: 0.72,
  },
  tabIconFocused: {
    opacity: 1,
  },
  tabText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  tabTextFocused: {
    color: GREEN,
    fontWeight: '800',
  },
  dot: {
    marginTop: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
  },
});
