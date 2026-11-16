import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Minus, Plus, ShoppingBag } from 'lucide-react-native';
import AppHeader from '../../src/components/AppHeader';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useCart } from '../../src/context/CartContext';
import { useAuth } from '../../src/context/AuthContext';

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, incrementItem, decrementItem, subtotal, totalCount } = useCart();
  const { isAuthenticated, showSignInModal } = useAuth();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      showSignInModal('checkout');
    } else {
      router.push('/checkout/delivery');
    }
  };

  const handleBackToMenu = () => {
    router.navigate('/(tabs)/menu');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader />

      {/* Cart Subheader */}
      <View style={styles.cartSubheader}>
        <Pressable
          onPress={handleBackToMenu}
          style={styles.backChevronBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back to menu"
        >
          <ChevronLeft size={24} color={COLORS.heading} strokeWidth={2.4} />
        </Pressable>
        <View style={styles.subheaderTitleGroup}>
          <Text style={styles.subheaderTitle}>Your cart</Text>
          <Text style={styles.subheaderSubtitle}>
            {totalCount} {totalCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>

      {items.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 170 }]}
        >
          {/* Cart Item Cards */}
          <View style={styles.itemsList}>
            {items.map((item) => (
              <View key={item.cartItemId} style={styles.itemCard}>
                <View style={styles.itemImageWrapper}>
                  <Image
                    source={item.product.image}
                    style={styles.itemImage}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.product.name}</Text>
                  {item.selectedOption ? (
                    <Text style={styles.itemOption}>{item.selectedOption.name}</Text>
                  ) : null}
                  <Text style={styles.itemPrice}>
                    KSh {item.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>

                {/* Circular Stepper (- QTY +) */}
                <View style={styles.stepperWrapper}>
                  <Pressable
                    onPress={() => decrementItem(item.cartItemId)}
                    style={styles.circleStepBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease quantity"
                  >
                    <Minus size={16} color={COLORS.primary} strokeWidth={2.5} />
                  </Pressable>

                  <Text style={styles.qtyText}>{item.quantity}</Text>

                  <Pressable
                    onPress={() => incrementItem(item.cartItemId)}
                    style={styles.circleStepBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel="Increase quantity"
                  >
                    <Plus size={16} color={COLORS.primary} strokeWidth={2.5} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          {/* Subtotal & Total Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                KSh {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                KSh {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <ShoppingBag size={38} color="#9CA3AF" strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Add some artisan coffee or delicious burgers to get started.
          </Text>
          <Pressable
            onPress={handleBackToMenu}
            style={styles.exploreButton}
            accessibilityRole="button"
            accessibilityLabel="Explore Menu"
          >
            <Text style={styles.exploreButtonText}>Explore Menu</Text>
          </Pressable>
        </View>
      )}

      {/* Bottom Floating Checkout Action Button */}
      {items.length > 0 && (
        <View style={[styles.bottomBarWrapper, { bottom: Math.max(insets.bottom, 12) + 68 }]}>
          <Pressable
            onPress={handleCheckout}
            style={({ pressed }) => [
              styles.checkoutButton,
              pressed && styles.checkoutButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Checkout KSh ${subtotal.toLocaleString()}`}
          >
            <Text style={styles.checkoutText}>Checkout</Text>
            <Text style={styles.checkoutPrice}>
              KSh {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  cartSubheader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backChevronBtn: {
    paddingRight: SPACING.md,
  },
  subheaderTitleGroup: {
    justifyContent: 'center',
  },
  subheaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.heading,
  },
  subheaderSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  itemsList: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    padding: SPACING.md,
    ...SHADOW.soft,
  },
  itemImageWrapper: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.heading,
    marginBottom: 2,
  },
  itemOption: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  itemPrice: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.heading,
  },
  stepperWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleStepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  qtyText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.heading,
    minWidth: 16,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOW.soft,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: SPACING.md,
  },
  totalLabel: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.heading,
  },
  totalValue: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.heading,
  },
  bottomBarWrapper: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 90,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 54,
    backgroundColor: '#18181B',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xl,
    ...SHADOW.soft,
  },
  checkoutButtonPressed: {
    backgroundColor: '#27272A',
  },
  checkoutText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.white,
  },
  checkoutPrice: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.white,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxxl,
    marginTop: 40,
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
    fontSize: 20,
    color: COLORS.heading,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  exploreButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: RADIUS.full,
  },
  exploreButtonText: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.white,
  },
});
