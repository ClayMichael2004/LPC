import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Receipt, ArrowRight, Clock } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { ordersApi } from '../../src/services/api';
import { useCart } from '../../src/context/CartContext';
import { useAuth } from '../../src/context/AuthContext';
import { Order } from '../../src/types';

export default function OrderHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { lastPlacedOrder } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let mounted = true;
    if (!isAuthenticated || !user?.id) {
      setOrders([]);
      return;
    }

    ordersApi
      .getMyOrders()
      .then((serverOrders) => {
        if (mounted && Array.isArray(serverOrders)) {
          // Strictly filter to orders owned by the currently authenticated user
          const ownedOrders = serverOrders.filter(
            (o) => !o.userId || o.userId === user.id
          );
          setOrders(ownedOrders);
        }
      })
      .catch(() => {
        if (mounted) {
          if (lastPlacedOrder && lastPlacedOrder.userId === user.id) {
            setOrders([lastPlacedOrder]);
          } else {
            setOrders([]);
          }
        }
      });

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user?.id, lastPlacedOrder]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Symmetrical Header */}
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

        <Text style={styles.headerTitle}>Order history</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          orders.length > 0 && styles.scrollContentList,
        ]}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.iconCircle}>
              <Receipt size={42} color="#9CA3AF" strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>No past orders currently</Text>
            <Text style={styles.emptySubtitle}>
              When you place orders for Little Polo cold brews, burgers, or brunch, your receipts will appear here.
            </Text>

            <Pressable
              style={styles.exploreButton}
              onPress={() => router.push('/(tabs)/menu')}
              accessibilityRole="button"
              accessibilityLabel="Explore Menu"
            >
              <Text style={styles.exploreButtonText}>Explore Menu</Text>
              <ArrowRight size={18} color={COLORS.white} strokeWidth={2.2} style={styles.btnArrow} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {orders.map((order) => (
              <Pressable
                key={order.id}
                style={styles.orderCard}
                onPress={() =>
                  router.push({
                    pathname: '/checkout/confirmation',
                    params: { orderId: order.id },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`View order ${order.id}`}
              >
                <View style={styles.orderHeaderRow}>
                  <Text style={styles.orderIdText}>Order #{order.id}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{order.status}</Text>
                  </View>
                </View>

                <Text style={styles.orderItemsText} numberOfLines={2}>
                  {(order.items || [])
                    .map((i) => `${i.quantity}× ${i.productName}`)
                    .join(', ')}
                </Text>

                <View style={styles.orderFooterRow}>
                  <View style={styles.orderMetaRow}>
                    <Clock size={14} color={COLORS.textSecondary} />
                    <Text style={styles.orderAddressText}>
                      {order.deliveryInfo?.addressName || 'East Kisumu'}
                    </Text>
                  </View>
                  <Text style={styles.orderTotalText}>
                    KSh {Number(order.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </Pressable>
            ))}
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
    height: 52,
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
    fontSize: 16,
    color: COLORS.heading,
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: 60,
  },
  scrollContentList: {
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingTop: SPACING.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    maxWidth: 320,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.heading,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: SPACING.xl,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    ...SHADOW.soft,
  },
  exploreButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
  btnArrow: {
    marginLeft: 8,
  },
  ordersList: {
    gap: SPACING.md,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    padding: SPACING.md,
    ...SHADOW.soft,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderIdText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.heading,
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  statusBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#075B35',
  },
  orderItemsText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  orderFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  orderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  orderAddressText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  orderTotalText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.heading,
  },
});
