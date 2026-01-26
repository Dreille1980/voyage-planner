import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { TripProvider } from '../contexts/TripContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <TripProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen 
            name="auth/login" 
            options={{ 
              title: 'Connexion',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="auth/register" 
            options={{ 
              title: 'Inscription',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="new-trip/index" 
            options={{ 
              title: 'Nouveau voyage',
              presentation: 'modal'
            }} 
          />
        </Stack>
      </TripProvider>
    </AuthProvider>
  );
}
