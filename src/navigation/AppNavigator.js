// src/navigation/AppNavigator.js
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { supabase } from '../services/supabase';
import { registerPushTokenIfAvailable } from '../services/pushService';
import { COLORS } from '../theme';

import AuthScreen from '../screens/AuthScreen';
import FixtureChatScreen from '../screens/FixtureChatScreen';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }
    registerPushTokenIfAvailable();
  }, [session]);

  if (session === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.green} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          // Authenticated routes
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="FixtureChat" component={FixtureChatScreen} />
          </>
        ) : (
          // Unauthenticated
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
