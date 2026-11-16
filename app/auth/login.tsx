import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [identifier, setIdentifier] = useState('michael.clay@kisumu.ke');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = () => {
    if (!identifier.trim()) {
      Alert.alert('Required', 'Please enter your email or phone number.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      signIn({
        name: 'Michael Clay',
        initials: 'MC',
        phone: '+254 712 345 678',
        email: identifier.includes('@') ? identifier : 'michaelclay2225@gmail.com',
      });
      setIsLoading(false);
      // Navigates directly to Home page as requested
      router.replace('/(tabs)/home');
    }, 400);
  };

  const handleGoogleSignIn = () => {
    Alert.alert(
      'Google Sign-In',
      'Google authentication placeholder. Connecting to backend soon!',
      [
        {
          text: 'Continue as Michael',
          onPress: () => {
            signIn({
              name: 'Michael Clay',
              initials: 'MC',
              phone: '+254 712 345 678',
              email: 'michaelclay2225@gmail.com',
            });
            router.replace('/(tabs)/home');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Password Reset',
      `A password recovery link has been sent to ${identifier || 'your email'}.`
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}
    >
      {/* Symmetrical Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft size={24} color={COLORS.heading} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 24 },
        ]}
      >
        {/* Brand Logo & Welcome */}
        <View style={styles.brandHero}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../assets/images/little-polo-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to order your favorites and access special cafe perks.
          </Text>
        </View>

        {/* Input Fields */}
        <View style={styles.formContainer}>
          {/* Email / Phone Field */}
          <Text style={styles.inputLabel}>Email or Phone Number</Text>
          <View style={styles.inputWrapper}>
            <Mail size={18} color="#9CA3AF" strokeWidth={2.2} style={styles.inputIcon} />
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="e.g. name@example.com or 0712..."
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.textInput}
            />
          </View>

          {/* Password Field */}
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputWrapper}>
            <Lock size={18} color="#9CA3AF" strokeWidth={2.2} style={styles.inputIcon} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              style={styles.textInput}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.eyeBtn}
            >
              {showPassword ? (
                <EyeOff size={18} color="#6B7280" />
              ) : (
                <Eye size={18} color="#6B7280" />
              )}
            </Pressable>
          </View>

          {/* Forgot Password Link */}
          <Pressable
            onPress={handleForgotPassword}
            style={styles.forgotBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          {/* Primary Log In Button */}
          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleSignIn}
            accessibilityRole="button"
            accessibilityLabel="Log In"
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Signing In...' : 'Log In'}
            </Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In Button (Placeholder) */}
          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleGoogleSignIn}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Google"
          >
            <View style={styles.googleIconCircle}>
              <Text style={styles.googleGText}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>Sign in with Google</Text>
          </Pressable>
        </View>

        {/* Bottom Register Option */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don’t have an account? </Text>
          <Pressable
            onPress={() => router.push('/auth/register')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.registerLink}>Register</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 38,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  logoImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.heading,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: SPACING.md,
  },
  formContainer: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.heading,
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
  },
  eyeBtn: {
    padding: 6,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 6,
    marginBottom: SPACING.md,
  },
  forgotText: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    color: COLORS.primaryDark,
  },
  loginButton: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
    marginBottom: SPACING.lg,
  },
  loginButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: SPACING.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.full,
    ...SHADOW.soft,
  },
  googleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleGText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 14,
    lineHeight: 16,
  },
  googleButtonText: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.heading,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  registerLink: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.primary,
  },
});
