import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  Dimensions,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Pencil, X, Eye } from 'lucide-react-native';
import { CATEGORIES } from '../constants/menuData';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../constants/theme';
import { Category } from '../types';
import { useCategory } from '../context/CategoryContext';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH - SPACING.lg * 2;
const HIDDEN_CATEGORIES_KEY = '@lpc_hidden_categories_v1';

export default function BrowseCategoriesSlideshow() {
  const router = useRouter();
  const { selectCategoryAndNavigate, categories } = useCategory();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activePage, setActivePage] = useState(0);
  const activePageRef = useRef(0);
  activePageRef.current = activePage;
  const scrollRef = useRef<ScrollView>(null);
  const isInteracting = useRef(false);

  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [isCustomizeModalVisible, setIsCustomizeModalVisible] = useState(false);

  // Load persisted hidden categories
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(HIDDEN_CATEGORIES_KEY);
        if (stored) {
          setHiddenIds(JSON.parse(stored));
        }
      } catch {
        // Fallback
      }
    })();
  }, []);

  const toggleCategoryVisibility = async (categoryId: string) => {
    let nextHidden: string[];
    if (hiddenIds.includes(categoryId)) {
      nextHidden = hiddenIds.filter((id) => id !== categoryId);
    } else {
      nextHidden = [...hiddenIds, categoryId];
    }
    setHiddenIds(nextHidden);
    try {
      await AsyncStorage.setItem(HIDDEN_CATEGORIES_KEY, JSON.stringify(nextHidden));
    } catch {
      // Ignore
    }
  };

  const sourceCategories = categories.length > 0 ? categories : CATEGORIES;
  const displayedCategories = sourceCategories.filter((cat) => !hiddenIds.includes(cat.id));

  // Split categories into chunks of 4 (2x2 grid per page)
  const pages: Category[][] = [];
  for (let i = 0; i < displayedCategories.length; i += 4) {
    pages.push(displayedCategories.slice(i, i + 4));
  }

  useEffect(() => {
    if (pages.length <= 1) return;
    const timer = setInterval(() => {
      if (isInteracting.current) return;
      const nextPage = (activePageRef.current + 1) % pages.length;
      scrollRef.current?.scrollTo({
        x: nextPage * (SLIDE_WIDTH + SPACING.lg),
        animated: true,
      });
      setActivePage(nextPage);
    }, 4200);

    return () => clearInterval(timer);
  }, [pages.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / (SLIDE_WIDTH + SPACING.lg));
    if (pageIndex !== activePage && pageIndex >= 0 && pageIndex < pages.length) {
      setActivePage(pageIndex);
    }
  };

  const handleCategoryPress = (category: Category) => {
    // Navigate to menu tab with exact selected category
    selectCategoryAndNavigate(category.id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>BROWSE CATEGORIES</Text>
        {isAdmin && (
          <Pressable
            style={styles.customizeBtn}
            onPress={() => setIsCustomizeModalVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Customize category cards"
          >
            <Pencil size={12} color={COLORS.heading} strokeWidth={2.4} />
            <Text style={styles.customizeBtnText}>Customize Cards</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={SLIDE_WIDTH + SPACING.lg}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onTouchStart={() => {
          isInteracting.current = true;
        }}
        onTouchEnd={() => {
          setTimeout(() => {
            isInteracting.current = false;
          }, 2000);
        }}
      >
        {pages.map((pageCategories, pageIdx) => (
          <View key={pageIdx} style={styles.gridPage}>
            {pageCategories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => handleCategoryPress(category)}
                style={({ pressed }) => [
                  styles.categoryCard,
                  pressed && styles.categoryCardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`View ${category.name}`}
              >
                <View style={styles.imageWrapper}>
                  <Image
                    source={category.image}
                    style={styles.categoryImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.categoryName} numberOfLines={1}>
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Slide Page Indicator */}
      {pages.length > 1 && (
        <View style={styles.paginationRow}>
          {pages.map((_, index) => {
            const isActive = index === activePage;
            return (
              <View
                key={index}
                style={[
                  styles.pageIndicator,
                  isActive ? styles.pageIndicatorActive : styles.pageIndicatorInactive,
                ]}
              />
            );
          })}
        </View>
      )}

      {/* Admin Category Customization Modal */}
      <Modal
        visible={isCustomizeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCustomizeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderInfo}>
                <Text style={styles.modalTitle}>Customize Category Cards</Text>
                <Text style={styles.modalSubtitle}>Toggle which cards appear on the customer home screen:</Text>
              </View>
              <Pressable
                onPress={() => setIsCustomizeModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={COLORS.heading} />
              </Pressable>
            </View>

            <ScrollView style={styles.categoriesList} showsVerticalScrollIndicator={false}>
              {sourceCategories.map((cat) => {
                const isVisible = !hiddenIds.includes(cat.id);
                return (
                  <View key={cat.id} style={styles.categoryItemRow}>
                    <View style={styles.catRowInfo}>
                      <View style={styles.catThumbnailBox}>
                        <Image source={cat.image} style={styles.catThumbnail} resizeMode="contain" />
                      </View>
                      <Text style={styles.catRowName}>{cat.name}</Text>
                    </View>
                    <Switch
                      value={isVisible}
                      onValueChange={() => toggleCategoryVisibility(cat.id)}
                      trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                      thumbColor={COLORS.white}
                    />
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              style={styles.doneBtn}
              onPress={() => setIsCustomizeModalVisible(false)}
            >
              <Text style={styles.doneBtnText}>Save & Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    fontFamily: FONTS.sfDisplay,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.heading,
    letterSpacing: 0.5,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  scrollContent: {
    paddingLeft: SPACING.lg,
    paddingRight: 0,
  },
  gridPage: {
    width: SLIDE_WIDTH,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginRight: SPACING.lg,
  },
  categoryCard: {
    width: (SLIDE_WIDTH - SPACING.md) / 2,
    height: 175,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    ...SHADOW.soft,
  },
  categoryCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  imageWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryImage: {
    width: '85%',
    height: '85%',
  },
  categoryName: {
    fontFamily: FONTS.sfText,
    fontWeight: '600',
    fontSize: FONT_SIZE.md,
    color: COLORS.heading,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    gap: 6,
  },
  pageIndicator: {
    height: 6,
    borderRadius: 3,
  },
  pageIndicatorActive: {
    width: 28,
    backgroundColor: COLORS.primary,
  },
  pageIndicatorInactive: {
    width: 6,
    backgroundColor: '#D1D5DB',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
  },
  customizeBtnText: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    color: COLORS.heading,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: SPACING.sm,
  },
  modalHeaderInfo: {
    flex: 1,
    paddingRight: 10,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
  },
  modalSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  categoriesList: {
    maxHeight: 320,
    marginVertical: SPACING.xs,
  },
  categoryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  catRowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catThumbnailBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  catThumbnail: {
    width: '100%',
    height: '100%',
  },
  catRowName: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.heading,
  },
  doneBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  doneBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
});
