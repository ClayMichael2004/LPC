import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
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
import { CategoryProvider } from '../src/context/CategoryContext';
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
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('../assets/images/little-polo-logo.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <LocationProvider>
        <CartProvider>
          <AuthProvider>
            <CategoryProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="location" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="auth/login" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                <Stack.Screen name="auth/register" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="notifications" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="profile/personal-info" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="profile/edit-details" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="profile/orders" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="profile/communication" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="activities/gallery"
                  options={{ headerShown: false, animation: 'slide_from_right' }}
                />
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
            </CategoryProvider>
          </AuthProvider>
        </CartProvider>
      </LocationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 140,
    height: 140,
  },
});
