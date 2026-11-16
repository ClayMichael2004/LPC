import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { LocationProvider } from '../src/context/LocationContext';
import { CartProvider } from '../src/context/CartContext';
import { AuthProvider } from '../src/context/AuthContext';
import SystemBarBlur from '../src/components/SystemBarBlur';
import SignInSheetModal from '../src/components/SignInSheetModal';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <LocationProvider>
        <CartProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
              <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="product/[id]"
                options={{
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen name="checkout/delivery" />
              <Stack.Screen name="checkout/payment" />
              <Stack.Screen name="checkout/confirmation" />
            </Stack>
            <SystemBarBlur />
            <SignInSheetModal />
          </AuthProvider>
        </CartProvider>
      </LocationProvider>
    </SafeAreaProvider>
  );
}
