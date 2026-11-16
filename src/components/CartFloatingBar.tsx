import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../constants/theme';
import { useCart } from '../context/CartContext';

export default function CartFloatingBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { totalCount, subtotal } = useCart();

  if (totalCount === 0) return null;

  return (
    <View style={[styles.wrapper, { bottom: Math.max(insets.bottom, 12) + 68 }]}>
      <Pressable
        onPress={() => router.navigate('/(tabs)/cart')}
        style={styles.container}
        accessibilityRole="button"
        accessibilityLabel={`View cart, ${totalCount} items, total KSh ${subtotal.toLocaleString()}`}
      >
        <View style={styles.textColumn}>
          <Text style={styles.itemCountText}>
            {totalCount} {totalCount === 1 ? 'item' : 'items'}
          </Text>
          <Text style={styles.priceText}>
            KSh {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={styles.viewCartButton}>
          <Text style={styles.viewCartButtonText}>View cart</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 90,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    ...SHADOW.soft,
  },
  textColumn: {
    justifyContent: 'center',
  },
  itemCountText: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.white,
    lineHeight: 18,
  },
  priceText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 2,
    lineHeight: 16,
  },
  viewCartButton: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    paddingVertical: 9,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewCartButtonText: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: '#18181B',
  },
});
