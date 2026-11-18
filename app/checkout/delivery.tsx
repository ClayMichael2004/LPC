import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TextInput,
  Switch,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Navigation, ChevronDown } from 'lucide-react-native';
import ScreenHeader from '../../src/components/ScreenHeader';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useLocation } from '../../src/context/LocationContext';
import { useCart } from '../../src/context/CartContext';
import { useAuth } from '../../src/context/AuthContext';

export default function CheckoutDeliveryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locationName, fullAddress, deliveryInfo, updateDeliveryInfo } = useLocation();
  const { subtotal, deliveryFee, total } = useCart();
  const { user } = useAuth();

  const userPhoneClean =
    user?.phone && user.phone !== '-' && user.phone !== '—' ? user.phone : '';
  const defaultPhone = (userPhoneClean || deliveryInfo.phone || '')
    .replace(/^\+?254\s*/, '')
    .trim();

  const [estateBuilding, setEstateBuilding] = useState(deliveryInfo.estateBuilding || '');
  const [deliveryInstructions, setDeliveryInstructions] = useState(deliveryInfo.deliveryInstructions || '');
  const [phone, setPhone] = useState(defaultPhone);
  const [saveAddress, setSaveAddress] = useState(deliveryInfo.saveAddress ?? true);

  // Keep local form synchronized if location or authenticated user changes
  useEffect(() => {
    if (deliveryInfo.estateBuilding !== undefined) {
      setEstateBuilding(deliveryInfo.estateBuilding);
    }
    if (deliveryInfo.deliveryInstructions !== undefined) {
      setDeliveryInstructions(deliveryInfo.deliveryInstructions);
    }
  }, [locationName, fullAddress, deliveryInfo.estateBuilding, deliveryInfo.deliveryInstructions]);

  useEffect(() => {
    setPhone(defaultPhone);
  }, [defaultPhone]);

  const handleOpenLocationPicker = () => {
    router.push({ pathname: '/location', params: { from: 'checkout' } });
  };

  const handleContinue = () => {
    updateDeliveryInfo({
      addressName: locationName,
      landmark: fullAddress,
      estateBuilding: estateBuilding.trim() || locationName,
      deliveryInstructions: deliveryInstructions.trim(),
      phone: phone.trim() || defaultPhone,
      saveAddress,
    });
    router.push('/checkout/payment');
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}>
      <ScreenHeader title="Checkout" />

      {/* Step Tabs: 1 DELIVERY (Active) / 2 PAYMENT */}
      <View style={styles.stepTabsRow}>
        <View style={styles.stepTabActive}>
          <Text style={styles.stepTabTextActive}>1 · DELIVERY</Text>
          <View style={styles.stepIndicatorActive} />
        </View>

        <Pressable onPress={() => router.push('/checkout/payment')} style={styles.stepTabInactive}>
          <Text style={styles.stepTabTextInactive}>2 · PAYMENT</Text>
          <View style={styles.stepIndicatorInactive} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
      >
        {/* Map Preview Card */}
        <View style={styles.mapCard}>
          <Pressable onPress={handleOpenLocationPicker} style={styles.mapSnippetWrapper}>
            <Image
              source={require('../../assets/images/kisumu-mini-map.jpg')}
              style={styles.mapSnippetImage}
              resizeMode="cover"
            />
            {/* Adjust Pin Floating Button */}
            <Pressable
              onPress={handleOpenLocationPicker}
              style={styles.adjustPinBtn}
              accessibilityRole="button"
              accessibilityLabel="Adjust pin on map"
            >
              <Navigation size={14} color={COLORS.heading} strokeWidth={2.4} />
              <Text style={styles.adjustPinText}>Adjust pin</Text>
            </Pressable>
          </Pressable>

          <View style={styles.addressSummaryRow}>
            <View style={styles.addressTextCol}>
              <Text style={styles.addressTitle}>{locationName}</Text>
              <Text style={styles.addressSubtitle} numberOfLines={1}>
                {fullAddress}
              </Text>
            </View>
            <Pressable
              onPress={handleOpenLocationPicker}
              hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Change delivery location"
            >
              <Text style={styles.changeLink}>Change</Text>
            </Pressable>
          </View>
        </View>

        {/* Input: Estate, building & house no. */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Estate, building & house no. <Text style={styles.asterisk}>*</Text>
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              value={estateBuilding}
              onChangeText={setEstateBuilding}
              placeholder={`e.g. Building, House/Apt no. near ${locationName}`}
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
            />
          </View>
        </View>

        {/* Input: Delivery instructions */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Delivery instructions (optional)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              value={deliveryInstructions}
              onChangeText={setDeliveryInstructions}
              placeholder={`e.g. Gate instructions at ${locationName} or call on arrival`}
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
            />
          </View>
        </View>

        {/* Input: Rider will call this number */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Rider will call this number <Text style={styles.asterisk}>*</Text>
          </Text>
          <View style={styles.phoneInputRow}>
            <View style={styles.countryPicker}>
              <Text style={styles.flag}>🇰🇪</Text>
              <Text style={styles.callingCode}>+254</Text>
              <ChevronDown size={14} color="#6B7280" />
            </View>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="712 345 678"
              placeholderTextColor="#9CA3AF"
              style={styles.phoneTextInput}
            />
          </View>
          <Text style={styles.helperText}>We'll also send your M-Pesa prompt here.</Text>
        </View>

        {/* Save this address switch card */}
        <View style={styles.switchCard}>
          <View style={styles.switchDetails}>
            <Text style={styles.switchTitle}>Save this address</Text>
            <Text style={styles.switchSubtitle}>Saved after your order goes through</Text>
          </View>
          <Switch
            value={saveAddress}
            onValueChange={setSaveAddress}
            trackColor={{ false: '#E5E7EB', true: '#18181B' }}
            thumbColor={COLORS.white}
          />
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <View style={styles.priceRow}>
          <Text style={styles.deliveryFeeText}>Delivery fee KSh {deliveryFee}.00</Text>
          <Text style={styles.totalPriceText}>
            Total KSh {total > 0 ? total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '1,500.00'}
          </Text>
        </View>

        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.continueButton,
            pressed && styles.continueButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Continue to payment"
        >
          <Text style={styles.continueButtonText}>Continue to payment</Text>
        </Pressable>
      </View>
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
  stepTabActive: {
    flex: 1,
    paddingVertical: 12,
    position: 'relative',
    alignItems: 'flex-start',
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
    left: 0,
    right: 16,
    height: 3,
    backgroundColor: '#18181B',
    borderRadius: 1.5,
  },
  stepTabInactive: {
    flex: 1,
    paddingVertical: 12,
    position: 'relative',
    alignItems: 'flex-end',
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
    left: 16,
    right: 0,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  mapCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    marginBottom: SPACING.xl,
    ...SHADOW.soft,
  },
  mapSnippetWrapper: {
    width: '100%',
    height: 140,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  mapSnippetImage: {
    width: '100%',
    height: '100%',
  },
  adjustPinBtn: {
    position: 'absolute',
    right: SPACING.md,
    top: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
    ...SHADOW.soft,
  },
  adjustPinText: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.heading,
  },
  addressSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  addressTextCol: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  addressTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.heading,
  },
  addressSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  changeLink: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.heading,
    textDecorationLine: 'underline',
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.heading,
    marginBottom: 8,
  },
  asterisk: {
    color: COLORS.primary,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 52,
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  textInput: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.md,
    height: 52,
    backgroundColor: COLORS.white,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    gap: 4,
  },
  flag: {
    fontSize: 16,
  },
  callingCode: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.heading,
  },
  phoneTextInput: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
  },
  helperText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    padding: SPACING.lg,
    marginTop: SPACING.xs,
    backgroundColor: COLORS.white,
    ...SHADOW.soft,
  },
  switchDetails: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  switchTitle: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.heading,
    marginBottom: 2,
  },
  switchSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  deliveryFeeText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  totalPriceText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.heading,
  },
  continueButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#18181B',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonPressed: {
    backgroundColor: '#27272A',
  },
  continueButtonText: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.white,
  },
});
