import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen 
        name="trips" 
        options={{ 
          title: 'Voyages',
          headerShown: true,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'briefcase' : 'briefcase-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }} 
      />
      <Tabs.Screen 
        name="checklist" 
        options={{ 
          title: 'Checklist',
          headerShown: true,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'checkmark-done' : 'checkmark-done-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }} 
      />
      <Tabs.Screen 
        name="destination" 
        options={{ 
          title: 'Destination',
          headerShown: true,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'map' : 'map-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }} 
      />
      <Tabs.Screen 
        name="assistant" 
        options={{ 
          title: 'Assistant',
          headerShown: true,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'sparkles' : 'sparkles-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }} 
      />
    </Tabs>
  );
}
