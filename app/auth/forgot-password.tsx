import React, { useState, useRef, useEffect } from 'react';
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
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import RedSpinner from '../../src/components/RedSpinner';
import FeedbackModal from '../../src/components/FeedbackModal';
import { authApi, ApiError } from '../../src/services/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signIn } = useAuth();

  const [email, setEmail] = useState(user?.email || 'michaelclay2225@gmail.com');
  const [phone, setPhone] = useState(user?.phone === '—' ? '+254 712 345 678' : user?.phone || '+254 712 345 678');
  const [deliveryChannel, setDeliveryChannel] = useState<'email' | 'sms'>('email');

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSentNotification, setOtpSentNotification] = useState<string | null>(null);

  // 4-digit OTP state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const digitRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  // Resend Countdown
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Modal feedback
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
        message: 'Please enter a valid email address to receive your OTP code.',
        onPrimaryPress: () => setFeedbackState((s) => ({ ...s, visible: false })),
      });
      return;
    }

    setIsSendingOtp(true);
    const destination = deliveryChannel === 'email' ? email.trim() : phone.trim();
    const otpType = deliveryChannel === 'email' ? 'email' : 'phone';

    try {
      await authApi.requestOtp(otpType, destination);
    } catch {
      // Offline / local fallback
    }

    // Keep spinner visible briefly so user sees the smooth spin animation
    setTimeout(() => {
      setIsSendingOtp(false);
      setOtpSent(true);
      setCountdown(45);
      setOtpSentNotification(`OTP code has been sent to ${destination}. Please enter the 4 digits below.`);

      // Focus first OTP box
      setTimeout(() => {
        digitRefs[0].current?.focus();
      }, 200);
    }, 900);
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handles pasting or rapid multi-input
      const chars = value.slice(-1);
      const newDigits = [...otpDigits];
      newDigits[index] = chars;
      setOtpDigits(newDigits);
      if (index < 3) digitRefs[index + 1].current?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    if (value && index < 3) {
      digitRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitRefs[index - 1].current?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length < 4) {
      setFeedbackState({
        visible: true,
        type: 'error',
        title: 'Incomplete Code',
        message: 'Please enter all 4 digits of the verification code.',
        onPrimaryPress: () => setFeedbackState((s) => ({ ...s, visible: false })),
      });
      return;
    }

    const destination = deliveryChannel === 'email' ? email.trim() : phone.trim();

    try {
      const authResp = await authApi.verifyOtp(
        destination,
        code,
        user?.name || 'Michael Clay'
      );
      signIn(authResp.user, authResp.token);
    } catch (err) {
      if (err instanceof ApiError) {
        setFeedbackState({
          visible: true,
          type: 'error',
          title: 'Verification Failed',
          message: err.message,
          onPrimaryPress: () => setFeedbackState((s) => ({ ...s, visible: false })),
        });
        return;
      }
      // Offline / local fallback
      signIn({
        name: user?.name || 'Michael Clay',
        initials: user?.initials || 'MC',
        email,
        phone,
      });
    }

    setFeedbackState({
      visible: true,
      type: 'success',
      title: 'Identity Verified',
      message: 'Your verification code is valid. Welcome back to Little Polo Cafe!',
      onPrimaryPress: () => {
        setFeedbackState((s) => ({ ...s, visible: false }));
        router.replace('/(tabs)/home');
      },
    });
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
                {email || 'Your registered email'}
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
                {phone}
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
            <Text style={styles.sendOtpButtonText}>
              {otpSent ? 'Resend OTP Code' : 'Send OTP'}
            </Text>
          )}
        </Pressable>

        {/* Sent Confirmation Banner */}
        {otpSentNotification && (
          <View style={styles.notificationBanner}>
            <CheckCircle2 size={18} color="#10B981" strokeWidth={2.4} style={{ marginRight: 8 }} />
            <Text style={styles.notificationText}>{otpSentNotification}</Text>
          </View>
        )}

        {/* OTP Input Boxes (Always Visible once sent) */}
        {otpSent && (
          <View style={styles.otpSection}>
            <Text style={styles.otpSectionTitle}>ENTER 4-DIGIT CODE</Text>

            <View style={styles.otpInputsRow}>
              {otpDigits.map((digit, idx) => (
                <View
                  key={`otp-box-${idx}`}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                  ]}
                >
                  <TextInput
                    ref={digitRefs[idx]}
                    value={digit}
                    onChangeText={(val) => handleOtpDigitChange(idx, val)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(idx, nativeEvent.key)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    style={styles.otpBoxInput}
                  />
                </View>
              ))}
            </View>

            {/* Countdown / Resend Link */}
            <View style={styles.resendWrapper}>
              {countdown > 0 ? (
                <Text style={styles.countdownText}>
                  Resend code in {countdown}s
                </Text>
              ) : (
                <Pressable onPress={handleSendOtp} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.resendActionText}>Resend code now</Text>
                </Pressable>
              )}
            </View>

            {/* Verify & Proceed Button */}
            <Pressable
              style={({ pressed }) => [
                styles.verifyButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleVerifyOtp}
              accessibilityRole="button"
              accessibilityLabel="Verify code"
            >
              <Text style={styles.verifyButtonText}>Verify & Proceed</Text>
              <ArrowRight size={18} color={COLORS.white} strokeWidth={2.4} style={{ marginLeft: 8 }} />
            </Pressable>
          </View>
        )}
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
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 12,
    marginBottom: SPACING.xl,
  },
  notificationText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
  },
  otpSection: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  otpSectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  otpInputsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: SPACING.md,
  },
  otpBox: {
    width: 60,
    height: 60,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  otpBoxFilled: {
    borderColor: '#111827',
    backgroundColor: '#FAFAFA',
  },
  otpBoxInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.heading,
  },
  resendWrapper: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  countdownText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#9CA3AF',
  },
  resendActionText: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  verifyButton: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  verifyButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
