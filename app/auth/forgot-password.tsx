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
  MessageCircle,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import RedSpinner from '../../src/components/RedSpinner';
import FeedbackModal from '../../src/components/FeedbackModal';
import { authApi, ApiError } from '../../src/services/api';
import { maskEmail } from './verify-otp';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [deliveryChannel, setDeliveryChannel] = useState<'email' | 'whatsapp'>('email');
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
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setFeedbackState({
        visible: true,
        type: 'error',
        title: 'Email Required',
        message: 'Please enter your registered email address to receive your OTP code.',
        onPrimaryPress: () => setFeedbackState((s) => ({ ...s, visible: false })),
      });
      return;
    }

    setIsSendingOtp(true);
    const otpType = deliveryChannel === 'email' ? 'email' : 'whatsapp';

    try {
      await authApi.requestOtp(otpType, trimmedEmail);
      setIsSendingOtp(false);
      router.push({
        pathname: '/auth/verify-otp',
        params: {
          channel: deliveryChannel,
          destination: trimmedEmail,
        },
      });
    } catch (err) {
      setIsSendingOtp(false);
      const message =
        err instanceof ApiError
          ? err.message
          : 'Unable to send OTP right now. Please check your connection and try again.';
      setFeedbackState({
        visible: true,
        type: 'error',
        title: 'Verification Code Not Sent',
        message,
        onPrimaryPress: () => setFeedbackState((s) => ({ ...s, visible: false })),
      });
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
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 32 },
        ]}
      >
        {/* Hero Section */}
        <View style={styles.heroWrapper}>
          <Text style={styles.heroTitle}>Forgot Password?</Text>
          <Text style={styles.heroSubtitle}>
            Enter your registered email address and select where you want to receive your 4-digit security OTP code.
          </Text>
        </View>

        {/* Editable Registered Email Field (Blank by default) */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Registered Email*</Text>
          <View style={styles.inputWrapper}>
            <Mail size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your registered email address"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.textInput}
            />
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
                {email.trim() && email.includes('@')
                  ? maskEmail(email)
                  : 'Receive 4-digit code in your email inbox'}
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

          {/* WhatsApp Option (replaces SMS) */}
          <Pressable
            style={[
              styles.channelCard,
              deliveryChannel === 'whatsapp' && styles.channelCardSelected,
            ]}
            onPress={() => setDeliveryChannel('whatsapp')}
            accessibilityRole="radio"
            accessibilityState={{ selected: deliveryChannel === 'whatsapp' }}
          >
            <View style={[styles.channelIconCircle, styles.whatsappIconCircle]}>
              <MessageCircle
                size={20}
                color="#075B35"
                strokeWidth={2.2}
              />
            </View>
            <View style={styles.channelDetails}>
              <View style={styles.channelTitleRow}>
                <Text style={styles.channelTitle}>Send via WhatsApp</Text>
                <View style={styles.whatsappBadge}>
                  <Text style={styles.whatsappBadgeText}>WhatsApp</Text>
                </View>
              </View>
              <Text style={styles.channelSubtitle} numberOfLines={1}>
                Receive 4-digit code on your registered WhatsApp
              </Text>
            </View>
            <View
              style={[
                styles.radioCircle,
                deliveryChannel === 'whatsapp' && styles.radioCircleSelected,
              ]}
            >
              {deliveryChannel === 'whatsapp' && <View style={styles.radioDot} />}
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
  whatsappIconCircle: {
    backgroundColor: '#DCFCE7',
  },
  channelDetails: {
    flex: 1,
  },
  channelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  channelTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.heading,
  },
  whatsappBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  whatsappBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#075B35',
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
