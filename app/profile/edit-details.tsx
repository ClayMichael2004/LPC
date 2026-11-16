import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function EditPersonalDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signIn } = useAuth();

  const nameParts = (user?.name || 'Michael Clay').split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] || 'Michael');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || 'Clay');
  const [email, setEmail] = useState(user?.email || 'michaelclay2225@gmail.com');
  const [phone, setPhone] = useState(user?.phone === '—' ? '' : user?.phone || '+254 712 345 678');
  const [dob, setDob] = useState((user as any)?.dob === '—' ? '' : (user as any)?.dob || '');

  const handleSaveDetails = () => {
    if (!firstName.trim()) {
      Alert.alert('Required', 'Please enter your first name.');
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const initials = `${firstName[0] || 'M'}${lastName[0] || 'C'}`.toUpperCase();

    signIn({
      name: fullName,
      initials,
      phone: phone || '+254 712 345 678',
      email: email || 'michaelclay2225@gmail.com',
    });

    Alert.alert('Details Saved', 'Your personal details have been updated successfully.', [
      {
        text: 'OK',
        onPress: () => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/profile/personal-info');
          }
        },
      },
    ]);
  };

  const handleChangeEmail = () => {
    Alert.prompt
      ? Alert.prompt('Change Email', 'Enter your new email address:', (newEmail) => {
          if (newEmail) setEmail(newEmail);
        })
      : Alert.alert('Change Email', 'Email editing enabled.');
  };

  const handleChangePhone = () => {
    Alert.prompt
      ? Alert.prompt('Change Phone', 'Enter your new phone number:', (newPhone) => {
          if (newPhone) setPhone(newPhone);
        })
      : Alert.alert('Change Phone', 'Phone editing enabled.');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header matching Screenshot */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile/personal-info'))}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft size={24} color={COLORS.heading} strokeWidth={2.4} />
        </Pressable>

        <Text style={styles.headerTitle}>Personal details</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 90 },
        ]}
      >
        {/* Brand Bars (3 Vertical Crimson Stripes matching Screenshot) */}
        <View style={styles.brandBarsRow}>
          <View style={styles.brandBar} />
          <View style={styles.brandBar} />
          <View style={styles.brandBar} />
        </View>

        {/* Input 1: First name* */}
        <View style={styles.inputGroup}>
          <Text style={styles.floatingLabel}>First name*</Text>
          <View style={styles.outlinedBox}>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
            />
          </View>
        </View>

        {/* Input 2: Last name* */}
        <View style={styles.inputGroup}>
          <Text style={styles.floatingLabel}>Last name*</Text>
          <View style={styles.outlinedBox}>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
            />
          </View>
        </View>

        {/* Input 3: Email address* */}
        <View style={styles.inputGroup}>
          <Text style={styles.floatingLabel}>Email address*</Text>
          <View style={styles.outlinedBox}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              style={styles.textInput}
            />
            <Pressable onPress={handleChangeEmail} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.changeActionText}>Change</Text>
            </Pressable>
          </View>
        </View>

        {/* Input 4: Phone number */}
        <View style={styles.inputGroup}>
          <Text style={styles.floatingLabel}>Phone number</Text>
          <View style={styles.outlinedBox}>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              style={styles.textInput}
            />
            <Pressable onPress={handleChangePhone} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.changeActionText}>Change</Text>
            </Pressable>
          </View>
        </View>

        {/* Input 5: Date of birth (optional) */}
        <View style={styles.inputGroup}>
          <Text style={styles.floatingLabel}>Date of birth (optional)</Text>
          <View style={styles.outlinedBox}>
            <TextInput
              value={dob}
              onChangeText={setDob}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
            />
            <Calendar size={18} color="#9CA3AF" strokeWidth={2} />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Button: Save Details */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleSaveDetails}
          accessibilityRole="button"
          accessibilityLabel="Save details"
        >
          <Text style={styles.saveButtonText}>Save details</Text>
        </Pressable>
      </View>
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
  brandBarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING.xl,
  },
  brandBar: {
    width: 14,
    height: 38,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  floatingLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  outlinedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 56,
    backgroundColor: COLORS.white,
  },
  textInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.heading,
  },
  changeActionText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  saveButton: {
    height: 52,
    backgroundColor: '#111827',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  saveButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
});
