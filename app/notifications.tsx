import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, Palette, Tag, CheckCheck } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';

interface NotificationItem {
  id: string;
  category: 'activities' | 'offers';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    category: 'activities',
    title: 'Sunday Family Oil Painting',
    message: 'Join us this Sunday 12:00 PM – 2:00 PM. Guided sketch sheets and paints provided for little ones!',
    time: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    category: 'offers',
    title: 'Free Delivery on Lakeview Cold Brew',
    message: 'Enjoy complimentary express delivery to East Kisumu & LBDA HQ on all cold brew orders today.',
    time: 'Yesterday',
    read: false,
  },
  {
    id: '3',
    category: 'activities',
    title: 'New Animal Sketches Available',
    message: 'We have added fresh safari animal outlines for the Sunday painting workshop!',
    time: '3 days ago',
    read: true,
  },
  {
    id: '4',
    category: 'offers',
    title: 'Weekend Brunch Special',
    message: 'Buttermilk pancake stacks with wildflower honey now available every Saturday and Sunday.',
    time: '4 days ago',
    read: true,
  },
];

const NOTIF_STORAGE_PREFIX = '@lpc_read_notifications_v1_';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'activities' | 'offers'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const storageKey = `${NOTIF_STORAGE_PREFIX}${user?.id || 'guest'}`;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (!mounted || !raw) return;
        const readIds: string[] = JSON.parse(raw);
        if (Array.isArray(readIds)) {
          setNotifications(
            INITIAL_NOTIFICATIONS.map((n) =>
              readIds.includes(n.id) ? { ...n, read: true } : n
            )
          );
        }
      } catch {
        // Ignore read error
      }
    })();
    return () => {
      mounted = false;
    };
  }, [storageKey]);

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'all') return true;
    return item.category === activeTab;
  });

  const handleMarkAllAsRead = async () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    try {
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(updated.map((n) => n.id))
      );
    } catch {
      // Ignore write error
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
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

        <Text style={styles.headerTitle}>Notifications</Text>

        <Pressable
          onPress={handleMarkAllAsRead}
          style={styles.readAllBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Mark all as read"
        >
          <CheckCheck size={20} color={COLORS.primary} strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* Category Filter Tabs: All | Activities | Offers & Promotional */}
      <View style={styles.tabsRow}>
        <Pressable
          onPress={() => setActiveTab('all')}
          style={[styles.tabPill, activeTab === 'all' && styles.tabPillActive]}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('activities')}
          style={[styles.tabPill, activeTab === 'activities' && styles.tabPillActive]}
        >
          <Text style={[styles.tabText, activeTab === 'activities' && styles.tabTextActive]}>
            Activities
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('offers')}
          style={[styles.tabPill, activeTab === 'offers' && styles.tabPillActive]}
        >
          <Text style={[styles.tabText, activeTab === 'offers' && styles.tabTextActive]}>
            Offers & Promo
          </Text>
        </Pressable>
      </View>

      {/* Notifications List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
      >
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((item) => (
            <View
              key={item.id}
              style={[styles.notificationCard, !item.read && styles.notificationCardUnread]}
            >
              <View
                style={[
                  styles.iconCircle,
                  item.category === 'activities' ? styles.iconCircleActivities : styles.iconCircleOffers,
                ]}
              >
                {item.category === 'activities' ? (
                  <Palette size={20} color="#07345F" strokeWidth={2.2} />
                ) : (
                  <Tag size={20} color="#075B35" strokeWidth={2.2} />
                )}
              </View>

              <View style={styles.contentCol}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {!item.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.itemMessage}>{item.message}</Text>
                <Text style={styles.itemTime}>{item.time}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Bell size={36} color="#9CA3AF" strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>
              You have no {activeTab === 'all' ? '' : activeTab} notifications right now.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
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
    fontSize: 17,
    color: COLORS.heading,
  },
  readAllBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
  },
  tabPillActive: {
    backgroundColor: COLORS.heading,
  },
  tabText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  notificationCardUnread: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    ...SHADOW.subtle,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  iconCircleActivities: {
    backgroundColor: '#D8E5FF',
  },
  iconCircleOffers: {
    backgroundColor: '#DCFCE7',
  },
  contentCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.heading,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 6,
  },
  itemMessage: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.bodyText,
    lineHeight: 17,
    marginBottom: 4,
  },
  itemTime: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.heading,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
