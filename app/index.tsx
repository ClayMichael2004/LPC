import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Pressable,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Sparkles } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SLIDESHOW_PHOTOS = [
  require('../assets/activities/painting-1.jpg'),
  require('../assets/activities/painting-3.jpg'),
  require('../assets/activities/painting-5.jpg'),
  require('../assets/activities/painting-6.jpg'),
];

export default function LandingWelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showSignInModal, signOut } = useAuth();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Auto-shift through the 4 photos every 3.8 seconds with smooth crossfade
  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0.2,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % SLIDESHOW_PHOTOS.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 3800);

    return () => clearInterval(timer);
  }, [fadeAnim]);

  const handleContinueAsGuest = () => {
    signOut();
    router.push('/location');
  };

  const handleLogin = () => {
    showSignInModal('nav');
    router.push('/location');
  };

  const handleRegister = () => {
    showSignInModal('nav');
    router.push('/location');
  };

  return (
    <View style={styles.container}>
      {/* Background Slideshow Image with smooth Animated Crossfade */}
      <Animated.Image
        source={SLIDESHOW_PHOTOS[currentSlideIndex]}
        style={[styles.backgroundImage, { opacity: fadeAnim }]}
        resizeMode="cover"
      />

      {/* Dark Gradient Overlay for optimal contrast and readability */}
      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0.35)',
          'rgba(0, 0, 0, 0.45)',
          'rgba(0, 0, 0, 0.88)',
        ]}
        style={StyleSheet.absoluteFill}
      />

      {/* Content Container */}
      <View
        style={[
          styles.contentWrapper,
          {
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingBottom: Math.max(insets.bottom, 20) + 16,
          },
        ]}
      >
        {/* Top Branding Section */}
        <View style={styles.topBranding}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../assets/images/little-polo-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.kisumuPill}>
            <Sparkles size={12} color={COLORS.primaryLight} strokeWidth={2.4} />
            <Text style={styles.kisumuText}>KISUMU, KENYA</Text>
          </View>

          <Text style={styles.brandTitle}>Little Polo Cafe</Text>
        </View>

        {/* Hero Tagline & Slideshow Progress Indicators */}
        <View style={styles.heroSection}>
          <Text style={styles.heroHeading}>
            Artisan Bites, Crafted Coffee & Creative Moments
          </Text>
          <Text style={styles.heroSubtitle}>
            Order freshly prepared meals to your doorstep or join us for Sunday family oil painting
            on our garden terrace.
          </Text>

          {/* 4 Slideshow Progress Indicators */}
          <View style={styles.indicatorRow}>
            {SLIDESHOW_PHOTOS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicatorBar,
                  index === currentSlideIndex && styles.indicatorBarActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Action Buttons Section */}
        <View style={styles.buttonsSection}>
          {/* 1. Continue as Guest (Distinctive Arrow Action Button) */}
          <Pressable
            style={({ pressed }) => [
              styles.guestArrowButton,
              pressed && styles.guestButtonPressed,
            ]}
            onPress={handleContinueAsGuest}
            accessibilityRole="button"
            accessibilityLabel="Continue as Guest"
          >
            <View style={styles.guestTextCol}>
              <Text style={styles.guestTitle}>Continue as Guest</Text>
              <Text style={styles.guestSubtitle}>Explore menu and activities without an account</Text>
            </View>
            <View style={styles.guestArrowCircle}>
              <ArrowRight size={20} color={COLORS.primary} strokeWidth={2.8} />
            </View>
          </Pressable>

          {/* Row of Ordinary Buttons: Log In & Register */}
          <View style={styles.authRow}>
            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleLogin}
              accessibilityRole="button"
              accessibilityLabel="Log In"
            >
              <Text style={styles.loginButtonText}>Log In</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.registerButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleRegister}
              accessibilityRole="button"
              accessibilityLabel="Register"
            >
              <Text style={styles.registerButtonText}>Register</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
  },
  topBranding: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  logoImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  kisumuPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 26, 36, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(229, 26, 36, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 6,
    marginBottom: 6,
  },
  kisumuText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#FEE2E2',
    letterSpacing: 1.2,
  },
  brandTitle: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  heroSection: {
    marginTop: 'auto',
    marginBottom: SPACING.xl,
  },
  heroHeading: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.white,
    lineHeight: 32,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 21,
    marginBottom: SPACING.lg,
  },
  indicatorRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  indicatorBar: {
    width: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  indicatorBarActive: {
    width: 36,
    backgroundColor: COLORS.primary,
  },
  buttonsSection: {
    gap: SPACING.md,
  },
  guestArrowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: RADIUS.xxl,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    ...SHADOW.soft,
  },
  guestButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    transform: [{ scale: 0.99 }],
  },
  guestTextCol: {
    flex: 1,
    marginRight: SPACING.md,
  },
  guestTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.white,
  },
  guestSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#E5E7EB',
    marginTop: 1,
  },
  guestArrowCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  authRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  loginButton: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  loginButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#0F172A',
  },
  registerButton: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  registerButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
