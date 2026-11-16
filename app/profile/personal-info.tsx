import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle2 } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import FeedbackModal from '../../src/components/FeedbackModal';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const displayName = user?.name || 'Michael Clay';
  const displayInitials = user?.initials || 'MC';
  const displayEmail = user?.email || 'michaelclay2225@gmail.com';
  const displayPhone = user?.phone || '—';
  const displayDob = user?.dob || '—';

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = () => {
    setShowDeleteModal(false);
    signOut();
    router.replace('/(tabs)/home');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Symmetrical Header matching Screenshot */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft size={24} color={COLORS.heading} strokeWidth={2.4} />
        </Pressable>

        <Text style={styles.headerTitle}>Personal information</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 90 },
        ]}
      >
        {/* Little Polo Logo */}
        <View style={styles.brandLogoRow}>
          <Image
            source={require('../../assets/images/little-polo-logo.png')}
            style={styles.brandLogoImage}
            resizeMode="contain"
          />
        </View>

        {/* Section Heading */}
        <Text style={styles.sectionHeader}>YOUR PERSONAL INFORMATION</Text>

        {/* Avatar & User Name Row */}
        <View style={styles.avatarRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{displayInitials}</Text>
          </View>
          <Text style={styles.userNameText}>{displayName}</Text>
        </View>

        {/* Details List */}
        <View style={styles.detailsList}>
          {/* Row 1: Name */}
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{displayName}</Text>
          </View>

          <View style={styles.divider} />

          {/* Row 2: Phone number */}
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Phone number</Text>
            <Text style={styles.detailValue}>{displayPhone}</Text>
          </View>

          <View style={styles.divider} />

          {/* Row 3: Email (with Green Checkmark) */}
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Email</Text>
            <View style={styles.emailValueRow}>
              <Text style={styles.detailValue}>{displayEmail}</Text>
              <CheckCircle2 size={18} color="#10B981" strokeWidth={2.2} style={styles.checkIcon} />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 4: Date of birth */}
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Date of birth</Text>
            <Text style={styles.detailValue}>{displayDob}</Text>
          </View>
        </View>

        {/* Delete Account Link */}
        <View style={styles.deleteAccountWrapper}>
          <Pressable onPress={handleDeleteAccount} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Button: Edit Personal Information */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.editButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.push('/profile/edit-details')}
          accessibilityRole="button"
          accessibilityLabel="Edit personal information"
        >
          <Text style={styles.editButtonText}>Edit personal information</Text>
        </Pressable>
      </View>

      {/* Modern In-App Delete Confirmation Modal */}
      <FeedbackModal
        visible={showDeleteModal}
        type="confirm"
        destructive
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone."
        primaryText="Delete"
        onPrimaryPress={confirmDeleteAccount}
        secondaryText="Cancel"
        onSecondaryPress={() => setShowDeleteModal(false)}
      />
    </View>
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
  brandLogoRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  brandLogoImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  sectionHeader: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.heading,
    letterSpacing: 0.5,
    marginBottom: SPACING.lg,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  avatarText: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  userNameText: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.heading,
    letterSpacing: -0.5,
  },
  detailsList: {
    gap: 4,
    marginBottom: SPACING.xxxl,
  },
  detailItem: {
    paddingVertical: 10,
  },
  detailLabel: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.heading,
    marginBottom: 4,
  },
  detailValue: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.bodyText,
  },
  emailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkIcon: {
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  deleteAccountWrapper: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  deleteAccountText: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: '#111827',
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
  editButton: {
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
  editButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
});
