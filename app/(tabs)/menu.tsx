import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X } from 'lucide-react-native';
import AppHeader from '../../src/components/AppHeader';
import MenuItemRow from '../../src/components/MenuItemRow';
import CartFloatingBar from '../../src/components/CartFloatingBar';
import { MENU_TABS, PRODUCTS } from '../../src/constants/menuData';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SPACING } from '../../src/constants/theme';
import { useCart } from '../../src/context/CartContext';
import { useCategory } from '../../src/context/CategoryContext';

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const { selectedCategory, setSelectedCategory } = useCategory();
  const [searchQuery, setSearchQuery] = useState('');
  const tabScrollRef = useRef<ScrollView>(null);
  const { totalCount } = useCart();

  const handleTabSelect = (tabId: string, index: number) => {
    setSelectedCategory(tabId);
    tabScrollRef.current?.scrollTo({
      x: Math.max(0, index * 95 - 40),
      animated: true,
    });
  };

  // Scroll to active tab whenever selectedCategory updates
  useEffect(() => {
    const tabIndex = MENU_TABS.findIndex((t) => t.id === selectedCategory);
    if (tabIndex > -1) {
      setTimeout(() => {
        tabScrollRef.current?.scrollTo({
          x: Math.max(0, tabIndex * 95 - 40),
          animated: true,
        });
      }, 80);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (params.categoryId) {
      setSelectedCategory(params.categoryId);
    }
  }, [params.categoryId]);

  // Filter products by selected category and search query
  const filteredProducts = PRODUCTS.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (searchQuery.trim().length > 0) {
      return matchesSearch;
    }

    if (selectedCategory === 'all') return true;
    return product.category === selectedCategory;
  });

  const currentTab = MENU_TABS.find((t) => t.id === selectedCategory) || MENU_TABS[0];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" strokeWidth={2.2} style={styles.searchIcon} />
          <TextInput
            placeholder="Search menu"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color="#6B7280" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Horizontal Scrollable Category Tab Bar */}
      <View style={styles.tabBarContainer}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarScroll}
        >
          {MENU_TABS.map((tab, index) => {
            const isSelected = selectedCategory === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => handleTabSelect(tab.id, index)}
                style={styles.tabItem}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={tab.name}
              >
                <Text
                  style={[
                    styles.tabText,
                    isSelected && styles.tabTextSelected,
                  ]}
                >
                  {tab.name}
                </Text>
                {isSelected && <View style={styles.activeTabIndicator} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Menu List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: totalCount > 0 ? 190 : 130 },
        ]}
      >
        {/* Category Header */}
        <View style={styles.categoryHeaderBox}>
          <Text style={styles.categoryHeaderText}>
            {searchQuery.trim().length > 0 ? `SEARCH RESULTS ("${searchQuery}")` : currentTab.name.toUpperCase()}
          </Text>
        </View>

        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <MenuItemRow key={product.id} product={product} />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No menu items found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching for something else or explore other categories.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Black Cart Bar */}
      <CartFloatingBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    height: 44,
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
  tabBarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: COLORS.white,
  },
  tabBarScroll: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: '#6B7280',
  },
  tabTextSelected: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.heading,
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 4,
    right: 4,
    height: 3,
    backgroundColor: COLORS.heading,
    borderRadius: 1.5,
  },
  listContent: {
    flexGrow: 1,
  },
  categoryHeaderBox: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  categoryHeaderText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxxl,
    marginTop: SPACING.xl,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.heading,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
