import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, TouchableOpacity } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        // headerShown: false, // Lo quitamos para controlar por pantalla
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="matches"
        options={{
          headerShown: true, // Mostrar el header para esta pestaña
          title: 'Matches',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          headerShown: true, // Mostrar el header para esta pestaña
          title: 'Teams',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => console.log('Add button on Teams screen pressed')}
              style={{
                backgroundColor: '#4CAF50', // Un color verde
                width: 32,
                height: 32,
                borderRadius: 4, // Bordes ligeramente redondeados
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 15, // Espacio desde el borde derecho
              }}
            >
              {/* Usaremos 'plus' como nombre del SF Symbol. Asegúrate de que esté mapeado en IconSymbol.tsx */}
              <IconSymbol name="plus" size={20} color="white" />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="config" // Este será el nombre del archivo .tsx para esta pantalla
        options={{
          title: 'Config',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />, // Puedes cambiar 'gearshape.fill' por el ícono que prefieras
        }}
      />
    </Tabs>
  );
}
