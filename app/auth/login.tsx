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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import FeedbackModal from '../../src/components/FeedbackModal';
import { authApi, ApiError } from '../../src/services/api';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ from?: string }>();
  const { signIn } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // In-app Google Auth / Notice Modal
  const [modalState, setModalState] = useState<{
    visible: boolean;
    type: 'info' | 'success' | 'error' | 'confirm';
    title: string;
    message: string;
    primaryText?: string;
    onPrimaryPress: () => void;
    secondaryText?: string;
    onSecondaryPress?: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    onPrimaryPress: () => {},
  });

  const handleSignIn = async () => {
    setErrorMessage(null);
    if (!identifier.trim()) {
      setErrorMessage('Please enter your email address or phone number.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const authResp = await authApi.login(identifier.trim(), password);
      signIn(authResp.user, authResp.token);
      setIsLoading(false);

      // Route to checkout if referred from checkout, otherwise to home page
      if (params.from === 'checkout') {
        router.replace('/checkout/delivery');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (err) {
      setIsLoading(false);
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
        return;
      }
      setErrorMessage('Unable to sign in right now. Please check your connection and try again.');
    }
  };

  const handleGoogleSignIn = () => {
    setModalState({
      visible: true,
      type: 'info',
      title: 'Google Sign-In',
      message: 'Please sign in with your registered email and password, or create an account below.',
      primaryText: 'Got It',
      onPrimaryPress: () => setModalState((s) => ({ ...s, visible: false })),
    });
  };

  const handleForgotPassword = () => {
    router.push('/auth/forgot-password');
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
        {/* Brand Logo & Title */}
        <View style={styles.brandHero}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../assets/images/little-polo-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.welcomeTitle}>Welcome Back</Text>
          <Text style={styles.welcomeSubtitle}>Sign in to your Little Polo account</Text>
        </View>

        {/* Inline Error Message Banner (Modern, Zero OS Alerts) */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color="#DC2626" strokeWidth={2.2} style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        {/* Form Inputs */}
        <View style={styles.formContainer}>
          {/* Email or Phone Input */}
          <Text style={styles.inputLabel}>Email or Phone Number</Text>
          <View style={styles.inputWrapper}>
            <Mail size={18} color="#9CA3AF" strokeWidth={2.2} style={styles.inputIcon} />
            <TextInput
              value={identifier}
              onChangeText={(t) => {
                setIdentifier(t);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="e.g. name@example.com or 0712 345 678"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.textInput}
            />
          </View>

          {/* Password Input */}
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputWrapper}>
            <Lock size={18} color="#9CA3AF" strokeWidth={2.2} style={styles.inputIcon} />
            <TextInput
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errorMessage) setErrorMessage(null);
              }}
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

      {/* Modern In-App Modal Dialog */}
      <FeedbackModal
        visible={modalState.visible}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        primaryText={modalState.primaryText}
        onPrimaryPress={modalState.onPrimaryPress}
        secondaryText={modalState.secondaryText}
        onSecondaryPress={modalState.onSecondaryPress}
      />
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerSpacer: {
    width: 38,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xs,
  },
  brandHero: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  logoImage: {
    width: 74,
    height: 74,
  },
  welcomeTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.heading,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  formContainer: {
    marginTop: SPACING.xs,
  },
  inputLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.heading,
    marginBottom: 6,
    marginTop: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#F9FAFB',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.heading,
  },
  eyeBtn: {
    padding: 6,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: SPACING.md,
  },
  forgotText: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.primary,
  },
  loginButton: {
    height: 52,
    backgroundColor: '#111827',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
    ...SHADOW.soft,
  },
  loginButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
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
    height: 50,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    ...SHADOW.subtle,
  },
  googleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleGText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#4285F4',
  },
  googleButtonText: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: '#374151',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  footerText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  registerLink: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
});
