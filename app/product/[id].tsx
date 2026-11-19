import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Minus, Plus } from 'lucide-react-native';
import { PRODUCTS } from '../../src/constants/menuData';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useCart } from '../../src/context/CartContext';
import { useCategory } from '../../src/context/CategoryContext';
import { ProductOption } from '../../src/types';
import { resolveBackendImage } from '../../src/services/api';

export default function ProductDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const { addToCart, getItemQuantity } = useCart();
  const { products } = useCategory();

  const sourceProducts = products.length > 0 ? products : PRODUCTS;
  const product = sourceProducts.find((p) => p.id === params.id) || PRODUCTS.find((p) => p.id === params.id) || PRODUCTS[0];

  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState<ProductOption | null>(null);

  const hasOptions = !!product.optionsGroup;
  const isOptionRequired = product.optionsGroup?.required ?? false;
  const isSelectionComplete = !hasOptions || (hasOptions && (!isOptionRequired || selectedOption !== null));

  const unitPrice = product.price + (selectedOption?.extraPrice || 0);
  const totalPrice = unitPrice * quantity;

  const handleSelectOption = (option: ProductOption) => {
    setSelectedOption(option);
  };

  const handleAddToCart = () => {
    if (!isSelectionComplete) return;

    addToCart(product, quantity, selectedOption || undefined);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/menu');
    }
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/menu');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}>
      {/* Top Floating Close Button */}
      <View style={styles.topBar}>
        <View style={styles.spacer} />
        <Pressable
          onPress={handleClose}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Close product details"
        >
          <X size={20} color={COLORS.heading} strokeWidth={2.4} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image
            source={resolveBackendImage(product.image)}
            style={styles.productImage}
            resizeMode="contain"
          />
        </View>

        {/* Product Title & Base Price */}
        <View style={styles.headerInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>
            KSh {product.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          {product.description ? (
            <Text style={styles.productDescription}>{product.description}</Text>
          ) : null}
        </View>

        {/* Customization Options Group */}
        {hasOptions && product.optionsGroup && (
          <View style={styles.optionsSection}>
            <View style={styles.optionHeaderRow}>
              <Text style={styles.optionGroupTitle}>{product.optionsGroup.title}</Text>
              {selectedOption ? (
                /* Done Badge */
                <View style={styles.badgeDone}>
                  <Text style={styles.badgeDoneText}>✓ Done</Text>
                </View>
              ) : (
                /* Required Badge */
                <View style={styles.badgeRequired}>
                  <Text style={styles.badgeRequiredText}>Required · Choose 1</Text>
                </View>
              )}
            </View>

            <Text style={styles.optionSubtext}>Choose 1 item</Text>

            {/* Options Radio List */}
            <View style={styles.optionsList}>
              {product.optionsGroup.options.map((option) => {
                const isSelected = selectedOption?.id === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => handleSelectOption(option)}
                    style={styles.optionRow}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={option.name}
                  >
                    <Text style={styles.optionName}>{option.name}</Text>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioInnerDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        {/* Left Quantity Stepper */}
        <View style={styles.stepperContainer}>
          <Pressable
            onPress={() => setQuantity((prev) => Math.max(1, prev - 1))}
            style={styles.stepperBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Decrease quantity"
          >
            <Minus size={18} color={quantity > 1 ? COLORS.text : '#9CA3AF'} strokeWidth={2.4} />
          </Pressable>

          <Text style={styles.stepperValue}>{quantity}</Text>

          <Pressable
            onPress={() => setQuantity((prev) => prev + 1)}
            style={styles.stepperBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
          >
            <Plus size={18} color={COLORS.text} strokeWidth={2.4} />
          </Pressable>
        </View>

        {/* Right CTA Button */}
        {isSelectionComplete ? (
          /* Enabled Add Button: Red outlined or filled pill */
          <Pressable
            onPress={handleAddToCart}
            style={({ pressed }) => [
              styles.addEnabledButton,
              pressed && styles.addEnabledButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Add ${quantity} for KSh ${totalPrice.toLocaleString()}`}
          >
            <Text style={styles.addEnabledButtonText}>
              Add {quantity} for KSh {totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </Pressable>
        ) : (
          /* Disabled Button */
          <View style={styles.addDisabledButton}>
            <Text style={styles.addDisabledButtonText}>Choose 1 more option</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
  },
  spacer: {
    width: 36,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  imageContainer: {
    width: '100%',
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.md,
  },
  productImage: {
    width: '80%',
    height: '100%',
  },
  headerInfo: {
    marginBottom: SPACING.lg,
  },
  productName: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.heading,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  productPrice: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.heading,
    marginBottom: SPACING.xs,
  },
  productDescription: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  optionsSection: {
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: SPACING.lg,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  optionGroupTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.heading,
  },
  badgeRequired: {
    backgroundColor: COLORS.badgeRequiredBg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  badgeRequiredText: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    color: COLORS.badgeRequiredText,
  },
  badgeDone: {
    backgroundColor: COLORS.badgeDoneBg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  badgeDoneText: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    color: COLORS.badgeDoneText,
  },
  optionSubtext: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  optionsList: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionName: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.heading,
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
    borderColor: COLORS.primary,
  },
  radioInnerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: SPACING.md,
    ...SHADOW.soft,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 16,
  },
  stepperBtn: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.heading,
    minWidth: 18,
    textAlign: 'center',
  },
  addEnabledButton: {
    flex: 1,
    height: 50,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
  },
  addEnabledButtonPressed: {
    backgroundColor: '#FEF2F2',
  },
  addEnabledButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.primary,
  },
  addDisabledButton: {
    flex: 1,
    height: 50,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
  },
  addDisabledButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: '#6B7280',
  },
});
