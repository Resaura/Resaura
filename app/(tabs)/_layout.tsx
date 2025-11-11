// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import {
  Calendar, Users, MapPin, DollarSign, Wrench, Settings, Sparkles,
} from 'lucide-react-native';
import { StatusBar } from 'react-native';
import { COLORS } from '@/lib/theme';

export default function TabLayout() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <Tabs
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.azure,
          tabBarInactiveTintColor: 'rgba(255,255,255,0.7)',
          tabBarStyle: {
            backgroundColor: COLORS.background,
            borderTopWidth: 1,
            borderTopColor: 'rgba(13,231,244,0.25)',
            height: 64,
            paddingBottom: 10,
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
