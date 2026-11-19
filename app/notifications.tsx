import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Bell,
  Palette,
  Tag,
  CheckCheck,
  UserPlus,
  ShoppingBag,
  Megaphone,
  Sparkles,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { adminApi, notificationsApi } from '../src/services/api';
import { AdminNotification } from '../src/types';

interface CustomerNotificationItem {
  id: string;
  category: 'activities' | 'offers';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const INITIAL_CUSTOMER_NOTIFICATIONS: CustomerNotificationItem[] = [
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
  const isAdmin = user?.role === 'admin';

  // Customer State
  const [customerTab, setCustomerTab] = useState<'all' | 'activities' | 'offers'>('all');
  const [customerNotifications, setCustomerNotifications] = useState<CustomerNotificationItem[]>(
    INITIAL_CUSTOMER_NOTIFICATIONS
  );

  // Admin State
  const [adminTab, setAdminTab] = useState<'all' | 'registration' | 'order' | 'broadcast'>('all');
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [loadingAdminNotifs, setLoadingAdminNotifs] = useState(false);

  const storageKey = `${NOTIF_STORAGE_PREFIX}${user?.id || 'guest'}`;

  const formatTimeAgo = (isoString?: string): string => {
    if (!isoString) return 'Recently';
    try {
      const diff = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const fetchCustomerNotifications = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      const readIds: string[] = raw ? JSON.parse(raw) : [];

      const data = await notificationsApi.getCustomerNotifications();
      if (Array.isArray(data) && data.length > 0) {
        const formatted: CustomerNotificationItem[] = data.map((item: any) => ({
          id: item.id,
          category: item.category === 'activities' ? 'activities' : 'offers',
          title: item.title,
          message: item.message,
          time: formatTimeAgo(item.timestamp),
          read: item.read || readIds.includes(item.id),
        }));
        setCustomerNotifications(formatted);
        return;
      }
    } catch {
      // Fallback to local storage if offline
    }

    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) return;
      const readIds: string[] = JSON.parse(raw);
      if (Array.isArray(readIds)) {
        setCustomerNotifications(
          INITIAL_CUSTOMER_NOTIFICATIONS.map((n) =>
            readIds.includes(n.id) ? { ...n, read: true } : n
          )
        );
      }
    } catch {
      // Ignore
    }
  }, [storageKey]);

  // Fetch admin operational notifications
  const fetchAdminNotifications = useCallback(async () => {
    setLoadingAdminNotifs(true);
    try {
      const data = await adminApi.getNotifications();
      if (Array.isArray(data)) {
        setAdminNotifications(data);
      }
    } catch {
      // Fallback seed notifications if offline
      setAdminNotifications([
        {
          id: 'admin-seed-1',
          type: 'registration',
          title: 'New Customer Registered',
          message: 'Welcome Michael Ochieng to Little Polo Cafe app.',
          timestamp: new Date().toISOString(),
          read: false,
        },
        {
          id: 'admin-seed-2',
          type: 'broadcast',
          title: 'Broadcast Dispatched',
          message: 'Email announcement delivered to 18 opted-in subscribers.',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: true,
        },
      ]);
    } finally {
      setLoadingAdminNotifs(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminNotifications();
    } else {
      fetchCustomerNotifications();
    }
  }, [isAdmin, fetchCustomerNotifications, fetchAdminNotifications]);

  const handleMarkAllAsRead = async () => {
    if (isAdmin) {
      const updated = adminNotifications.map((n) => ({ ...n, read: true }));
      setAdminNotifications(updated);
      // Mark read on backend
      adminNotifications.forEach((n) => {
        if (!n.read) {
          adminApi.markNotificationRead(n.id).catch(() => {});
        }
      });
    } else {
      const updated = customerNotifications.map((n) => ({ ...n, read: true }));
      setCustomerNotifications(updated);
      try {
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify(updated.map((n) => n.id))
        );
      } catch {
        // Ignore write error
      }
    }
  };

  const handleMarkSingleAdminRead = (item: AdminNotification) => {
    if (item.read) return;
    setAdminNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    adminApi.markNotificationRead(item.id).catch(() => {});
  };

  const formatAdminTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  // Filtered lists
  const filteredCustomerNotifs = customerNotifications.filter((item) => {
    if (customerTab === 'all') return true;
    return item.category === customerTab;
  });

  const filteredAdminNotifs = adminNotifications.filter((item) => {
    if (adminTab === 'all') return true;
    return item.type === adminTab;
  });

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

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>
            {isAdmin ? 'System Notifications' : 'Notifications'}
          </Text>
          {isAdmin && (
            <Text style={styles.headerSubtitle}>Operational Activity Logs</Text>
          )}
        </View>

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

      {/* Tabs Row */}
      {isAdmin ? (
        <View style={styles.tabsRow}>
          {(['all', 'registration', 'order', 'broadcast'] as const).map((tab) => {
            const labels: Record<string, string> = {
              all: 'All Logs',
              registration: 'Registrations',
              order: 'Orders',
              broadcast: 'Broadcasts',
            };
            const isActive = adminTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setAdminTab(tab)}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {labels[tab]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => setCustomerTab('all')}
            style={[styles.tabPill, customerTab === 'all' && styles.tabPillActive]}
          >
            <Text style={[styles.tabText, customerTab === 'all' && styles.tabTextActive]}>
              All
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setCustomerTab('activities')}
            style={[styles.tabPill, customerTab === 'activities' && styles.tabPillActive]}
          >
            <Text style={[styles.tabText, customerTab === 'activities' && styles.tabTextActive]}>
              Activities
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setCustomerTab('offers')}
            style={[styles.tabPill, customerTab === 'offers' && styles.tabPillActive]}
          >
            <Text style={[styles.tabText, customerTab === 'offers' && styles.tabTextActive]}>
              Offers & Promo
            </Text>
          </Pressable>
        </View>
      )}

      {/* Content ScrollView */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
      >
        {isAdmin ? (
          // Admin Operational Notifications
          loadingAdminNotifs ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Fetching system logs...</Text>
            </View>
          ) : filteredAdminNotifs.length > 0 ? (
            filteredAdminNotifs.map((item) => {
              // Otto Mobile pastel tints & contrasting icons
              let iconEl = <Sparkles size={20} color="#4C1D95" strokeWidth={2.2} />;
              let circleBg = '#E5D9FF';

              if (item.type === 'registration') {
                iconEl = <UserPlus size={20} color="#075B35" strokeWidth={2.2} />;
                circleBg = '#DCFCE7';
              } else if (item.type === 'order') {
                iconEl = <ShoppingBag size={20} color="#07345F" strokeWidth={2.2} />;
                circleBg = '#DBEAFE';
              } else if (item.type === 'broadcast') {
                iconEl = <Megaphone size={20} color="#691414" strokeWidth={2.2} />;
                circleBg = '#FCE7F3';
              }

              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.notificationCard,
                    !item.read && styles.notificationCardUnread,
                  ]}
                  onPress={() => handleMarkSingleAdminRead(item)}
                >
                  <View style={[styles.iconCircle, { backgroundColor: circleBg }]}>
                    {iconEl}
                  </View>

                  <View style={styles.contentCol}>
                    <View style={styles.titleRow}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      {!item.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.itemMessage}>{item.message}</Text>
                    <Text style={styles.itemTime}>
                      {formatAdminTimestamp(item.timestamp)}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Bell size={36} color="#9CA3AF" strokeWidth={1.8} />
              </View>
              <Text style={styles.emptyTitle}>No operational alerts</Text>
              <Text style={styles.emptySubtitle}>
                New customer registrations, dispatched orders, and broadcast logs will appear here.
              </Text>
            </View>
          )
        ) : (
          // Customer Notifications
          filteredCustomerNotifs.length > 0 ? (
            filteredCustomerNotifs.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.notificationCard,
                  !item.read && styles.notificationCardUnread,
                ]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    item.category === 'activities'
                      ? styles.iconCircleActivities
                      : styles.iconCircleOffers,
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
                You have no {customerTab === 'all' ? '' : customerTab} notifications right now.
              </Text>
            </View>
          )
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
    height: 56,
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
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.heading,
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
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
    paddingVertical: SPACING.sm,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: '#FAFAFA',
  },
  tabPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    backgroundColor: 'transparent',
  },
  tabPillActive: {
    backgroundColor: COLORS.heading,
  },
  tabText: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  scrollContent: {
    paddingTop: SPACING.md,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  notificationCard: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
  },
  notificationCardUnread: {
    backgroundColor: '#FAFAF9',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  iconCircleActivities: {
    backgroundColor: COLORS.serviceBlueTint,
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
    marginBottom: 4,
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
    backgroundColor: '#EF4444',
    marginLeft: 6,
  },
  itemMessage: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 6,
  },
  itemTime: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.heading,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
