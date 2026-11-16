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
} from 'react-native';
import { useRouter } from 'expo-router';
import { CATEGORIES } from '../constants/menuData';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../constants/theme';
import { Category } from '../types';
import { useCategory } from '../context/CategoryContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH - SPACING.lg * 2;

export default function BrowseCategoriesSlideshow() {
  const router = useRouter();
  const { selectCategoryAndNavigate } = useCategory();
  const [activePage, setActivePage] = useState(0);
  const activePageRef = useRef(0);
  activePageRef.current = activePage;
  const scrollRef = useRef<ScrollView>(null);
  const isInteracting = useRef(false);

  // Split categories into chunks of 4 (2x2 grid per page)
  const pages: Category[][] = [];
  for (let i = 0; i < CATEGORIES.length; i += 4) {
    pages.push(CATEGORIES.slice(i, i + 4));
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
      <Text style={styles.sectionHeader}>BROWSE CATEGORIES</Text>

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
});
