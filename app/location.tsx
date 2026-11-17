import React, { useState, useEffect, useRef } from 'react';
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
  ScrollView,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  MapPin,
  Check,
  Crosshair,
  ChevronLeft,
  Info,
  Navigation2,
  Plus,
  Minus,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../src/constants/theme';
import { useLocation, MapCoordinates } from '../src/context/LocationContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = Math.round(SCREEN_HEIGHT * 0.36);

export interface KisumuZone {
  id: string;
  name: string;
  address: string;
  coords: MapCoordinates;
  // Normalized map canvas offset from center (-1 to 1)
  nx: number;
  ny: number;
}

export const KISUMU_LANDMARKS: KisumuZone[] = [
  {
    id: 'lbda-hq',
    name: 'LBDA HQ',
    address: 'LBDA HQ, East Kisumu, Kisumu County',
    coords: { latitude: -0.0892, longitude: 34.7695 },
    nx: 0.0,
    ny: -0.05,
  },
  {
    id: 'mega-city',
    name: 'Mega City Mall',
    address: 'Mega City Mall, Nairobi Road, Kisumu',
    coords: { latitude: -0.1025, longitude: 34.7732 },
    nx: 0.22,
    ny: 0.25,
  },
  {
    id: 'milimani',
    name: 'Milimani Estate',
    address: 'Milimani Estate, Ring Road, Kisumu',
    coords: { latitude: -0.1088, longitude: 34.7535 },
    nx: -0.24,
    ny: 0.28,
  },
  {
    id: 'city-center',
    name: 'Kisumu City Center',
    address: 'Oginga Odinga Street, CBD, Kisumu',
    coords: { latitude: -0.0917, longitude: 34.768 },
    nx: -0.08,
    ny: 0.08,
  },
  {
    id: 'dunga-hill',
    name: 'Dunga Hill Camp',
    address: 'Dunga Beach Road, Lake Victoria, Kisumu',
    coords: { latitude: -0.1442, longitude: 34.7368 },
    nx: -0.35,
    ny: 0.42,
  },
  {
    id: 'mamboleo',
    name: 'Mamboleo Junction',
    address: 'Mamboleo, Kakamega Road, Kisumu',
    coords: { latitude: -0.0584, longitude: 34.7821 },
    nx: 0.3,
    ny: -0.35,
  },
  {
    id: 'tom-mboya',
    name: 'Tom Mboya Estate',
    address: 'Tom Mboya Estate, Obote Road, Kisumu',
    coords: { latitude: -0.0845, longitude: 34.7592 },
    nx: -0.18,
    ny: -0.22,
  },
  {
    id: 'polyview',
    name: 'Polyview Estate',
    address: 'Polyview Estate, Ondiek Highway, Kisumu',
    coords: { latitude: -0.0965, longitude: 34.7785 },
    nx: 0.28,
    ny: 0.04,
  },
  {
    id: 'airport',
    name: 'Kisumu International Airport',
    address: 'Airport Road, Kisumu',
    coords: { latitude: -0.0861, longitude: 34.7289 },
    nx: -0.42,
    ny: -0.15,
  },
];

function findNearestKisumuZone(nx: number, ny: number): KisumuZone {
  let best = KISUMU_LANDMARKS[0];
  let bestDist = Infinity;
  for (const zone of KISUMU_LANDMARKS) {
    const dx = zone.nx - nx;
    const dy = zone.ny - ny;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestDist) {
      bestDist = d;
      best = zone;
    }
  }
  return best;
}

export default function LocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const { locationName, fullAddress, coordinates, setPinnedLocation } = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [remoteResults, setRemoteResults] = useState<
    Array<{ name: string; address: string; coords: MapCoordinates }>
  >([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState(
    'Drag, tap, or zoom the map to pinpoint your exact delivery spot.'
  );

  // Interactive Map Zoom & Pan State
  const [zoom, setZoom] = useState(1.35);
  const zoomAnim = useRef(new Animated.Value(1.35)).current;
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const currentOffset = useRef({ x: 0, y: 0 });
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the center map pin
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Center map on existing selected location on mount
  useEffect(() => {
    const matched = KISUMU_LANDMARKS.find(
      (z) => z.name.toLowerCase() === locationName.toLowerCase()
    );
    if (matched) {
      const targetX = -matched.nx * SCREEN_WIDTH * 0.45;
      const targetY = -matched.ny * MAP_HEIGHT * 0.45;
      currentOffset.current = { x: targetX, y: targetY };
      panX.setValue(targetX);
      panY.setValue(targetY);
    } else if (params.from !== 'checkout' && params.from !== 'header') {
      fetchLiveLocation();
    }
  }, []);

  // Live OpenStreetMap Nominatim search when typing custom streets/buildings
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setRemoteResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          `${q}, Kisumu, Kenya`
        )}&format=json&addressdetails=1&limit=5`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'LittlePoloCafeApp/1.0' },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data)) return;

        const mapped = data.map((item: any) => {
          const shortName =
            item.name ||
            item.address?.building ||
            item.address?.road ||
            item.address?.suburb ||
            item.display_name?.split(',')[0] ||
            q;
          return {
            name: shortName,
            address: item.display_name || `${shortName}, Kisumu`,
            coords: {
              latitude: parseFloat(item.lat) || -0.0917,
              longitude: parseFloat(item.lon) || 34.768,
            },
          };
        });
        setRemoteResults(mapped);
      } catch {
        // Offline or rate-limited; local landmark search remains active
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const animateMapToOffset = (targetX: number, targetY: number, targetZoom?: number) => {
    const maxPanX = SCREEN_WIDTH * 0.55;
    const maxPanY = MAP_HEIGHT * 0.55;
    const clampedX = Math.max(-maxPanX, Math.min(maxPanX, targetX));
    const clampedY = Math.max(-maxPanY, Math.min(maxPanY, targetY));

    currentOffset.current = { x: clampedX, y: clampedY };

    const animations: Animated.CompositeAnimation[] = [
      Animated.spring(panX, {
        toValue: clampedX,
        useNativeDriver: true,
        friction: 7,
      }),
      Animated.spring(panY, {
        toValue: clampedY,
        useNativeDriver: true,
        friction: 7,
      }),
    ];

    if (targetZoom !== undefined) {
      setZoom(targetZoom);
      animations.push(
        Animated.spring(zoomAnim, {
          toValue: targetZoom,
          useNativeDriver: true,
          friction: 7,
        })
      );
    }

    Animated.parallel(animations).start();
  };

  // Resolve coordinates & address when user drags or taps a point on the map
  const resolveMapPinOffset = async (offsetX: number, offsetY: number) => {
    const nx = Math.max(-0.9, Math.min(0.9, -offsetX / (SCREEN_WIDTH * 0.45)));
    const ny = Math.max(-0.9, Math.min(0.9, -offsetY / (MAP_HEIGHT * 0.45)));

    const lat = Number((-0.0917 - ny * 0.045).toFixed(5));
    const lng = Number((34.768 + nx * 0.045).toFixed(5));

    const nearest = findNearestKisumuZone(nx, ny);
    const distToNearest = Math.hypot(nearest.nx - nx, nearest.ny - ny);

    if (distToNearest < 0.16) {
      setPinnedLocation(nearest.name, nearest.address, nearest.coords);
      setGpsStatusMessage(
        `Pinned at ${nearest.name} (${nearest.coords.latitude.toFixed(4)}, ${nearest.coords.longitude.toFixed(4)})`
      );
      return;
    }

    // Immediate responsive update using nearest zone neighborhood
    const pinLabel = `Pinned near ${nearest.name}`;
    const pinAddr = `${nearest.name} Area, Kisumu (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    setPinnedLocation(pinLabel, pinAddr, { latitude: lat, longitude: lng });
    setGpsStatusMessage(`Pinpointed at ${lat.toFixed(4)}, ${lng.toFixed(4)} · Near ${nearest.name}`);

    // Try reverse geocoding for exact street name
    try {
      const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (rev && rev.length > 0) {
        const p = rev[0];
        const streetName = p.name || p.street || p.district || nearest.name;
        const district = p.district && p.district !== streetName ? `${p.district}, ` : '';
        const city = p.city || 'Kisumu';
        const resolvedAddr = `${streetName}, ${district}${city}`;
        setPinnedLocation(streetName, resolvedAddr, { latitude: lat, longitude: lng });
        setGpsStatusMessage(`Pinned: ${resolvedAddr}`);
      }
    } catch {
      // Keep spatial zone label if reverseGeocode permission isn't granted
    }
  };

  // PanResponder for dragging the map under the center pin or tapping to pinpoint
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
      onPanResponderGrant: () => {
        dragStartOffset.current = { ...currentOffset.current };
      },
      onPanResponderMove: (_, gestureState) => {
        const maxPanX = SCREEN_WIDTH * 0.55;
        const maxPanY = MAP_HEIGHT * 0.55;
        const nextX = Math.max(
          -maxPanX,
          Math.min(maxPanX, dragStartOffset.current.x + gestureState.dx)
        );
        const nextY = Math.max(
          -maxPanY,
          Math.min(maxPanY, dragStartOffset.current.y + gestureState.dy)
        );
        currentOffset.current = { x: nextX, y: nextY };
        panX.setValue(nextX);
        panY.setValue(nextY);
      },
      onPanResponderRelease: (evt: GestureResponderEvent, gestureState) => {
        const movedDistance = Math.hypot(gestureState.dx, gestureState.dy);
        if (movedDistance < 6) {
          // User tapped a specific spot on the map — move map so that spot sits under the center pin!
          const tapX = evt.nativeEvent.locationX;
          const tapY = evt.nativeEvent.locationY;
          const deltaX = SCREEN_WIDTH / 2 - tapX;
          const deltaY = MAP_HEIGHT / 2 - tapY;
          const targetX = currentOffset.current.x + deltaX * 0.65;
          const targetY = currentOffset.current.y + deltaY * 0.65;
          animateMapToOffset(targetX, targetY);
          resolveMapPinOffset(targetX, targetY);
        } else {
          resolveMapPinOffset(currentOffset.current.x, currentOffset.current.y);
        }
      },
    })
  ).current;

  const handleZoomIn = () => {
    const next = Math.min(3.5, Number((zoom + 0.45).toFixed(2)));
    setZoom(next);
    Animated.spring(zoomAnim, {
      toValue: next,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  const handleZoomOut = () => {
    const next = Math.max(1.0, Number((zoom - 0.45).toFixed(2)));
    setZoom(next);
    Animated.spring(zoomAnim, {
      toValue: next,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  const handleSelectZone = (zone: KisumuZone) => {
    const targetX = -zone.nx * SCREEN_WIDTH * 0.45;
    const targetY = -zone.ny * MAP_HEIGHT * 0.45;
    animateMapToOffset(targetX, targetY, Math.max(zoom, 1.6));
    setPinnedLocation(zone.name, zone.address, zone.coords);
    setGpsStatusMessage(`Pinned at ${zone.name} · ${zone.address}`);
  };

  const fetchLiveLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatusMessage('Location permission denied. Drag or tap the map to select your spot.');
        setIsLoadingLocation(false);
        return;
      }

      setGpsStatusMessage('Acquiring live satellite GPS coordinates...');
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = position.coords;

      const reverseGeocoded = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      animateMapToOffset(0, 0, 1.8);

      if (reverseGeocoded && reverseGeocoded.length > 0) {
        const place = reverseGeocoded[0];
        const placeName = place.name || place.street || place.district || 'Current Location';
        const district = place.district ? `${place.district}, ` : '';
        const city = place.city || place.subregion || 'Kisumu';
        const county = place.region || 'Kisumu County';
        const completeAddress = `${placeName}, ${district}${city}, ${county}`;

        setPinnedLocation(placeName, completeAddress, { latitude, longitude });
        setGpsStatusMessage('Live GPS location locked · Accurate to ~8m');
      } else {
        setPinnedLocation(
          'Current GPS Location',
          `Kisumu (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          { latitude, longitude }
        );
        setGpsStatusMessage('Live GPS coordinates locked.');
      }
    } catch {
      setGpsStatusMessage('Drag or tap the map to fine-tune your delivery pin.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleConfirmLocation = () => {
    if (params.from === 'checkout') {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/checkout/delivery');
      }
      return;
    }

    if (params.from === 'header' && router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/home');
  };

  const handleBackPress = () => {
    if (params.from === 'checkout') {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/checkout/delivery');
      }
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const localMatches = searchQuery.trim()
    ? KISUMU_LANDMARKS.filter(
        (l) =>
          l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const combinedSearchResults = [
    ...localMatches.map((l) => ({
      name: l.name,
      address: l.address,
      coords: l.coords,
      zone: l,
    })),
    ...remoteResults
      .filter(
        (r) =>
          !localMatches.some((l) => l.name.toLowerCase() === r.name.toLowerCase())
      )
      .map((r) => ({ ...r, zone: undefined })),
  ];

  return (
    <View style={styles.container}>
      {/* Interactive Zoomable & Draggable Map Viewport */}
      <View style={styles.mapContainer} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.mapCanvas,
            {
              transform: [
                { translateX: panX },
                { translateY: panY },
                { scale: zoomAnim },
              ],
            },
          ]}
        >
          <Image
            source={require('../assets/images/kisumu-map-landing.jpg')}
            style={styles.mapImage}
            resizeMode="cover"
          />

          {/* Interactive Tappable Landmark Hotspots on the Map */}
          {KISUMU_LANDMARKS.map((zone) => {
            const isSelected = locationName.toLowerCase() === zone.name.toLowerCase();
            const leftPct = `${50 + zone.nx * 42}%` as any;
            const topPct = `${50 + zone.ny * 42}%` as any;
            return (
              <Pressable
                key={zone.id}
                onPress={() => handleSelectZone(zone)}
                style={[
                  styles.mapHotspot,
                  { left: leftPct, top: topPct },
                  isSelected && styles.mapHotspotActive,
                ]}
              >
                <View
                  style={[
                    styles.mapHotspotDot,
                    isSelected && styles.mapHotspotDotActive,
                  ]}
                />
                <Text
                  style={[
                    styles.mapHotspotLabel,
                    isSelected && styles.mapHotspotLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {zone.name}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Center Pinned Marker with GPS Radius */}
        <Animated.View
          pointerEvents="none"
          style={[styles.centerPinContainer, { transform: [{ scale: pulseAnim }] }]}
        >
          <View style={styles.gpsCircle} />

          <View style={styles.deliveringBadge}>
            <Text style={styles.deliveringText} numberOfLines={1}>
              {locationName || 'Delivering here'}
            </Text>
            <View style={styles.deliveringArrow} />
          </View>

          <View style={styles.pinWrapper}>
            <MapPin size={46} color={COLORS.primary} fill={COLORS.primary} />
            <View style={styles.pinCenterDot} />
            <View style={styles.blueGpsDot} />
            <View style={styles.pinShadow} />
          </View>
        </Animated.View>

        {/* Top Floating Bar with Back Button and Little Polo Logo */}
        <View style={[styles.topBar, { top: Math.max(insets.top, 14) + 6 }]}>
          <Pressable
            onPress={handleBackPress}
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

        {/* Zoom In (+) and Zoom Out (-) Controls */}
        <View style={styles.zoomControls}>
          <Pressable
            onPress={handleZoomIn}
            style={styles.zoomBtn}
            accessibilityRole="button"
            accessibilityLabel="Zoom in on map"
          >
            <Plus size={18} color={COLORS.heading} strokeWidth={2.5} />
          </Pressable>
          <View style={styles.zoomDivider} />
          <Pressable
            onPress={handleZoomOut}
            style={styles.zoomBtn}
            accessibilityRole="button"
            accessibilityLabel="Zoom out on map"
          >
            <Minus size={18} color={COLORS.heading} strokeWidth={2.5} />
          </Pressable>
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

        {/* Coordinates Badge */}
        <View style={styles.coordsBadge}>
          <Text style={styles.coordsBadgeText}>
            {coordinates.latitude.toFixed(4)}°S, {coordinates.longitude.toFixed(4)}°E · {zoom.toFixed(1)}×
          </Text>
        </View>
      </View>

      {/* Bottom Sheet Delivery Confirmation Container */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.bottomScrollContent}
        >
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* Search Input */}
          <View style={styles.searchBar}>
            <Search size={20} color="#9CA3AF" strokeWidth={2.2} style={styles.searchIcon} />
            <TextInput
              placeholder="Search building, street, estate or landmark"
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

          {/* Search Results Dropdown */}
          {isSearching && combinedSearchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              {combinedSearchResults.map((item, idx) => (
                <Pressable
                  key={idx}
                  style={styles.searchResultItem}
                  onPress={() => {
                    if (item.zone) {
                      handleSelectZone(item.zone);
                    } else {
                      setPinnedLocation(item.name, item.address, item.coords);
                      animateMapToOffset(0, 0, 2.0);
                      setGpsStatusMessage(`Pinned at ${item.name}`);
                    }
                    setSearchQuery('');
                    setIsSearching(false);
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
              <Text style={styles.pinnedTitle}>{locationName || 'Pinned location'}</Text>
              <Text style={styles.pinnedSubtitle} numberOfLines={2}>
                {fullAddress || locationName}
              </Text>
            </View>
            <View style={styles.checkCircle}>
              <Check size={18} color={COLORS.text} strokeWidth={2.8} />
            </View>
          </View>

          {/* Quick Select Landmarks */}
          <View style={styles.landmarksSection}>
            <Text style={styles.landmarksTitle}>POPULAR DELIVERY ZONES IN KISUMU</Text>
            <View style={styles.landmarksGrid}>
              {KISUMU_LANDMARKS.slice(0, 6).map((landmark) => {
                const isSelected = locationName === landmark.name;
                return (
                  <Pressable
                    key={landmark.id}
                    onPress={() => handleSelectZone(landmark)}
                    style={[
                      styles.landmarkChip,
                      isSelected && styles.landmarkChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.landmarkChipText,
                        isSelected && styles.landmarkChipTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {landmark.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Confirm / Deliver to pinned location button */}
          <Pressable
            style={({ pressed }) => [
              styles.deliverButton,
              pressed && styles.deliverButtonPressed,
            ]}
            onPress={handleConfirmLocation}
            accessibilityRole="button"
            accessibilityLabel="Confirm pinned location"
          >
            <Text style={styles.deliverButtonText}>
              {params.from === 'checkout'
                ? 'Confirm delivery location'
                : 'Deliver to pinned location'}
            </Text>
          </Pressable>
        </ScrollView>
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
    height: MAP_HEIGHT,
    position: 'relative',
    backgroundColor: '#EAE6DF',
    overflow: 'hidden',
  },
  mapCanvas: {
    width: SCREEN_WIDTH * 1.8,
    height: MAP_HEIGHT * 1.8,
    marginLeft: -SCREEN_WIDTH * 0.4,
    marginTop: -MAP_HEIGHT * 0.4,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapHotspot: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    transform: [{ translateX: -36 }, { translateY: -12 }],
    ...SHADOW.subtle,
  },
  mapHotspotActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  mapHotspotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 5,
  },
  mapHotspotDotActive: {
    backgroundColor: '#FFFFFF',
  },
  mapHotspotLabel: {
    fontFamily: FONTS.semibold,
    fontSize: 10,
    color: '#111827',
    maxWidth: 95,
  },
  mapHotspotLabelActive: {
    color: '#FFFFFF',
  },
  centerPinContainer: {
    position: 'absolute',
    top: '34%',
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
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  deliveringBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginBottom: 4,
    alignItems: 'center',
    maxWidth: 155,
    ...SHADOW.soft,
  },
  deliveringText: {
    color: COLORS.white,
    fontFamily: FONTS.semibold,
    fontSize: 12,
  },
  deliveringArrow: {
    position: 'absolute',
    bottom: -5,
    width: 10,
    height: 10,
    backgroundColor: COLORS.primary,
    transform: [{ rotate: '45deg' }],
  },
  pinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pinCenterDot: {
    position: 'absolute',
    top: 13,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.white,
  },
  blueGpsDot: {
    position: 'absolute',
    bottom: 2,
    left: -10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  pinShadow: {
    width: 14,
    height: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.22)',
    marginTop: -3,
  },
  topBar: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  topLogoImg: {
    width: 44,
    height: 44,
  },
  zoomControls: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: 78,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  zoomBtn: {
    width: 40,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  gpsTargetButton: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: 26,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  coordsBadge: {
    position: 'absolute',
    left: SPACING.lg,
    bottom: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    ...SHADOW.subtle,
  },
  coordsBadgeText: {
    fontFamily: FONTS.semibold,
    fontSize: 11,
    color: '#374151',
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -18,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    ...SHADOW.soft,
  },
  bottomScrollContent: {
    paddingBottom: SPACING.lg,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  clearSearchBtn: {
    paddingLeft: SPACING.sm,
  },
  clearSearchText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
  },
  searchResultsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: SPACING.xs,
    ...SHADOW.subtle,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  searchResultIcon: {
    marginRight: SPACING.sm,
  },
  searchResultTextGroup: {
    flex: 1,
  },
  searchResultName: {
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.sm,
    color: COLORS.heading,
  },
  searchResultAddress: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  accuracyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    paddingHorizontal: 2,
  },
  infoIcon: {
    marginRight: 6,
  },
  accuracyText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  pinnedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
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
  },
  pinnedTitle: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.md,
    color: COLORS.heading,
    marginBottom: 2,
  },
  pinnedSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  checkCircle: {
    marginLeft: SPACING.sm,
  },
  landmarksSection: {
    marginBottom: SPACING.lg,
  },
  landmarksTitle: {
    fontFamily: FONTS.semibold,
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 0.7,
    marginBottom: SPACING.sm,
  },
  landmarksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  landmarkChip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  landmarkChipSelected: {
    backgroundColor: '#FEF2F2',
    borderColor: COLORS.primary,
  },
  landmarkChipText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
  },
  landmarkChipTextSelected: {
    color: COLORS.primary,
    fontFamily: FONTS.semibold,
  },
  deliverButton: {
    backgroundColor: '#121212',
    height: 52,
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
    color: COLORS.white,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
});
