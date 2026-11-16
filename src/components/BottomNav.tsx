import React, { ComponentProps } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { House, Search, Palette, ShoppingBag, CircleUserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, FONTS, SHADOW, SPACING } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

type TabBarRenderer = NonNullable<ComponentProps<typeof Tabs>['tabBar']>;
type BottomNavProps = Parameters<TabBarRenderer>[0];

export default function BottomNav({ state, descriptors, navigation }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const { totalCount } = useCart();
  const { isAuthenticated, showSignInModal } = useAuth();

  return (
    <View style={[styles.wrapper, { bottom: Math.max(insets.bottom, 14) }]}>
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          let label = route.name;
          if (route.name === 'home') label = 'Home';
          else if (route.name === 'menu') label = 'Menu';
          else if (route.name === 'activities') label = 'Activities';
          else if (route.name === 'cart') label = 'Cart';
          else if (route.name === 'profile') label = isAuthenticated ? 'Profile' : 'Sign In';

          const onPress = () => {
            if (route.name === 'profile' && !isAuthenticated) {
              showSignInModal('nav');
              return;
            }

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const activeColor = COLORS.primary;
          const inactiveColor = '#4B5563';
          const iconColor = isFocused ? activeColor : inactiveColor;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
            >
              <View style={styles.iconContainer}>
                {route.name === 'home' && <House size={22} color={iconColor} strokeWidth={2} />}
                {route.name === 'menu' && <Search size={22} color={iconColor} strokeWidth={2.3} />}
                {route.name === 'activities' && <Palette size={22} color={iconColor} strokeWidth={2} />}
                {route.name === 'cart' && (
                  <View style={styles.cartIconWrapper}>
                    <ShoppingBag size={22} color={iconColor} strokeWidth={2} />
                    {totalCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{totalCount}</Text>
                      </View>
                    )}
                  </View>
                )}
                {route.name === 'profile' && (
                  <CircleUserRound size={22} color={iconColor} strokeWidth={2} />
                )}
              </View>

              <Text
                style={[
                  styles.label,
                  { color: isFocused ? activeColor : inactiveColor },
                  isFocused && styles.labelFocused,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  container: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: SPACING.xs,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartIconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.primary,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontFamily: FONTS.bold,
    lineHeight: 11,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.medium,
    marginTop: 3,
  },
  labelFocused: {
    fontFamily: FONTS.semibold,
  },
});
