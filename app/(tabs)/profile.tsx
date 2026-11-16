import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Clock,
  Smartphone,
  LogOut,
  ChevronRight,
  Bell,
  Pencil,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut, isAuthenticated, showSignInModal } = useAuth();

  const displayName = isAuthenticated && user ? user.name : 'Guest';
  const displayInitials = isAuthenticated && user ? user.initials : 'LP';

  const handleSignOut = () => {
    signOut();
    router.replace('/(tabs)/home');
  };

  const handleSignIn = () => {
    showSignInModal('nav');
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
      >
        {/* Header: Avatar, Hi Michael!, Edit personal info, Bell */}
        <View style={styles.headerRow}>
          {/* Avatar Circle with initials or Brand Logo */}
          <View style={[styles.avatarCircle, !isAuthenticated && styles.avatarCircleGuest]}>
            {isAuthenticated ? (
              <Text style={styles.avatarText}>{displayInitials}</Text>
            ) : (
              <Image
                source={require('../../assets/images/little-polo-logo.png')}
                style={styles.avatarLogoImage}
                resizeMode="cover"
              />
            )}
          </View>

          {/* User Name & Edit Info */}
          <View style={styles.userInfoCol}>
            <Text style={styles.greetingText}>Hi {displayName}!</Text>
            <Pressable
              style={styles.editInfoBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.editInfoText}>Edit personal info</Text>
              <Pencil size={13} color={COLORS.heading} strokeWidth={2.4} style={styles.editIcon} />
            </Pressable>
          </View>

          {/* Bell Icon */}
          <Pressable
            style={styles.bellBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={24} color={COLORS.heading} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Card 1: Order history & Communication preferences */}
        <View style={styles.groupCard}>
          {/* Row 1: Order history */}
          <Pressable
            style={styles.menuRow}
            accessibilityRole="button"
            accessibilityLabel="Order history"
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <Clock size={20} color={COLORS.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.rowTitle}>Order history</Text>
            </View>
            <ChevronRight size={20} color="#6B7280" strokeWidth={2} />
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Row 2: Communication preferences */}
          <Pressable
            style={styles.menuRow}
            accessibilityRole="button"
            accessibilityLabel="Communication preferences"
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <Smartphone size={20} color={COLORS.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.rowTitle}>Communication preferences</Text>
            </View>
            <ChevronRight size={20} color="#6B7280" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Card 2: Sign out / Sign in */}
        <View style={styles.groupCard}>
          {isAuthenticated ? (
            <Pressable
              onPress={handleSignOut}
              style={styles.menuRow}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconCircle}>
                  <LogOut size={20} color={COLORS.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.rowTitle}>Sign out</Text>
              </View>
              <ChevronRight size={20} color="#6B7280" strokeWidth={2} />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSignIn}
              style={styles.menuRow}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconCircle}>
                  <LogOut size={20} color={COLORS.primary} strokeWidth={2.2} style={{ transform: [{ rotate: '180deg' }] }} />
                </View>
                <Text style={styles.rowTitle}>Sign in to your account</Text>
              </View>
              <ChevronRight size={20} color="#6B7280" strokeWidth={2} />
            </Pressable>
          )}
        </View>

        {/* Footer Brand Copyright */}
        <View style={styles.footerBox}>
          <Text style={styles.copyrightText}>Copyright © Little Polo Cafe. 2026</Text>
          <Text style={styles.versionText}>v1.0.0 (282)</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    paddingTop: SPACING.sm,
  },
  avatarCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    overflow: 'hidden',
  },
  avatarCircleGuest: {
    backgroundColor: '#F3F4F6',
  },
  avatarLogoImage: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  avatarText: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  userInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  greetingText: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.heading,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  editInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editInfoText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.heading,
    textDecorationLine: 'underline',
  },
  editIcon: {
    marginLeft: 4,
  },
  bellBtn: {
    padding: 6,
  },
  groupCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: SPACING.lg,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    marginRight: SPACING.md,
  },
  rowTitle: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.heading,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: SPACING.lg,
  },
  footerBox: {
    alignItems: 'center',
    marginTop: SPACING.xxxl,
    gap: 4,
  },
  copyrightText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.heading,
  },
  versionText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
