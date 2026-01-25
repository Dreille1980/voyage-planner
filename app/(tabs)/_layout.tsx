import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen 
        name="trips" 
        options={{ 
          title: 'Voyages',
          headerShown: true
        }} 
      />
      <Tabs.Screen 
        name="checklist" 
        options={{ 
          title: 'Checklist',
          headerShown: true
        }} 
      />
      <Tabs.Screen 
        name="destination" 
        options={{ 
          title: 'Destination',
          headerShown: true
        }} 
      />
      <Tabs.Screen 
        name="assistant" 
        options={{ 
          title: 'Assistant',
          headerShown: true
        }} 
      />
    </Tabs>
  );
}
