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
import {
  ChevronLeft,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import RedSpinner from '../../src/components/RedSpinner';
import FeedbackModal from '../../src/components/FeedbackModal';
import { authApi, ApiError } from '../../src/services/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    token?: string;
    destination?: string;
  }>();
  const { user, signIn } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPasswordMismatch =
    confirmPassword.length > 0 && confirmPassword !== newPassword;
  const isPasswordMatch =
    confirmPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword === newPassword;

  const [modalState, setModalState] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    primaryText?: string;
    onPrimaryPress: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    onPrimaryPress: () => {},
  });

  const handleConfirmReset = async () => {
    setErrorMessage(null);

    if (!newPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('The passwords you entered do not match.');
      return;
    }

    setIsSaving(true);

    try {
      const authResp = await authApi.resetPassword(newPassword, params.token);
      setIsSaving(false);

      setModalState({
        visible: true,
        type: 'success',
        title: 'Password Reset Successful',
        message:
          'Your new password has been set and a confirmation email has been sent to your email address. You are now signed in!',
        primaryText: 'Continue to Home',
        onPrimaryPress: () => {
          setModalState((s) => ({ ...s, visible: false }));
          signIn(authResp.user, authResp.token);
          router.replace('/(tabs)/home');
        },
      });
    } catch (err) {
      setIsSaving(false);
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
        return;
      }
      setErrorMessage('Unable to reset password right now. Please check your connection and try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}
    >
      {/* Symmetrical Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/auth/login')
          }
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft size={24} color={COLORS.heading} strokeWidth={2.4} />
        </Pressable>

        <Text style={styles.headerTitle}>Set New Password</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 32 },
        ]}
      >
        {/* Brand Hero */}
        <View style={styles.brandHero}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../assets/images/little-polo-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>
            Enter and confirm your new password below to secure your Little Polo account.
          </Text>
        </View>

        {/* Inline Error Banner */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <AlertCircle
              size={18}
              color="#DC2626"
              strokeWidth={2.2}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        {/* Form Inputs */}
        <View style={styles.formContainer}>
          {/* Input 1: New Password */}
          <Text style={styles.inputLabel}>New Password*</Text>
          <View style={styles.inputWrapper}>
            <Lock size={16} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              value={newPassword}
              onChangeText={(t) => {
                setNewPassword(t);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Enter new password (min 6 characters)"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showNewPassword}
              style={styles.textInput}
            />
            <Pressable
              onPress={() => setShowNewPassword(!showNewPassword)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.eyeBtn}
            >
              {showNewPassword ? (
                <EyeOff size={18} color="#6B7280" />
              ) : (
                <Eye size={18} color="#6B7280" />
              )}
            </Pressable>
          </View>

          {/* Input 2: Confirm Password (Real-time matching comparison) */}
          <Text style={styles.inputLabel}>Confirm Password*</Text>
          <View
            style={[
              styles.inputWrapper,
              isPasswordMismatch && styles.inputWrapperMismatch,
              isPasswordMatch && styles.inputWrapperMatch,
            ]}
          >
            <Lock size={16} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Re-enter your new password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showConfirmPassword}
              style={styles.textInput}
            />
            <Pressable
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.eyeBtn}
            >
              {showConfirmPassword ? (
                <EyeOff size={18} color="#6B7280" />
              ) : (
                <Eye size={18} color="#6B7280" />
              )}
            </Pressable>
          </View>

          {/* Real-Time Live Validation Feedback */}
          {isPasswordMismatch && (
            <View style={styles.passwordHintRow}>
              <AlertCircle
                size={14}
                color="#DC2626"
                strokeWidth={2.2}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.mismatchHintText}>
                Passwords do not match yet
              </Text>
            </View>
          )}

          {isPasswordMatch && (
            <View style={styles.passwordHintRow}>
              <Check
                size={14}
                color="#10B981"
                strokeWidth={2.4}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.matchHintText}>Passwords match</Text>
            </View>
          )}

          {/* Confirm Button */}
          <Pressable
            style={({ pressed }) => [
              styles.confirmButton,
              isSaving && styles.confirmButtonLoading,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleConfirmReset}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Confirm new password"
          >
            {isSaving ? (
              <View style={styles.loadingRow}>
                <RedSpinner size={22} />
                <Text style={styles.loadingText}>Saving Password...</Text>
              </View>
            ) : (
              <Text style={styles.confirmButtonText}>Confirm</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <FeedbackModal
        visible={modalState.visible}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        primaryText={modalState.primaryText}
        onPrimaryPress={modalState.onPrimaryPress}
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.heading,
  },
  headerSpacer: {
    width: 36,
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.heading,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.md,
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
    gap: 4,
  },
  inputLabel: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.heading,
    marginTop: SPACING.md,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    height: 50,
  },
  inputWrapperMismatch: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  inputWrapperMatch: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
  },
  eyeBtn: {
    padding: 6,
  },
  passwordHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  mismatchHintText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#DC2626',
  },
  matchHintText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#059669',
  },
  confirmButton: {
    height: 52,
    backgroundColor: '#111827',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    ...SHADOW.soft,
  },
  confirmButtonLoading: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  confirmButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#111827',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
