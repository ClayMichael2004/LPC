import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
} from 'react-native';
import { PROMO_BANNERS } from '../constants/menuData';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = SPACING.md;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2;

export default function BannerCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isInteracting = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isInteracting.current) return;
      const nextIndex = (activeIndex + 1) % PROMO_BANNERS.length;
      scrollRef.current?.scrollTo({
        x: nextIndex * (CARD_WIDTH + SPACING.sm),
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, 4500);

    return () => clearInterval(timer);
  }, [activeIndex]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + SPACING.sm));
    if (index !== activeIndex && index >= 0 && index < PROMO_BANNERS.length) {
      setActiveIndex(index);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + SPACING.sm}
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
        {PROMO_BANNERS.map((banner, index) => (
          <View key={banner.id} style={styles.cardContainer}>
            <Image
              source={banner.image}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </View>
        ))}
      </ScrollView>

      {/* Pagination Indicator Dots */}
      <View style={styles.paginationRow}>
        {PROMO_BANNERS.map((_, index) => {
          const isActive = index === activeIndex;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                isActive ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
  },
  scrollContent: {
    paddingLeft: CARD_MARGIN,
    paddingRight: CARD_MARGIN - SPACING.sm,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: 195,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    marginRight: SPACING.sm,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 32,
    backgroundColor: '#18181B',
  },
  inactiveDot: {
    width: 6,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    backgroundColor: 'transparent',
  },
});
