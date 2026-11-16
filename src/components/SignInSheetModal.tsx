import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { User, Phone } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function SignInSheetModal() {
  const router = useRouter();
  const { isSignInModalVisible, modalSource, hideSignInModal, signIn } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('712 345 678');
  const [showInput, setShowInput] = useState(false);

  if (!isSignInModalVisible) return null;

  const isCheckout = modalSource === 'checkout';

  const handleSignIn = () => {
    hideSignInModal();
    if (isCheckout) {
      router.push({ pathname: '/auth/login', params: { from: 'checkout' } });
    } else {
      router.push('/auth/login');
    }
  };

  const handleRegister = () => {
    hideSignInModal();
    router.push('/auth/register');
  };

  return (
    <Modal
      visible={isSignInModalVisible}
      transparent
      animationType="slide"
      onRequestClose={hideSignInModal}
    >
      <Pressable style={styles.backdrop} onPress={hideSignInModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {/* Little Polo Logo Avatar */}
            <View style={styles.avatarCircle}>
              <Image
                source={require('../../assets/images/little-polo-logo.png')}
                style={styles.avatarLogo}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {isCheckout ? 'Sign in to place your order' : 'Sign in to continue'}
            </Text>

            {/* Description */}
            <Text style={styles.description}>
              Sign in with your phone or email to view your profile, orders, and more.
            </Text>

            {/* Phone Input or Quick Tap */}
            {showInput ? (
              <View style={styles.phoneInputRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.flagText}>🇰🇪</Text>
                  <Text style={styles.codeText}>+254</Text>
                </View>
                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  placeholder="712 345 678"
                  style={styles.textInput}
                  autoFocus
                />
              </View>
            ) : null}

            {/* Primary Sign In Button */}
            <Pressable
              onPress={handleSignIn}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              <Text style={styles.primaryButtonText}>Sign in</Text>
            </Pressable>

            {/* Don't have an account? Register */}
            <Pressable
              onPress={handleRegister}
              style={styles.registerLink}
              hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
            >
              <Text style={styles.registerLinkText}>
                Don’t have an account? <Text style={styles.registerLinkBold}>Register</Text>
              </Text>
            </Pressable>

            {/* Not now */}
            <Pressable
              onPress={hideSignInModal}
              style={styles.notNowButton}
              hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
            >
              <Text style={styles.notNowText}>Not now</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlayBackdrop,
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    width: '100%',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    ...SHADOW.soft,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  avatarLogo: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.heading,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  phoneInputRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: SPACING.sm,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  flagText: {
    fontSize: 16,
    marginRight: 4,
  },
  codeText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  textInput: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    paddingVertical: 4,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#18181B',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  primaryButtonPressed: {
    backgroundColor: '#27272A',
  },
  primaryButtonText: {
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
    color: COLORS.white,
  },
  registerLink: {
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.md,
  },
  registerLinkText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#6B7280',
  },
  registerLinkBold: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  notNowButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  notNowText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
});
