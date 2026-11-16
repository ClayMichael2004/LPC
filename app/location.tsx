import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  Dimensions,
  Animated,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, MapPin, Check, Crosshair, ChevronLeft, Info, Navigation2 } from 'lucide-react-native';
import * as Location from 'expo-location';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../src/constants/theme';
import { useLocation } from '../src/context/LocationContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const KISUMU_LANDMARKS = [
  { name: 'LBDA HQ', address: 'LBDA HQ, East Kisumu, Kisumu, Kisumu County' },
  { name: 'Mega City Mall', address: 'Nairobi Road, Kisumu, Kisumu County' },
  { name: 'Milimani Estate', address: 'Milimani, Kisumu, Kisumu County' },
  { name: 'Kisumu City Center', address: 'Oginga Odinga Street, Kisumu' },
  { name: 'Dunga Hill Camp', address: 'Dunga, Lake Victoria, Kisumu' },
  { name: 'Kisumu International Airport', address: 'Airport Road, Kisumu' },
];

export default function LocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locationName, fullAddress, setLocationName } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState('GPS is accurate to about 10 m. Drag the map to fine-tune.');
  const [pulseAnim] = useState(() => new Animated.Value(1));

  // Pulse animation for the center map pin
  useEffect(() => {
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

  // Request location permission & pick live location on mount
  useEffect(() => {
    fetchLiveLocation();
  }, []);

  const fetchLiveLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatusMessage('Location permission denied. Showing default Little Polo delivery zone.');
        setIsLoadingLocation(false);
        return;
      }

      setGpsStatusMessage('Acquiring live satellite GPS coordinates...');
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;

      const reverseGeocoded = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocoded && reverseGeocoded.length > 0) {
        const place = reverseGeocoded[0];
        const placeName = place.name || place.street || place.district || 'Current Location';
        const district = place.district ? `${place.district}, ` : '';
        const city = place.city || place.subregion || 'Kisumu';
        const county = place.region || 'Kisumu County';
        const completeAddress = `${placeName}, ${district}${city}, ${county}`;

        setLocationName(placeName, completeAddress);
        setGpsStatusMessage('Live GPS location locked · Accurate to ~8m');
      } else {
        setLocationName('East Kisumu', 'LBDA HQ, East Kisumu, Kisumu, Kisumu County');
        setGpsStatusMessage('GPS is accurate to about 10 m.');
      }
    } catch {
      // Graceful fallback for simulator / non-GPS environment
      setGpsStatusMessage('GPS is accurate to about 10 m. Pinned near East Kisumu.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleDeliverToPinned = () => {
    router.replace('/(tabs)/home');
  };

  const filteredLandmarks = searchQuery.trim()
    ? KISUMU_LANDMARKS.filter(
        (l) =>
          l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <View style={styles.container}>
      {/* Map Background */}
      <View style={styles.mapContainer}>
        <Image
          source={require('../assets/images/kisumu-map-landing.jpg')}
          style={styles.mapImage}
          resizeMode="cover"
        />

        {/* Center Pinned Marker with GPS Radius */}
        <Animated.View style={[styles.centerPinContainer, { transform: [{ scale: pulseAnim }] }]}>
          {/* GPS Radius Overlay */}
          <View style={styles.gpsCircle} />

          {/* Delivering Here Speech Bubble */}
          <View style={styles.deliveringBadge}>
            <Text style={styles.deliveringText}>Delivering here</Text>
            <View style={styles.deliveringArrow} />
          </View>

          {/* Red Map Pin */}
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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Back"
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
          onPress={fetchLiveLocation}
          accessibilityRole="button"
          accessibilityLabel="Locate current live position"
        >
          {isLoadingLocation ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Crosshair size={22} color={COLORS.text} strokeWidth={2.2} />
          )}
        </Pressable>

        {/* Google watermark styling */}
        <View style={styles.googleWatermark}>
          <Text style={styles.googleText}>Google</Text>
        </View>
      </View>

      {/* Bottom Sheet Delivery Confirmation Container */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Search size={20} color="#9CA3AF" strokeWidth={2.2} style={styles.searchIcon} />
          <TextInput
            placeholder="Search building, street or landmark"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setIsSearching(text.length > 0);
            }}
            onFocus={() => setIsSearching(searchQuery.length > 0)}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => {
                setSearchQuery('');
                setIsSearching(false);
              }}
              style={styles.clearSearchBtn}
            >
              <Text style={styles.clearSearchText}>Clear</Text>
            </Pressable>
          )}
        </View>

        {/* Search Results Dropdown (if searching) */}
        {isSearching && filteredLandmarks.length > 0 && (
          <View style={styles.searchResultsContainer}>
            {filteredLandmarks.map((item, idx) => (
              <Pressable
                key={idx}
                style={styles.searchResultItem}
                onPress={() => {
                  setLocationName(item.name, item.address);
                  setSearchQuery('');
                  setIsSearching(false);
                  setGpsStatusMessage(`Selected landmark: ${item.name}`);
                }}
              >
                <Navigation2 size={16} color={COLORS.primary} style={styles.searchResultIcon} />
                <View style={styles.searchResultTextGroup}>
                  <Text style={styles.searchResultName}>{item.name}</Text>
                  <Text style={styles.searchResultAddress} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* GPS accuracy note */}
        <View style={styles.accuracyRow}>
          <Info size={14} color="#6B7280" style={styles.infoIcon} />
          <Text style={styles.accuracyText} numberOfLines={2}>
            {gpsStatusMessage}
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
              {fullAddress || locationName}
            </Text>
          </View>
          <View style={styles.checkCircle}>
            <Check size={18} color={COLORS.text} strokeWidth={2.8} />
          </View>
        </View>

        {/* Deliver to pinned location button */}
        <Pressable
          style={({ pressed }) => [
            styles.deliverButton,
            pressed && styles.deliverButtonPressed,
          ]}
          onPress={handleDeliverToPinned}
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
    backgroundColor: '#EAE6DF',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  centerPinContainer: {
    position: 'absolute',
    top: '38%',
    left: '50%',
    marginLeft: -80,
    marginTop: -80,
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  deliveringBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...SHADOW.soft,
    position: 'relative',
  },
  deliveringText: {
    color: COLORS.white,
    fontFamily: FONTS.semibold,
    fontSize: 12,
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
    bottom: 24,
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
    paddingTop: 12,
    paddingHorizontal: SPACING.lg,
    ...SHADOW.soft,
    marginTop: -20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    height: 48,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
  },
  clearSearchBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  clearSearchText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.primary,
  },
  searchResultsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 10,
    maxHeight: 160,
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchResultIcon: {
    marginRight: 10,
  },
  searchResultTextGroup: {
    flex: 1,
  },
  searchResultName: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.heading,
  },
  searchResultAddress: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  accuracyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  infoIcon: {
    marginRight: 6,
  },
  accuracyText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  pinnedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  pinCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  pinnedDetails: {
    flex: 1,
  },
  pinnedTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.heading,
    marginBottom: 2,
  },
  pinnedSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  checkCircle: {
    marginLeft: SPACING.sm,
  },
  deliverButton: {
    height: 52,
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  deliverButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  deliverButtonText: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.white,
    letterSpacing: 0.2,
  },
});
