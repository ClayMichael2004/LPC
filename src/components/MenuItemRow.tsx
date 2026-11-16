import React from 'react';
import { StyleSheet, View, Text, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Minus } from 'lucide-react-native';
import { Product } from '../types';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SPACING } from '../constants/theme';
import { useCart } from '../context/CartContext';

interface MenuItemRowProps {
  product: Product;
}

export default function MenuItemRow({ product }: MenuItemRowProps) {
  const router = useRouter();
  const { getItemQuantity, items, incrementItem, decrementItem, addToCart } = useCart();

  const quantity = getItemQuantity(product.id);

  // Find corresponding cartItem if exists
  const cartItem = items.find((item) => item.product.id === product.id);

  const handleOpenDetail = () => {
    router.push({
      pathname: '/product/[id]',
      params: { id: product.id },
    });
  };

  const handlePlusPress = () => {
    if (product.hasOptions) {
      handleOpenDetail();
    } else {
      addToCart(product, 1);
    }
  };

  const handleIncrement = () => {
    if (cartItem) {
      incrementItem(cartItem.cartItemId);
    } else {
      addToCart(product, 1);
    }
  };

  const handleDecrement = () => {
    if (cartItem) {
      decrementItem(cartItem.cartItemId);
    }
  };

  return (
    <Pressable
      onPress={handleOpenDetail}
      style={({ pressed }) => [styles.container, pressed && styles.containerPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, KSh ${product.price.toLocaleString()}`}
    >
      <View style={styles.imageBox}>
        <Image source={product.image} style={styles.productImage} resizeMode="contain" />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.price}>
          KSh {product.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>

      <View style={styles.actionBox}>
        {quantity > 0 ? (
          /* Quantity Pill Stepper (Red Pill border) */
          <View style={styles.stepperPill}>
            <Pressable
              onPress={handleDecrement}
              style={styles.stepperBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Decrease quantity"
            >
              <Minus size={16} color={COLORS.primary} strokeWidth={2.5} />
            </Pressable>

            <Text style={styles.stepperQty}>{quantity}</Text>

            <Pressable
              onPress={handleIncrement}
              style={styles.stepperBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Increase quantity"
            >
              <Plus size={16} color={COLORS.primary} strokeWidth={2.5} />
            </Pressable>
          </View>
        ) : (
          /* Red Circular Plus Button */
          <Pressable
            onPress={handlePlusPress}
            style={styles.plusCircle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={`Add ${product.name} to cart`}
          >
            <Plus size={20} color={COLORS.primary} strokeWidth={2} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    minHeight: 96,
  },
  containerPressed: {
    backgroundColor: '#FAFAFA',
  },
  imageBox: {
    width: 90,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  infoBox: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: SPACING.sm,
  },
  name: {
    fontFamily: FONTS.semibold,
    fontSize: 16,
    color: COLORS.heading,
    lineHeight: 20,
    marginBottom: 4,
  },
  price: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  actionBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
  plusCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: COLORS.white,
    minWidth: 92,
    justifyContent: 'space-between',
  },
  stepperBtn: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQty: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.heading,
    marginHorizontal: 8,
  },
});
