import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Pencil, Bike } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SPACING } from '../constants/theme';
import { useLocation } from '../context/LocationContext';

export default function AppHeader() {
  const router = useRouter();
  const { locationName } = useLocation();

  const handleLocationPress = () => {
    router.push('/');
  };

  return (
    <View style={styles.container}>
      {/* Brand Logo */}
      <Pressable onPress={() => router.replace('/(tabs)/home')} style={styles.brandBox}>
        <Text style={styles.brandLPC}>LPC</Text>
        <Text style={styles.brandSub}>CAFE</Text>
      </Pressable>

      {/* Deliver To Location Pill */}
      <Pressable onPress={handleLocationPress} style={styles.locationPill}>
        <MapPin size={16} color={COLORS.primary} strokeWidth={2.5} style={styles.pinIcon} />
        <View style={styles.locationTextGroup}>
          <Text style={styles.deliverToLabel}>Deliver to</Text>
          <Text style={styles.locationValue} numberOfLines={1}>
            {locationName}
          </Text>
        </View>
        <Pencil size={13} color={COLORS.textSecondary} strokeWidth={2} style={styles.editIcon} />
      </Pressable>

      {/* Scooter Delivery Icon */}
      <Pressable onPress={handleLocationPress} style={styles.scooterContainer}>
        <View style={styles.scooterCircle}>
          <Bike size={20} color={COLORS.primary} strokeWidth={2.2} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  brandBox: {
    flexDirection: 'column',
    justifyContent: 'center',
    paddingRight: SPACING.sm,
  },
  brandLPC: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.primary,
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  brandSub: {
    fontFamily: FONTS.semibold,
    fontSize: 8,
    color: COLORS.textSecondary,
    letterSpacing: 2,
    lineHeight: 9,
  },
  locationPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.sm,
  },
  pinIcon: {
    marginRight: 6,
  },
  locationTextGroup: {
    flex: 1,
  },
  deliverToLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 12,
  },
  locationValue: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.heading,
    lineHeight: 15,
  },
  editIcon: {
    marginLeft: 6,
  },
  scooterContainer: {
    paddingLeft: SPACING.xs,
  },
  scooterCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
