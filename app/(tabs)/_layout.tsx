// app/(tabs)/_layout.tsx
import React from 'react';
import { Platform, StatusBar } from 'react-native';
import { Tabs } from 'expo-router';
import {
  Calendar, Users, MapPin, DollarSign, Wrench, Settings, Sparkles,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/lib/theme';
import { DisplayProvider, useDisplaySettings } from '@/contexts/DisplayContext';

export default function TabLayout() {
  return (
    <DisplayProvider>
      <TabsContent />
    </DisplayProvider>
  );
}

function TabsContent() {
  const insets = useSafeAreaInsets();
  const { immersive } = useDisplaySettings();
  const tabBarPadding = Math.max(10, insets.bottom + 6);

  return (
    <>
      <StatusBar barStyle="light-content" hidden={Platform.OS === 'android' ? immersive : false} />
      <Tabs
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.azure,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarStyle: {
            backgroundColor: COLORS.background,
            borderTopWidth: 0,
            height: 56 + tabBarPadding,
            paddingBottom: tabBarPadding,
            paddingTop: 8,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Réservations',
            tabBarIcon: ({ size, color }) => (
              <Calendar size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            title: 'Clients',
            tabBarIcon: ({ size, color }) => (
              <Users size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Carte',
            tabBarIcon: ({ size, color }) => (
              <MapPin size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="finance"
          options={{
            title: 'Finance',
            tabBarIcon: ({ size, color }) => (
              <DollarSign size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="tools"
          options={{
            title: 'Outils',
            tabBarIcon: ({ size, color }) => (
              <Wrench size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Paramètres',
            tabBarIcon: ({ size, color }) => (
              <Settings size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="advanced"
          options={{
            title: 'Avancé',
            tabBarIcon: ({ size, color }) => (
              <Sparkles size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

