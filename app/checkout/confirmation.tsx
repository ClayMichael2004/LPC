import React from 'react';
import { StyleSheet, View, Text, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Bike, Clock, ArrowRight } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useLocation } from '../../src/context/LocationContext';

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locationName } = useLocation();

  const handleReturnHome = () => {
    router.replace('/(tabs)/home');
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={styles.content}>
        <View style={styles.brandLogoCircle}>
          <Image
            source={require('../../assets/images/little-polo-logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.successIconCircle}>
          <CheckCircle2 size={36} color="#059669" strokeWidth={2.5} />
        </View>

        <Text style={styles.title}>Order Confirmed!</Text>
        <Text style={styles.orderId}>Order #LPC-8924</Text>

        <Text style={styles.description}>
          Your order is being freshly prepared at Little Polo Cafe.
        </Text>

        {/* Delivery ETA Card */}
        <View style={styles.etaCard}>
          <View style={styles.etaRow}>
            <Clock size={20} color={COLORS.primary} strokeWidth={2.2} />
            <Text style={styles.etaTitle}>Estimated Delivery</Text>
          </View>
          <Text style={styles.etaTime}>20 – 30 Minutes</Text>
          <Text style={styles.etaAddress}>Delivering to {locationName}, East Kisumu</Text>
        </View>

        {/* Courier dispatch card */}
        <View style={styles.courierCard}>
          <View style={styles.courierIconCircle}>
            <Bike size={24} color={COLORS.heading} strokeWidth={2.2} />
          </View>
          <View style={styles.courierInfo}>
            <Text style={styles.courierStatus}>Courier Dispatched</Text>
            <Text style={styles.courierSub}>Kisumu Express Delivery Team</Text>
          </View>
        </View>
      </View>

      {/* Back to Home Button */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleReturnHome}
          style={styles.homeButton}
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
          <ArrowRight size={18} color={COLORS.white} strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
  },
  brandLogoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  successIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.heading,
    marginBottom: 4,
  },
  orderId: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.primaryDark,
    marginBottom: SPACING.md,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xxl,
  },
  etaCard: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOW.subtle,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  etaTitle: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  etaTime: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.heading,
    marginBottom: 4,
  },
  etaAddress: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  courierCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    ...SHADOW.soft,
  },
  courierIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  courierInfo: {
    flex: 1,
  },
  courierStatus: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.heading,
  },
  courierSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footer: {
    width: '100%',
  },
  homeButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#18181B',
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  homeButtonText: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.white,
  },
});
