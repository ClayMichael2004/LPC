import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronUp, ChevronDown, Smartphone, CreditCard } from 'lucide-react-native';
import ScreenHeader from '../../src/components/ScreenHeader';
import Accordion from '../../src/components/Accordion';
import FeedbackModal from '../../src/components/FeedbackModal';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useCart } from '../../src/context/CartContext';
import { useLocation } from '../../src/context/LocationContext';
import { ordersApi, generateIdempotencyKey, ApiError } from '../../src/services/api';

export default function CheckoutPaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, subtotal, deliveryFee, vat, total, clearCart, setLastPlacedOrder } = useCart();
  const { deliveryInfo, locationName } = useLocation();
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey());

  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card' | null>('mpesa');
  const [isWorkOrder, setIsWorkOrder] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);

  // M-Pesa STK Push simulation state
  const [stkModalVisible, setStkModalVisible] = useState(false);
  const [stkState, setStkState] = useState<'prompting' | 'processing' | 'success'>('prompting');
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const displayItems = items.length > 0 ? items : [
    {
      cartItemId: 'mock-1',
      product: { id: 'streetwise-3-crunch', name: 'Streetwise 3 Crunch', price: 650, category: 'for-me', image: null },
      quantity: 1,
      unitPrice: 650,
      totalPrice: 650,
    },
    {
      cartItemId: 'mock-2',
      product: { id: '2l-soda', name: '2L Soda', price: 350, category: 'drinks', image: null },
      selectedOption: { id: 'coke', name: 'Coke' },
      quantity: 2,
      unitPrice: 350,
      totalPrice: 700,
    },
  ];

  const displaySubtotal = subtotal > 0 ? subtotal : 1350;
  const displayFee = deliveryFee > 0 ? deliveryFee : 150;
  const displayVat = vat > 0 ? vat : 206.90;
  const displayTotal = total > 0 ? total : 1500;
  const totalItemCount = items.length > 0 ? items.reduce((s, i) => s + i.quantity, 0) : 3;

  const submitOrderToBackend = async () => {
    const orderItems = displayItems.map((item) => ({
      productId: item.product.id,
      optionId: item.selectedOption?.id,
      quantity: item.quantity,
    }));

    const finalDeliveryInfo = {
      addressName: deliveryInfo?.addressName || locationName || 'East Kisumu',
      landmark: deliveryInfo?.landmark || 'Near LBDA HQ',
      estateBuilding: deliveryInfo?.estateBuilding || '',
      deliveryInstructions: deliveryInfo?.deliveryInstructions || '',
      phone: deliveryInfo?.phone || '+254 712 345 678',
      saveAddress: deliveryInfo?.saveAddress ?? true,
    };

    try {
      const createdOrder = await ordersApi.createOrder(
        {
          items: orderItems,
          deliveryInfo: finalDeliveryInfo,
          paymentMethod: paymentMethod || 'mpesa',
          workOrderNotes: isWorkOrder ? 'Work Order Receipt Requested' : undefined,
        },
        idempotencyKeyRef.current
      );
      setLastPlacedOrder(createdOrder);
      return createdOrder;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        throw err;
      }
      // Offline / unauthenticated guest fallback order
      return null;
    }
  };

  const handlePay = async () => {
    if (!paymentMethod) return;

    if (paymentMethod === 'mpesa') {
      setStkModalVisible(true);
      setStkState('prompting');

      setTimeout(async () => {
        setStkState('processing');
        try {
          const created = await submitOrderToBackend();
          setTimeout(() => {
            setStkState('success');
            setTimeout(() => {
              setStkModalVisible(false);
              clearCart();
              router.replace({
                pathname: '/checkout/confirmation',
                params: { orderId: created?.id || 'LPC-8924' },
              });
            }, 1000);
          }, 1200);
        } catch (err: any) {
          setStkModalVisible(false);
          setErrorModal({
            visible: true,
            title: 'Item Out of Stock',
            message: err?.message || 'One or more items in your cart are currently unavailable.',
          });
        }
      }, 1200);
    } else {
      try {
        const created = await submitOrderToBackend();
        clearCart();
        router.replace({
          pathname: '/checkout/confirmation',
          params: { orderId: created?.id || 'LPC-8924' },
        });
      } catch (err: any) {
        setErrorModal({
          visible: true,
          title: 'Item Out of Stock',
          message: err?.message || 'One or more items in your cart are currently unavailable.',
        });
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}>
      <ScreenHeader title="Checkout" />

      {/* Step Tabs: 1 DELIVERY / 2 PAYMENT (Active) */}
      <View style={styles.stepTabsRow}>
        <Pressable onPress={() => router.back()} style={styles.stepTabInactive}>
          <Text style={styles.stepTabTextInactive}>1 · DELIVERY</Text>
          <View style={styles.stepIndicatorInactive} />
        </Pressable>

        <View style={styles.stepTabActive}>
          <Text style={styles.stepTabTextActive}>2 · PAYMENT</Text>
          <View style={styles.stepIndicatorActive} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
      >
        {/* Delivering to East Kisumu Card */}
        <View style={styles.deliveringCard}>
          <View style={styles.deliveringInfo}>
            <Text style={styles.deliveringLabel}>Delivering to</Text>
            <Text style={styles.deliveringValue}>East Kisumu</Text>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}>
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        </View>

        {/* Order Summary Accordion Card */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionHeading}>Order summary</Text>

          <View style={styles.summaryCard}>
            <Pressable
              onPress={() => setIsSummaryExpanded((prev) => !prev)}
              style={styles.summaryHeader}
              accessibilityRole="button"
              accessibilityLabel="Toggle order summary"
            >
              <Text style={styles.itemsCountHeader}>
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </Text>
              {isSummaryExpanded ? (
                <ChevronUp size={20} color={COLORS.heading} strokeWidth={2.4} />
              ) : (
                <ChevronDown size={20} color={COLORS.heading} strokeWidth={2.4} />
              )}
            </Pressable>

            {isSummaryExpanded && (
              <View style={styles.summaryBody}>
                {displayItems.map((item) => (
                  <View key={item.cartItemId} style={styles.summaryItemRow}>
                    <Text style={styles.itemTitle}>
                      {item.quantity}×  {item.product.name}
                    </Text>
                    <Text style={styles.itemPrice}>
                      KSh {item.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                ))}

                <View style={styles.summaryItemRow}>
                  <Text style={styles.metaLabel}>Delivery fee</Text>
                  <Text style={styles.metaPrice}>
                    KSh {displayFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={styles.summaryItemRow}>
                  <Text style={styles.vatLabel}>Includes VAT</Text>
                  <Text style={styles.vatPrice}>
                    KSh {displayVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.totalRow}>
                  <Text style={styles.totalTitle}>Total</Text>
                  <Text style={styles.totalAmount}>
                    KSh {displayTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Payment Method Section */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionHeading}>Payment method</Text>

          <View style={styles.paymentMethodsCard}>
            {/* M-PESA Option */}
            <Pressable
              onPress={() => setPaymentMethod('mpesa')}
              style={styles.paymentOptionRow}
              accessibilityRole="radio"
              accessibilityState={{ checked: paymentMethod === 'mpesa' }}
            >
              <View style={styles.paymentOptionLeft}>
                <Text style={styles.paymentOptionTitle}>M-PESA</Text>
                <View style={styles.mpesaBadge}>
                  <Text style={styles.mpesaTextGreen}>m-</Text>
                  <Text style={styles.mpesaTextRed}>pesa</Text>
                </View>
              </View>

              <View style={[styles.radioCircle, paymentMethod === 'mpesa' && styles.radioCircleSelected]}>
                {paymentMethod === 'mpesa' && <View style={styles.radioInnerDot} />}
              </View>
            </Pressable>

            <View style={styles.optionDivider} />

            {/* Card Payment Option */}
            <Pressable
              onPress={() => setPaymentMethod('card')}
              style={styles.paymentOptionRow}
              accessibilityRole="radio"
              accessibilityState={{ checked: paymentMethod === 'card' }}
            >
              <View style={styles.paymentOptionLeft}>
                <Text style={styles.paymentOptionTitle}>Card Payment</Text>
                <View style={styles.cardsLogoRow}>
                  <Text style={styles.visaBadge}>VISA</Text>
                  <View style={styles.mastercardBadge}>
                    <View style={styles.mastercardCircleRed} />
                    <View style={styles.mastercardCircleYellow} />
                  </View>
                </View>
              </View>

              <View style={[styles.radioCircle, paymentMethod === 'card' && styles.radioCircleSelected]}>
                {paymentMethod === 'card' && <View style={styles.radioInnerDot} />}
              </View>
            </Pressable>
          </View>
        </View>

        {/* Type of order Section */}
        <View style={styles.orderTypeSection}>
          <Text style={styles.sectionHeading}>Type of order</Text>

          <View style={styles.workOrderCard}>
            <Text style={styles.workOrderTitle}>Is this a work order?</Text>
            <Switch
              value={isWorkOrder}
              onValueChange={setIsWorkOrder}
              trackColor={{ false: '#E5E7EB', true: '#18181B' }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Payment Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <Pressable
          onPress={handlePay}
          disabled={!paymentMethod}
          style={({ pressed }) => [
            styles.payButton,
            !paymentMethod && styles.payButtonDisabled,
            pressed && styles.payButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            paymentMethod === 'mpesa'
              ? `Pay KSh ${displayTotal.toLocaleString()} with M-PESA`
              : 'Select a payment method'
          }
        >
          <Text style={styles.payButtonText}>
            {paymentMethod === 'mpesa'
              ? `Pay KSh ${displayTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} with M-PESA`
              : paymentMethod === 'card'
              ? `Pay KSh ${displayTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} with Card`
              : 'Select a payment method'}
          </Text>
        </Pressable>
      </View>

      {/* Realistic M-PESA STK Push Simulation Modal */}
      <Modal visible={stkModalVisible} transparent animationType="fade">
        <View style={styles.stkBackdrop}>
          <View style={styles.stkCard}>
            <View style={styles.stkBadgeWrapper}>
              <Smartphone size={32} color="#059669" strokeWidth={2.2} />
            </View>

            <Text style={styles.stkTitle}>M-PESA STK Push Sent</Text>
            <Text style={styles.stkPhone}>{deliveryInfo.phone ? `+254 ${deliveryInfo.phone}` : '+254 712 345 678'}</Text>

            {stkState === 'prompting' && (
              <View style={styles.stkStatusGroup}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.stkStatusText}>Check your handset and enter your PIN...</Text>
              </View>
            )}

            {stkState === 'processing' && (
              <View style={styles.stkStatusGroup}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.stkStatusText}>Confirming transaction with Safaricom...</Text>
              </View>
            )}

            {stkState === 'success' && (
              <View style={styles.stkSuccessGroup}>
                <Check size={28} color="#059669" strokeWidth={3} />
                <Text style={styles.stkSuccessText}>Payment Confirmed!</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <FeedbackModal
        visible={errorModal.visible}
        type="error"
        title={errorModal.title}
        message={errorModal.message}
        onPrimaryPress={() => setErrorModal((s) => ({ ...s, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  stepTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: SPACING.lg,
  },
  stepTabInactive: {
    flex: 1,
    paddingVertical: 12,
    position: 'relative',
    alignItems: 'flex-start',
  },
  stepTabTextInactive: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  stepIndicatorInactive: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 16,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  stepTabActive: {
    flex: 1,
    paddingVertical: 12,
    position: 'relative',
    alignItems: 'flex-end',
  },
  stepTabTextActive: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.heading,
    letterSpacing: 0.5,
  },
  stepIndicatorActive: {
    position: 'absolute',
    bottom: -1,
    left: 16,
    right: 0,
    height: 3,
    backgroundColor: '#18181B',
    borderRadius: 1.5,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  deliveringCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.xl,
    ...SHADOW.soft,
  },
  deliveringInfo: {
    flex: 1,
  },
  deliveringLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  deliveringValue: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.heading,
  },
  editText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.heading,
  },
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.heading,
    marginBottom: SPACING.md,
  },
  summarySection: {
    marginBottom: SPACING.xl,
  },
  summaryCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    ...SHADOW.soft,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemsCountHeader: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.heading,
  },
  summaryBody: {
    marginTop: SPACING.md,
  },
  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  itemTitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
  },
  itemPrice: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.heading,
  },
  metaLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  metaPrice: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.heading,
  },
  vatLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#9CA3AF',
  },
  vatPrice: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#9CA3AF',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: SPACING.md,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
  },
  totalAmount: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
  },
  paymentSection: {
    marginBottom: SPACING.xl,
  },
  paymentMethodsCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  paymentOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  paymentOptionLeft: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.heading,
    marginBottom: 4,
  },
  mpesaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mpesaTextGreen: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#059669',
  },
  mpesaTextRed: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#DC2626',
  },
  cardsLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visaBadge: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#1A1F71',
    fontStyle: 'italic',
  },
  mastercardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  mastercardCircleRed: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EB001B',
  },
  mastercardCircleYellow: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F79E1B',
    marginLeft: -6,
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: SPACING.lg,
  },
  radioCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.8,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#18181B',
  },
  radioInnerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#18181B',
  },
  orderTypeSection: {
    marginBottom: SPACING.xl,
  },
  workOrderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    ...SHADOW.soft,
  },
  workOrderTitle: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.heading,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    ...SHADOW.soft,
  },
  payButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#18181B',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  payButtonPressed: {
    backgroundColor: '#27272A',
  },
  payButtonText: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.white,
  },
  stkBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  stkCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    ...SHADOW.soft,
  },
  stkBadgeWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  stkTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
    marginBottom: 4,
  },
  stkPhone: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.primaryDark,
    marginBottom: SPACING.lg,
  },
  stkStatusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
  },
  stkStatusText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.text,
  },
  stkSuccessGroup: {
    alignItems: 'center',
    gap: 6,
  },
  stkSuccessText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#059669',
  },
});
