import React, { useState, useRef, useEffect } from 'react';
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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  MessageSquare,
  X,
  Clock,
  CheckCircle2,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import FeedbackModal from '../../src/components/FeedbackModal';
import { authApi, setAuthToken, ApiError } from '../../src/services/api';

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

  // Admin 2FA Delivery Channel Selection Modal
  const [adminOtpModal, setAdminOtpModal] = useState<{
    visible: boolean;
    email: string;
    phone: string;
  }>({
    visible: false,
    email: '',
    phone: '',
  });

  // Admin 2FA Code Verification Modal (In-place modal on login screen)
  const [otpVerifyModal, setOtpVerifyModal] = useState<{
    visible: boolean;
    channel: 'email' | 'whatsapp';
    destination: string;
  }>({
    visible: false,
    channel: 'email',
    destination: '',
  });

  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(45);
  const [isResending, setIsResending] = useState(false);

  const digitRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  // Resend Countdown Timer
  useEffect(() => {
    if (!otpVerifyModal.visible || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpVerifyModal.visible, countdown]);

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

      // Enforce 2FA OTP for Administrator Account
      if ('requiresOtp' in authResp && authResp.requiresOtp) {
        setIsLoading(false);
        setAdminOtpModal({
          visible: true,
          email: authResp.email || 'mikewillmakeit2004@gmail.com',
          phone: authResp.phone || '+254704769219',
        });
        return;
      }

      if ('user' in authResp && authResp.user) {
        signIn(authResp.user, authResp.token);
        setIsLoading(false);

        // Route to checkout if referred from checkout, otherwise to home page
        if (params.from === 'checkout') {
          router.replace('/checkout/delivery');
        } else {
          router.replace('/(tabs)/home');
        }
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

  const handleSelectAdminOtpChannel = async (channel: 'email' | 'whatsapp') => {
    const destination = channel === 'email' ? adminOtpModal.email : adminOtpModal.phone;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await authApi.requestOtp(channel, destination);
      setIsLoading(false);
      setAdminOtpModal((s) => ({ ...s, visible: false }));

      // Open the OTP Verification Modal directly on screen
      setOtpDigits(['', '', '', '']);
      setOtpError(null);
      setCountdown(45);
      setOtpVerifyModal({
        visible: true,
        channel,
        destination,
      });

      // Focus first digit box
      setTimeout(() => {
        digitRefs[0].current?.focus();
      }, 350);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Failed to dispatch verification code. Please check connection.');
    }
  };

  const handleOtpDigitChange = (value: string, index: number) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      // Pasted full 4-digit code
      const pastedDigits = cleaned.slice(0, 4).split('');
      pastedDigits.forEach((d, i) => {
        if (i < 4) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      if (pastedDigits.length === 4) {
        handleVerifyAdminOtp(newDigits.join(''));
      } else {
        const nextIdx = Math.min(pastedDigits.length, 3);
        digitRefs[nextIdx].current?.focus();
      }
      return;
    }

    newDigits[index] = cleaned;
    setOtpDigits(newDigits);
    setOtpError(null);

    if (cleaned && index < 3) {
      digitRefs[index + 1].current?.focus();
    }

    // Auto verify when 4th digit is entered
    if (cleaned && index === 3) {
      const fullCode = newDigits.join('');
      if (fullCode.length === 4) {
        handleVerifyAdminOtp(fullCode);
      }
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitRefs[index - 1].current?.focus();
    }
  };

  const handleVerifyAdminOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length < 4) {
      setOtpError('Please enter all 4 digits of the verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);
    try {
      const authResp = await authApi.verifyOtp(otpVerifyModal.destination, code);
      if (authResp?.token) {
        await setAuthToken(authResp.token);
      }
      setIsVerifyingOtp(false);
      setOtpVerifyModal((s) => ({ ...s, visible: false }));

      signIn(authResp.user, authResp.token);

      if (params.from === 'checkout') {
        router.replace('/checkout/delivery');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (err: any) {
      setIsVerifyingOtp(false);
      setOtpError(err?.message || 'Invalid verification code. Please check your code and try again.');
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setOtpError(null);
    try {
      await authApi.requestOtp(otpVerifyModal.channel, otpVerifyModal.destination);
      setIsResending(false);
      setCountdown(45);
      setOtpDigits(['', '', '', '']);
      digitRefs[0].current?.focus();
    } catch (err: any) {
      setIsResending(false);
      setOtpError(err?.message || 'Failed to resend code. Please try again.');
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

        {/* Inline Error Message Banner */}
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
              style={[styles.textInput, { paddingRight: 40 }]}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff size={18} color="#9CA3AF" strokeWidth={2} />
              ) : (
                <Eye size={18} color="#9CA3AF" strokeWidth={2} />
              )}
            </Pressable>
          </View>

          {/* Forgot Password */}
          <View style={styles.forgotPasswordRow}>
            <Pressable
              onPress={handleForgotPassword}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Forgot Password"
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </Pressable>
          </View>

          {/* Sign In Primary CTA */}
          <Pressable
            style={[styles.signInButton, isLoading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Sign In"
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Sign In (Google) */}
        <Pressable
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          accessibilityRole="button"
          accessibilityLabel="Sign in with Google"
        >
          <Image
            source={require('../../assets/images/google-icon.png')}
            style={styles.googleIcon}
            resizeMode="contain"
          />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </Pressable>

        {/* Don't have an account? Sign Up */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable
            onPress={() => router.push('/auth/register')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Create an account"
          >
            <Text style={styles.signUpText}>Sign Up</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Admin 2FA Delivery Channel Selection Modal */}
      <Modal
        visible={adminOtpModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAdminOtpModal((s) => ({ ...s, visible: false }))}
      >
        <View style={styles.adminModalBackdrop}>
          <View style={styles.adminModalCard}>
            <View style={styles.adminModalHeader}>
              <View style={styles.shieldIconCircle}>
                <ShieldCheck size={32} color="#07345F" strokeWidth={2.3} />
              </View>
              <Text style={styles.adminModalTitle}>Security Verification</Text>
              <Text style={styles.adminModalSubtitle}>
                Choose where to receive your 4-digit administrator security code:
              </Text>
            </View>

            <View style={styles.channelOptionsContainer}>
              {/* Option 1: Email */}
              <Pressable
                style={({ pressed }) => [
                  styles.channelCard,
                  { backgroundColor: '#DBEAFE', borderColor: '#BFDBFE' },
                  pressed && styles.channelCardPressed,
                ]}
                onPress={() => handleSelectAdminOtpChannel('email')}
                accessibilityRole="button"
                accessibilityLabel="Send OTP code via Email"
              >
                <View style={[styles.channelIconBox, { backgroundColor: '#FFFFFF' }]}>
                  <Mail size={22} color="#07345F" strokeWidth={2.3} />
                </View>
                <View style={styles.channelInfo}>
                  <Text style={[styles.channelTitle, { color: '#07345F' }]}>Send code via Email</Text>
                  <Text style={styles.channelTarget} numberOfLines={1}>
                    {adminOtpModal.email}
                  </Text>
                </View>
              </Pressable>

              {/* Option 2: WhatsApp */}
              <Pressable
                style={({ pressed }) => [
                  styles.channelCard,
                  { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' },
                  pressed && styles.channelCardPressed,
                ]}
                onPress={() => handleSelectAdminOtpChannel('whatsapp')}
                accessibilityRole="button"
                accessibilityLabel="Send OTP code via WhatsApp"
              >
                <View style={[styles.channelIconBox, { backgroundColor: '#FFFFFF' }]}>
                  <MessageSquare size={22} color="#075B35" strokeWidth={2.3} />
                </View>
                <View style={styles.channelInfo}>
                  <Text style={[styles.channelTitle, { color: '#075B35' }]}>Send code via WhatsApp</Text>
                  <Text style={styles.channelTarget} numberOfLines={1}>
                    {adminOtpModal.phone}
                  </Text>
                </View>
              </Pressable>
            </View>

            <Pressable
              style={styles.cancelBtn}
              onPress={() => setAdminOtpModal((s) => ({ ...s, visible: false }))}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Admin 2FA In-Place OTP Code Entry Modal */}
      <Modal
        visible={otpVerifyModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setOtpVerifyModal((s) => ({ ...s, visible: false }))}
      >
        <View style={styles.adminModalBackdrop}>
          <View style={styles.otpModalCard}>
            {/* Modal Header */}
            <View style={styles.otpModalHeaderRow}>
              <View style={styles.otpHeaderTitleGroup}>
                <Text style={styles.otpModalTitle}>Enter Verification Code</Text>
                <Text style={styles.otpModalSubtitle}>
                  Sent to {otpVerifyModal.destination}
                </Text>
              </View>
              <Pressable
                onPress={() => setOtpVerifyModal((s) => ({ ...s, visible: false }))}
                style={styles.otpModalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={COLORS.heading} strokeWidth={2.3} />
              </Pressable>
            </View>

            {/* Error Message inside modal */}
            {otpError && (
              <View style={styles.otpErrorBanner}>
                <AlertCircle size={16} color="#DC2626" strokeWidth={2.2} />
                <Text style={styles.otpErrorText}>{otpError}</Text>
              </View>
            )}

            {/* 4-Digit Input Boxes */}
            <View style={styles.digitsRow}>
              {otpDigits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={digitRefs[index]}
                  value={digit}
                  onChangeText={(val) => handleOtpDigitChange(val, index)}
                  onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={index === 0 ? 4 : 1}
                  selectTextOnFocus
                  style={[
                    styles.digitBox,
                    digit ? styles.digitBoxFilled : null,
                  ]}
                />
              ))}
            </View>

            {/* Resend and Countdown */}
            <View style={styles.otpFooterRow}>
              <View style={styles.countdownRow}>
                <Clock size={14} color={COLORS.textSecondary} />
                <Text style={styles.countdownText}>
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Code expired'}
                </Text>
              </View>

              <Pressable
                onPress={handleResendOtp}
                disabled={countdown > 0 || isResending}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text
                  style={[
                    styles.resendBtnText,
                    countdown > 0 && styles.resendBtnDisabled,
                  ]}
                >
                  {isResending ? 'Sending...' : 'Resend Code'}
                </Text>
              </Pressable>
            </View>

            {/* Verify CTA Button */}
            <Pressable
              style={[
                styles.verifySubmitBtn,
                (isVerifyingOtp || otpDigits.join('').length < 4) && styles.verifySubmitDisabled,
              ]}
              onPress={() => handleVerifyAdminOtp()}
              disabled={isVerifyingOtp || otpDigits.join('').length < 4}
              accessibilityRole="button"
              accessibilityLabel="Verify and Sign In"
            >
              {isVerifyingOtp ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <CheckCircle2 size={18} color={COLORS.white} strokeWidth={2.4} />
                  <Text style={styles.verifySubmitText}>Verify & Sign In</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Feedback Dialog */}
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
    borderColor: '#FECACA',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  formContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.heading,
    marginBottom: 6,
    marginTop: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: SPACING.md,
    height: 50,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  textInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.heading,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    padding: 4,
  },
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: SPACING.lg,
  },
  forgotPasswordText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.primary,
  },
  signInButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
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
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: COLORS.white,
    marginBottom: SPACING.lg,
    ...SHADOW.soft,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleButtonText: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.heading,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  footerText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  signUpText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primary,
  },
  adminModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  adminModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOW.soft,
  },
  adminModalHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  shieldIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  adminModalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.heading,
    marginBottom: 6,
    textAlign: 'center',
  },
  adminModalSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  channelOptionsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: SPACING.md,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
  },
  channelCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  channelIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  channelInfo: {
    flex: 1,
  },
  channelTitle: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    marginBottom: 2,
  },
  channelTarget: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  cancelBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#6B7280',
  },
  otpModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    ...SHADOW.soft,
  },
  otpModalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  otpHeaderTitleGroup: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  otpModalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
    marginBottom: 4,
  },
  otpModalSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  otpModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    marginBottom: SPACING.md,
  },
  otpErrorText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#991B1B',
  },
  digitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginVertical: SPACING.md,
  },
  digitBox: {
    flex: 1,
    height: 58,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    textAlign: 'center',
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.heading,
  },
  digitBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF7ED',
  },
  otpFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    marginTop: 4,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countdownText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  resendBtnText: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    color: COLORS.primary,
  },
  resendBtnDisabled: {
    color: '#9CA3AF',
  },
  verifySubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    ...SHADOW.soft,
  },
  verifySubmitDisabled: {
    opacity: 0.6,
  },
  verifySubmitText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
});
