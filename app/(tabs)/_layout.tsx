import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../../theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          paddingTop: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          ...typography.labelSmall,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen 
        name="trips" 
        options={{ 
          title: 'Voyages',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'briefcase' : 'briefcase-outline'} 
              size={22} 
              color={color} 
            />
          ),
        }} 
      />
      <Tabs.Screen 
        name="checklist" 
        options={{ 
          title: 'Checklist',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'checkmark-done' : 'checkmark-done-outline'} 
              size={22} 
              color={color} 
            />
          ),
        }} 
      />
      <Tabs.Screen 
        name="destination" 
        options={{ 
          title: 'Destination',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'map' : 'map-outline'} 
              size={22} 
              color={color} 
            />
          ),
        }} 
      />
      <Tabs.Screen 
        name="assistant" 
        options={{ 
          title: 'Assistant',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'sparkles' : 'sparkles-outline'} 
              size={22} 
              color={color} 
            />
          ),
        }} 
      />
    </Tabs>
  );
}
