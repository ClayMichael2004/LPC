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
import { ChevronLeft, User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = () => {
    if (!firstName.trim() || (!email.trim() && !phone.trim())) {
      Alert.alert('Required', 'Please provide your name and an email or phone number.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const initials = `${firstName[0] || 'M'}${lastName[0] || 'C'}`.toUpperCase();
      signIn({
        name: `${firstName} ${lastName}`.trim(),
        initials,
        phone: phone || '+254 712 345 678',
        email: email || 'michaelclay2225@gmail.com',
      });
      setIsLoading(false);
      // Navigates directly to Home page as requested
      router.replace('/(tabs)/home');
    }, 400);
  };

  const handleGoogleSignIn = () => {
    Alert.alert(
      'Google Sign-Up',
      'Google authentication placeholder. Connecting to backend soon!',
      [
        {
          text: 'Continue with Google',
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join Little Polo Cafe for easy mobile ordering and activity bookings.
          </Text>
        </View>

        {/* Input Fields */}
        <View style={styles.formContainer}>
          {/* Name Fields Row */}
          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>First Name*</Text>
              <View style={styles.inputWrapper}>
                <User size={16} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Michael"
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                />
              </View>
            </View>

            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Clay"
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                />
              </View>
            </View>
          </View>

          {/* Email Field */}
          <Text style={styles.inputLabel}>Email Address*</Text>
          <View style={styles.inputWrapper}>
            <Mail size={16} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. name@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.textInput}
            />
          </View>

          {/* Phone Field */}
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.inputWrapper}>
            <Phone size={16} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. 0712 345 678"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              style={styles.textInput}
            />
          </View>

          {/* Password Field */}
          <Text style={styles.inputLabel}>Password*</Text>
          <View style={styles.inputWrapper}>
            <Lock size={16} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Choose a password"
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

          {/* Primary Create Account Button */}
          <Pressable
            style={({ pressed }) => [
              styles.registerButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleRegister}
            accessibilityRole="button"
            accessibilityLabel="Create Account"
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
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
            accessibilityLabel="Sign up with Google"
          >
            <View style={styles.googleIconCircle}>
              <Text style={styles.googleGText}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>Sign up with Google</Text>
          </Pressable>
        </View>

        {/* Bottom Login Option */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable
            onPress={() => router.push('/auth/login')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.loginLink}>Log In</Text>
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
    marginBottom: SPACING.lg,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  logoImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
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
    lineHeight: 18,
    paddingHorizontal: SPACING.md,
  },
  formContainer: {
    gap: 4,
  },
  rowFields: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfField: {
    flex: 1,
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
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
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
  registerButton: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  registerButtonText: {
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
    marginBottom: SPACING.md,
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
    marginTop: SPACING.lg,
  },
  footerText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  loginLink: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.primary,
  },
});
