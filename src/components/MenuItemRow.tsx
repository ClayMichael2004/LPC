import React from 'react';
import { StyleSheet, View, Text, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Minus, Pencil, Trash2 } from 'lucide-react-native';
import { Product } from '../types';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SPACING } from '../constants/theme';
import { useCart } from '../context/CartContext';

interface MenuItemRowProps {
  product: Product;
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function MenuItemRow({
  product,
  isAdmin = false,
  onEdit,
  onDelete,
}: MenuItemRowProps) {
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
    <View style={styles.container}>
      <Pressable
        onPress={handleOpenDetail}
        style={({ pressed }) => [styles.clickableContent, pressed && styles.clickablePressed]}
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
      </Pressable>

      <View style={styles.actionBox}>
        {isAdmin ? (
          <View style={styles.adminActionRow}>
            <Pressable
              onPress={onEdit}
              style={styles.adminEditBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${product.name}`}
            >
              <Pencil size={15} color="#07345F" strokeWidth={2.4} />
            </Pressable>
            <Pressable
              onPress={onDelete}
              style={styles.adminDeleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${product.name}`}
            >
              <Trash2 size={15} color="#DC2626" strokeWidth={2.4} />
            </Pressable>
          </View>
        ) : quantity > 0 ? (
          /* Quantity Pill Stepper (Red Pill border) */
          <View style={styles.stepperPill}>
            <Pressable
              onPress={handleDecrement}
              style={styles.stepperBtn}
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Decrease quantity"
            >
              <Minus size={16} color={COLORS.primary} strokeWidth={2.5} />
            </Pressable>

            <Text style={styles.stepperQty}>{quantity}</Text>

            <Pressable
              onPress={handleIncrement}
              style={styles.stepperBtn}
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
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
            style={({ pressed }) => [styles.plusCircle, pressed && styles.plusCirclePressed]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={`Add ${product.name} to cart`}
          >
            <Plus size={20} color={COLORS.primary} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>
    </View>
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
  clickableContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  clickablePressed: {
    opacity: 0.85,
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
  plusCirclePressed: {
    backgroundColor: '#FEE2E2',
    transform: [{ scale: 0.94 }],
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
  adminActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminEditBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
