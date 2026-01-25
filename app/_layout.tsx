import { Stack } from 'expo-router';
import { TripProvider } from '../contexts/TripContext';

export default function RootLayout() {
  return (
    <TripProvider>
      <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="new-trip/index" 
        options={{ 
          title: 'Nouveau voyage',
          presentation: 'modal'
        }} 
      />
      </Stack>
    </TripProvider>
  );
}
