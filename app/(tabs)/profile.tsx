import React, { useState, useEffect } from 'react';
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
  Megaphone,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { adminApi, notificationsApi } from '../../src/services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut, isAuthenticated, showSignInModal } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    if (isAdmin) {
      adminApi
        .getNotifications()
        .then((list) => {
          if (Array.isArray(list)) {
            setUnreadNotifs(list.filter((n) => !n.read).length);
          }
        })
        .catch(() => {});
    } else {
      notificationsApi
        .getCustomerNotifications()
        .then((list) => {
          if (Array.isArray(list)) {
            setUnreadNotifs(list.filter((n) => !n.read).length);
          }
        })
        .catch(() => {});
    }
  }, [isAdmin]);

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 }]}
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
              onPress={() => router.push('/profile/personal-info')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Edit personal info"
            >
              <Text style={styles.editInfoText}>Edit personal info</Text>
              <Pencil size={13} color={COLORS.heading} strokeWidth={2.4} style={styles.editIcon} />
            </Pressable>
          </View>

          {/* Bell Icon with operational notification indicator for admin */}
          <Pressable
            style={styles.bellBtn}
            onPress={() => router.push('/notifications')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={24} color={COLORS.heading} strokeWidth={2} />
            {unreadNotifs > 0 && (
              <View style={styles.bellBadgeDot} />
            )}
          </Pressable>
        </View>

        {/* Card 1: Communications (Admin) or Order history (Customer) & Communication preferences */}
        <View style={styles.groupCard}>
          {/* Row 1: Communications for Admin, Order history for Customer */}
          {isAdmin ? (
            <Pressable
              style={styles.menuRow}
              onPress={() => router.push('/profile/communication-hub')}
              accessibilityRole="button"
              accessibilityLabel="Communications"
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconCircle}>
                  <Megaphone size={20} color={COLORS.primary} strokeWidth={2.2} />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Communications</Text>
                  <Text style={styles.rowSubtitle}>Broadcast announcements to customers</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#6B7280" strokeWidth={2} />
            </Pressable>
          ) : (
            <Pressable
              style={styles.menuRow}
              onPress={() => router.push('/profile/orders')}
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
          )}

          <View style={styles.rowDivider} />

          {/* Row 2: Communication preferences */}
          <Pressable
            style={styles.menuRow}
            onPress={() => router.push('/profile/communication')}
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
              onPress={() => router.push('/auth/login')}
              style={styles.menuRow}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconCircle}>
                  <LogOut size={20} color={COLORS.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.rowTitle}>Sign in</Text>
              </View>
              <ChevronRight size={20} color="#6B7280" strokeWidth={2} />
            </Pressable>
          )}
        </View>

        {/* Footer Brand Info */}
        <View style={styles.footerBox}>
          <Text style={styles.copyrightText}>Little Polo Cafe</Text>
          <Text style={styles.versionText}>
            {isAdmin ? 'Admin Management Mode · v1.0.0' : 'Artisanal Cafe & Bakery · v1.0.0'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    ...SHADOW.soft,
  },
  avatarCircleGuest: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  avatarLogoImage: {
    width: 38,
    height: 38,
  },
  avatarText: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.white,
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
    position: 'relative',
  },
  bellBadgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
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
    flex: 1,
  },
  iconCircle: {
    marginRight: SPACING.md,
  },
  rowTitle: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.heading,
  },
  rowSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
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
