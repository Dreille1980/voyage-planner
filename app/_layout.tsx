import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
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
  );
}
