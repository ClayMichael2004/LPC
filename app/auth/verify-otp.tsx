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
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ArrowRight } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import RedSpinner from '../../src/components/RedSpinner';
import FeedbackModal from '../../src/components/FeedbackModal';
import { authApi, ApiError, setAuthToken } from '../../src/services/api';

// Masks middle characters of email local part: e.g. michaelclay2225@gmail.com -> mic****25@gmail.com
export function maskEmail(rawEmail: string): string {
  const trimmed = rawEmail.trim();
  const [localPart, domain] = trimmed.split('@');
  if (!localPart || !domain) return trimmed;

  if (localPart.length > 5) {
    const start = localPart.slice(0, 3);
    const end = localPart.slice(-2);
    return `${start}****${end}@${domain}`;
  }
  if (localPart.length > 2) {
    const start = localPart.slice(0, 2);
    const end = localPart.slice(-1);
    return `${start}****${end}@${domain}`;
  }
  return `${localPart[0] || 'u'}****@${domain}`;
}

// Masks middle digits of phone number: e.g. +254 712 345 678 -> +254 71****78
export function maskPhone(rawPhone: string): string {
  const trimmed = rawPhone.trim();
  if (trimmed.length > 7) {
    const start = trimmed.slice(0, 7).trimEnd();
    const end = trimmed.slice(-2);
    return `${start}****${end}`;
  }
  if (trimmed.length > 4) {
    return `${trimmed.slice(0, 2)}****${trimmed.slice(-2)}`;
  }
  return trimmed;
}

export default function VerifyOtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    channel?: 'email' | 'sms';
    destination?: string;
  }>();
  const { user } = useAuth();

  const channel = params.channel === 'sms' ? 'sms' : 'email';
  const destination =
    params.destination ||
    (channel === 'email'
      ? user?.email || 'michaelclay2225@gmail.com'
      : user?.phone || '+254 712 345 678');

  const maskedTarget =
    channel === 'email' ? maskEmail(destination) : maskPhone(destination);

  const sentMessage =
    channel === 'email'
      ? `OTP sent to your email ${maskedTarget}`
      : `OTP sent to your phone ${maskedTarget}`;

  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(45);

  const digitRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

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

  // Focus first OTP box on screen open
  useEffect(() => {
    const timer = setTimeout(() => {
      digitRefs[0].current?.focus();
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  // Resend countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleOtpDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
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

  const handleResendOtp = async () => {
    setIsResending(true);
    const otpType = channel === 'email' ? 'email' : 'phone';

    try {
      await authApi.requestOtp(otpType, destination);
    } catch {
      // Offline / local fallback
    }

    setTimeout(() => {
      setIsResending(false);
      setCountdown(45);
      setOtpDigits(['', '', '', '']);
      digitRefs[0].current?.focus();
    }, 900);
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

    setIsVerifying(true);
    try {
      const authResp = await authApi.verifyOtp(
        destination,
        code,
        user?.name || 'Michael Clay'
      );
      if (authResp?.token) {
        await setAuthToken(authResp.token);
      }
      setIsVerifying(false);
      router.replace({
        pathname: '/auth/reset-password',
        params: {
          token: authResp?.token || '',
          destination,
        },
      });
    } catch (err) {
      setIsVerifying(false);
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
      // Offline fallback
      router.replace({
        pathname: '/auth/reset-password',
        params: {
          destination,
        },
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
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/auth/forgot-password')
          }
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft size={24} color={COLORS.heading} strokeWidth={2.4} />
        </Pressable>

        <Text style={styles.headerTitle}>Verify OTP</Text>

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
        {/* Brand Logo */}
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/images/little-polo-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Masked Sent Message & 4-Digit Prompt */}
        <View style={styles.messageBox}>
          <Text style={styles.sentMessageTitle}>{sentMessage}</Text>
          <Text style={styles.enterCodeSubtitle}>Enter the 4-digit code below</Text>
        </View>

        {/* 4-Digit OTP Input Boxes */}
        <View style={styles.otpInputsRow}>
          {otpDigits.map((digit, idx) => (
            <View
              key={`otp-box-${idx}`}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
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
          {isResending ? (
            <View style={styles.resendingRow}>
              <RedSpinner size={20} />
              <Text style={styles.resendingText}>Resending OTP...</Text>
            </View>
          ) : countdown > 0 ? (
            <Text style={styles.countdownText}>Resend code in {countdown}s</Text>
          ) : (
            <Pressable
              onPress={handleResendOtp}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.resendActionText}>Resend OTP Code</Text>
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
          disabled={isVerifying}
          accessibilityRole="button"
          accessibilityLabel="Verify code"
        >
          {isVerifying ? (
            <View style={styles.resendingRow}>
              <RedSpinner size={22} />
              <Text style={styles.verifyButtonText}>Verifying...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.verifyButtonText}>Verify & Proceed</Text>
              <ArrowRight
                size={18}
                color={COLORS.white}
                strokeWidth={2.4}
                style={{ marginLeft: 8 }}
              />
            </>
          )}
        </Pressable>
      </ScrollView>

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
    paddingTop: SPACING.lg,
    alignItems: 'center',
  },
  logoWrapper: {
    marginBottom: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  messageBox: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.sm,
  },
  sentMessageTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
    textAlign: 'center',
    lineHeight: 25,
    marginBottom: 8,
  },
  enterCodeSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  otpInputsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  otpBox: {
    width: 62,
    height: 62,
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
    marginBottom: SPACING.xxl,
    minHeight: 28,
    justifyContent: 'center',
  },
  resendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resendingText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#111827',
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
    width: '100%',
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
