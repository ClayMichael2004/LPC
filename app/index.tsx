import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, MapPin, Check, Crosshair, ChevronLeft, Info } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../src/constants/theme';
import { useLocation } from '../src/context/LocationContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LandingLocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locationName, fullAddress, setLocationName } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [pulseAnim] = useState(() => new Animated.Value(1));

  // Subtle pulsing animation on the pin
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const handleDeliverToPinned = () => {
    router.replace('/(tabs)/home');
  };

  return (
    <View style={styles.container}>
      {/* Cinematic Kisumu Map Background */}
      <View style={styles.mapContainer}>
        <Image
          source={require('../assets/images/kisumu-map-landing.jpg')}
          style={styles.mapImage}
          resizeMode="cover"
        />

        {/* Center Pinned Marker with GPS Radius */}
        <Animated.View style={[styles.centerPinContainer, { transform: [{ scale: pulseAnim }] }]}>
          {/* GPS Radius Overlay Tint */}
          <View style={styles.gpsCircle} />

          {/* Delivering Here Speech Bubble */}
          <View style={styles.deliveringBadge}>
            <Text style={styles.deliveringText}>Delivering here</Text>
            <View style={styles.deliveringArrow} />
          </View>

          {/* Red Map Pin with Center White Dot */}
          <View style={styles.pinWrapper}>
            <MapPin size={46} color={COLORS.primary} fill={COLORS.primary} />
            <View style={styles.pinCenterDot} />
            <View style={styles.blueGpsDot} />
            <View style={styles.pinShadow} />
          </View>
        </Animated.View>

        {/* Top Floating Bar with Back Button and Little Polo Logo */}
        <View style={[styles.topBar, { top: Math.max(insets.top, 14) + 10 }]}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
          >
            <ChevronLeft size={24} color={COLORS.text} strokeWidth={2.5} />
          </Pressable>

          <View style={styles.topLogoContainer}>
            <Image
              source={require('../assets/images/little-polo-logo.png')}
              style={styles.topLogoImg}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Floating GPS Crosshair Target Button */}
        <Pressable
          style={styles.gpsTargetButton}
          onPress={() => {
            setLocationName('LBDA HQ', 'LBDA HQ, East Kisumu, Kisumu, Kisumu C...');
          }}
          accessibilityRole="button"
          accessibilityLabel="Locate current position"
        >
          <Crosshair size={22} color={COLORS.text} strokeWidth={2.2} />
        </Pressable>

        {/* Google watermark styling */}
        <View style={styles.googleWatermark}>
          <Text style={styles.googleText}>Google</Text>
        </View>
      </View>

      {/* Bottom Sheet Delivery Confirmation Container */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        {/* Drag handle pill */}
        <View style={styles.dragHandle} />

        {/* Search building, street or landmark input */}
        <View style={styles.searchBar}>
          <Search size={20} color="#9CA3AF" strokeWidth={2.2} style={styles.searchIcon} />
          <TextInput
            placeholder="Search building, street or landmark"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* GPS accuracy note */}
        <View style={styles.accuracyRow}>
          <Info size={14} color="#6B7280" style={styles.infoIcon} />
          <Text style={styles.accuracyText}>
            GPS is accurate to about 10 m. Drag the map to fine-tune.
          </Text>
        </View>

        {/* Pinned Location Card */}
        <View style={styles.pinnedCard}>
          <View style={styles.pinCircle}>
            <MapPin size={18} color={COLORS.white} strokeWidth={2.5} />
          </View>
          <View style={styles.pinnedDetails}>
            <Text style={styles.pinnedTitle}>Pinned location</Text>
            <Text style={styles.pinnedSubtitle} numberOfLines={1}>
              {fullAddress}
            </Text>
          </View>
          <Check size={20} color={COLORS.heading} strokeWidth={2.5} style={styles.checkIcon} />
        </View>

        {/* Primary Deliver to Pinned Location Button */}
        <Pressable
          onPress={handleDeliverToPinned}
          style={({ pressed }) => [
            styles.deliverButton,
            pressed && styles.deliverButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Deliver to pinned location"
        >
          <Text style={styles.deliverButtonText}>Deliver to pinned location</Text>
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
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  centerPinContainer: {
    position: 'absolute',
    top: '32%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.28)',
    top: 10,
  },
  deliveringBadge: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 4,
    ...SHADOW.soft,
  },
  deliveringText: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.white,
    letterSpacing: 0.2,
  },
  deliveringArrow: {
    position: 'absolute',
    bottom: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.primary,
  },
  pinWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  pinCenterDot: {
    position: 'absolute',
    top: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.white,
  },
  blueGpsDot: {
    position: 'absolute',
    bottom: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  pinShadow: {
    width: 16,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    marginTop: 2,
  },
  topBar: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  topLogoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
    overflow: 'hidden',
  },
  topLogoImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  gpsTargetButton: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  googleWatermark: {
    position: 'absolute',
    left: SPACING.lg,
    bottom: 12,
  },
  googleText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#4285F4',
    letterSpacing: -0.5,
  },
  bottomSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    ...SHADOW.soft,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 48,
    marginBottom: SPACING.sm,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  accuracyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: 2,
  },
  infoIcon: {
    marginRight: 6,
  },
  accuracyText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  pinnedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  pinCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  pinnedDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  pinnedTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.heading,
    marginBottom: 2,
  },
  pinnedSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  checkIcon: {
    marginLeft: SPACING.sm,
  },
  deliverButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#121212',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliverButtonPressed: {
    backgroundColor: '#262626',
  },
  deliverButtonText: {
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
    color: COLORS.white,
    letterSpacing: 0.2,
  },
});
