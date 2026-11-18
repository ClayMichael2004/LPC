import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Mail,
  Smartphone,
  Lock,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import RedSpinner from '../../src/components/RedSpinner';
import FeedbackModal from '../../src/components/FeedbackModal';
import { authApi } from '../../src/services/api';
import { maskEmail, maskPhone } from './verify-otp';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [email] = useState(user?.email || 'michaelclay2225@gmail.com');
  const [phone] = useState(
    user?.phone === '—' ? '+254 712 345 678' : user?.phone || '+254 712 345 678'
  );
  const [deliveryChannel, setDeliveryChannel] = useState<'email' | 'sms'>('email');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const [feedbackState, setFeedbackState] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    onPrimaryPress: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    onPrimaryPress: () => {},
  });

  const handleSendOtp = async () => {
    if (deliveryChannel === 'email' && !email.trim()) {
      setFeedbackState({
        visible: true,
        type: 'error',
        title: 'Email Required',
        message: 'Please provide a valid email address to receive your OTP code.',
        onPrimaryPress: () => setFeedbackState((s) => ({ ...s, visible: false })),
      });
      return;
    }

    setIsSendingOtp(true);
    const destination = deliveryChannel === 'email' ? email.trim() : phone.trim();
    const otpType = deliveryChannel === 'email' ? 'email' : 'phone';
    let receivedDevCode = '';

    try {
      const resp = await authApi.requestOtp(otpType, destination);
      if (resp?.devCode) {
        receivedDevCode = resp.devCode.slice(0, 4);
      }
    } catch {
      // Offline / local fallback
      receivedDevCode = '1234';
    }

    // Show spinner animation briefly, then open the dedicated Verify OTP screen
    setTimeout(() => {
      setIsSendingOtp(false);
      router.push({
        pathname: '/auth/verify-otp',
        params: {
          channel: deliveryChannel,
          destination,
          devCode: receivedDevCode,
        },
      });
    }, 900);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}
    >
      {/* Symmetrical Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/auth/login'))}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft size={24} color={COLORS.heading} strokeWidth={2.4} />
        </Pressable>

        <Text style={styles.headerTitle}>Reset Password</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 32 },
        ]}
      >
        {/* Hero Section */}
        <View style={styles.heroWrapper}>
          <Text style={styles.heroTitle}>Forgot Password?</Text>
          <Text style={styles.heroSubtitle}>
            Select where you want to receive your security OTP code to reset your account credentials.
          </Text>
        </View>

        {/* Display Email Field (Uneditable / Locked) */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Registered Email</Text>
          <View style={[styles.inputWrapper, styles.inputWrapperLocked]}>
            <Mail size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              value={email}
              editable={false}
              selectTextOnFocus={false}
              style={[styles.textInput, styles.textInputLocked]}
            />
            <Lock size={16} color="#9CA3AF" strokeWidth={2} />
          </View>
        </View>

        {/* Channel Selection Cards */}
        <Text style={styles.inputLabel}>Choose Delivery Method</Text>

        <View style={styles.channelCardsRow}>
          {/* Email Option */}
          <Pressable
            style={[
              styles.channelCard,
              deliveryChannel === 'email' && styles.channelCardSelected,
            ]}
            onPress={() => setDeliveryChannel('email')}
            accessibilityRole="radio"
            accessibilityState={{ selected: deliveryChannel === 'email' }}
          >
            <View style={styles.channelIconCircle}>
              <Mail
                size={20}
                color={deliveryChannel === 'email' ? '#111827' : '#6B7280'}
                strokeWidth={2.2}
              />
            </View>
            <View style={styles.channelDetails}>
              <Text style={styles.channelTitle}>Send via Email</Text>
              <Text style={styles.channelSubtitle} numberOfLines={1}>
                {maskEmail(email)}
              </Text>
            </View>
            <View
              style={[
                styles.radioCircle,
                deliveryChannel === 'email' && styles.radioCircleSelected,
              ]}
            >
              {deliveryChannel === 'email' && <View style={styles.radioDot} />}
            </View>
          </Pressable>

          {/* SMS Option */}
          <Pressable
            style={[
              styles.channelCard,
              deliveryChannel === 'sms' && styles.channelCardSelected,
            ]}
            onPress={() => setDeliveryChannel('sms')}
            accessibilityRole="radio"
            accessibilityState={{ selected: deliveryChannel === 'sms' }}
          >
            <View style={styles.channelIconCircle}>
              <Smartphone
                size={20}
                color={deliveryChannel === 'sms' ? '#111827' : '#6B7280'}
                strokeWidth={2.2}
              />
            </View>
            <View style={styles.channelDetails}>
              <Text style={styles.channelTitle}>Send via SMS</Text>
              <Text style={styles.channelSubtitle} numberOfLines={1}>
                {maskPhone(phone)}
              </Text>
            </View>
            <View
              style={[
                styles.radioCircle,
                deliveryChannel === 'sms' && styles.radioCircleSelected,
              ]}
            >
              {deliveryChannel === 'sms' && <View style={styles.radioDot} />}
            </View>
          </Pressable>
        </View>

        {/* Send OTP Button with Animated Red Spinner */}
        <Pressable
          style={({ pressed }) => [
            styles.sendOtpButton,
            isSendingOtp && styles.sendOtpButtonLoading,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleSendOtp}
          disabled={isSendingOtp}
          accessibilityRole="button"
          accessibilityLabel="Send OTP"
        >
          {isSendingOtp ? (
            <View style={styles.loadingRow}>
              <RedSpinner size={24} />
              <Text style={styles.loadingText}>Sending OTP...</Text>
            </View>
          ) : (
            <Text style={styles.sendOtpButtonText}>Send OTP</Text>
          )}
        </Pressable>
      </ScrollView>

      {/* Modern In-App Feedback Modal */}
      <FeedbackModal
        visible={feedbackState.visible}
        type={feedbackState.type}
        title={feedbackState.title}
        message={feedbackState.message}
        onPrimaryPress={feedbackState.onPrimaryPress}
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
  heroWrapper: {
    marginBottom: SPACING.xl,
  },
  heroTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.heading,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.heading,
    marginBottom: 8,
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
  inputWrapperLocked: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
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
  textInputLocked: {
    color: '#6B7280',
    fontFamily: FONTS.medium,
  },
  channelCardsRow: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  channelCardSelected: {
    borderColor: '#111827',
    backgroundColor: '#FAFAFA',
  },
  channelIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  channelDetails: {
    flex: 1,
  },
  channelTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.heading,
    marginBottom: 2,
  },
  channelSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#111827',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#111827',
  },
  sendOtpButton: {
    height: 52,
    backgroundColor: '#111827',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    ...SHADOW.soft,
  },
  sendOtpButtonLoading: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendOtpButtonText: {
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
