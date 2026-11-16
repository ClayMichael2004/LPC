import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Coffee, Sparkles, Flame, Clock, ArrowRight } from 'lucide-react-native';
import AppHeader from '../../src/components/AppHeader';
import BannerCarousel from '../../src/components/BannerCarousel';
import BrowseCategoriesSlideshow from '../../src/components/BrowseCategoriesSlideshow';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
      >
        {/* Top Hero Cards (Auto-advancing interval + manual horizontal scroll) */}
        <BannerCarousel />

        {/* Browse Categories (4-card slideshow grid + interval rotation) */}
        <BrowseCategoriesSlideshow />

        {/* Otto Standard Pastel Feature Cards — Kisumu Cafe Highlights */}
        <View style={styles.highlightsSection}>
          <Text style={styles.sectionTitle}>TODAY'S SPECIALS</Text>

          {/* Feature Card 1: Blue Tint */}
          <Pressable
            onPress={() => router.push({ pathname: '/(tabs)/menu', params: { categoryId: 'artisan-coffee' } })}
            style={[styles.featureCard, { backgroundColor: COLORS.serviceBlueTint }]}
            accessibilityRole="button"
            accessibilityLabel="Explore Artisan Cold Brews"
          >
            <View style={[styles.featureIconCircle, { backgroundColor: '#FFFFFF' }]}>
              <Coffee size={24} color={COLORS.serviceBlueIcon} strokeWidth={2.2} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={[styles.featureTitle, { color: COLORS.serviceBlueIcon }]}>
                18-Hour Cold Brews
              </Text>
              <Text style={styles.featureDesc}>
                Steeped with single-origin Kenyan beans and finished with vanilla sweet cream.
              </Text>
            </View>
            <ArrowRight size={20} color={COLORS.serviceBlueIcon} strokeWidth={2.2} />
          </Pressable>

          {/* Feature Card 2: Green Tint */}
          <Pressable
            onPress={() => router.push({ pathname: '/(tabs)/menu', params: { categoryId: 'burgers' } })}
            style={[styles.featureCard, { backgroundColor: COLORS.serviceGreenTint }]}
            accessibilityRole="button"
            accessibilityLabel="Explore Fresh Grilled Gourmet Burgers"
          >
            <View style={[styles.featureIconCircle, { backgroundColor: '#FFFFFF' }]}>
              <Flame size={24} color={COLORS.serviceGreenIcon} strokeWidth={2.2} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={[styles.featureTitle, { color: COLORS.serviceGreenIcon }]}>
                Brioche Burgers & Bakes
              </Text>
              <Text style={styles.featureDesc}>
                Artisanal house relish, melted cheddar, and crisp fresh patties.
              </Text>
            </View>
            <ArrowRight size={20} color={COLORS.serviceGreenIcon} strokeWidth={2.2} />
          </Pressable>

          {/* Feature Card 3: Pink Tint */}
          <Pressable
            onPress={() => router.push({ pathname: '/(tabs)/menu', params: { categoryId: 'breakfast' } })}
            style={[styles.featureCard, { backgroundColor: COLORS.servicePinkTint }]}
            accessibilityRole="button"
            accessibilityLabel="Explore Sunrise Breakfast"
          >
            <View style={[styles.featureIconCircle, { backgroundColor: '#FFFFFF' }]}>
              <Sparkles size={24} color={COLORS.servicePinkIcon} strokeWidth={2.2} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={[styles.featureTitle, { color: COLORS.servicePinkIcon }]}>
                Kisumu Lakeview Brunch
              </Text>
              <Text style={styles.featureDesc}>
                Fluffy buttermilk pancakes, wildflower honey, and fresh fruit bowls.
              </Text>
            </View>
            <ArrowRight size={20} color={COLORS.servicePinkIcon} strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* Quick Delivery Guarantee Note */}
        <View style={styles.deliveryNoteCard}>
          <Clock size={18} color={COLORS.primary} strokeWidth={2.2} />
          <Text style={styles.deliveryNoteText}>
            Delivering hot & fresh to East Kisumu, LBDA HQ & Milimani in 20–30 mins.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
  highlightsSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOW.soft,
  },
  featureIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    ...SHADOW.subtle,
  },
  featureInfo: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  featureTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    marginBottom: 2,
  },
  featureDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.bodyText,
    lineHeight: 16,
  },
  deliveryNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  deliveryNoteText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.primaryDark,
    lineHeight: 16,
  },
});
