import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Palette,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Heart,
  MessageCircle,
  X,
  Brush,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react-native';
import AppHeader from '../../src/components/AppHeader';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { activitiesApi } from '../../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - GRID_GAP) / 2;

const GALLERY_PHOTOS = [
  { id: '1', source: require('../../assets/activities/painting-1.jpg'), label: 'Coloring the Sketch' },
  { id: '2', source: require('../../assets/activities/painting-2.jpg'), label: 'Young Artist in Action' },
  { id: '3', source: require('../../assets/activities/painting-3.jpg'), label: 'Sunday Garden Session' },
  { id: '4', source: require('../../assets/activities/painting-4.jpg'), label: 'Oil Paints & Palette' },
  { id: '5', source: require('../../assets/activities/painting-5.jpg'), label: 'Canvas Work in Progress' },
  { id: '6', source: require('../../assets/activities/painting-6.jpg'), label: 'Family Joy & Creativity' },
  { id: '7', source: require('../../assets/activities/painting-7.jpg'), label: 'Detailed Brushwork' },
  { id: '8', source: require('../../assets/activities/painting-8.jpg'), label: 'Masterpiece Complete' },
];

const WHATSAPP_NUMBER = '254704769219';
const WHATSAPP_MESSAGE =
  'Hello Little Polo Cafe! I would like to book an appointment for the Sunday Family Painting activity (12:00 PM – 2:00 PM).';

export default function ActivitiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [whatsappTarget, setWhatsappTarget] = useState(WHATSAPP_NUMBER);

  useEffect(() => {
    let mounted = true;
    activitiesApi
      .getActivities()
      .then((list) => {
        if (mounted && Array.isArray(list) && list.length > 0 && list[0].whatsappNumber) {
          setWhatsappTarget(list[0].whatsappNumber);
        }
      })
      .catch(() => {
        // Keep local default
      });
    return () => {
      mounted = false;
    };
  }, []);

  const toggleStep = (step: number) => {
    setExpandedStep((prev) => (prev === step ? null : step));
  };

  const handleBookViaWhatsApp = async () => {
    const url = `https://wa.me/${whatsappTarget}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://api.whatsapp.com/send?phone=${whatsappTarget}&text=${encodeURIComponent(WHATSAPP_MESSAGE)}`);
      }
    } catch {
      // Fallback direct web WhatsApp link
      Linking.openURL(`https://wa.me/${whatsappTarget}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 }]}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Sunday Family Oil Painting</Text>
          <Text style={styles.heroSubtitle}>
            Guided sketches, child-safe oil paints, and creative fun in our cafe garden.
          </Text>
        </View>

        {/* Otto Mobile Pastel Detail Cards (Consistent Light Blue Tint) */}
        <View style={styles.highlightsContainer}>
          {/* Card 1: Schedule */}
          <View style={[styles.highlightCard, { backgroundColor: COLORS.serviceBlueTint }]}>
            <View style={[styles.highlightIconCircle, { backgroundColor: COLORS.white }]}>
              <Clock size={22} color={COLORS.serviceBlueIcon} strokeWidth={2.3} />
            </View>
            <View style={styles.highlightTextCol}>
              <Text style={[styles.highlightTitle, { color: COLORS.serviceBlueIcon }]}>
                Sundays · 12:00 PM – 2:00 PM
              </Text>
              <Text style={styles.highlightDesc}>
                2-hour guided painting workshop for kids and parents.
              </Text>
            </View>
          </View>

          {/* Card 2: Materials & Sketches */}
          <View style={[styles.highlightCard, { backgroundColor: COLORS.serviceBlueTint }]}>
            <View style={[styles.highlightIconCircle, { backgroundColor: COLORS.white }]}>
              <Brush size={22} color={COLORS.serviceBlueIcon} strokeWidth={2.3} />
            </View>
            <View style={styles.highlightTextCol}>
              <Text style={[styles.highlightTitle, { color: COLORS.serviceBlueIcon }]}>
                Sketches & Oil Paints
              </Text>
              <Text style={styles.highlightDesc}>
                Sketch sheets, child-safe paints, and take-home canvas provided.
              </Text>
            </View>
          </View>

          {/* Card 3: Location & Treats */}
          <View style={[styles.highlightCard, { backgroundColor: COLORS.serviceBlueTint }]}>
            <View style={[styles.highlightIconCircle, { backgroundColor: COLORS.white }]}>
              <Heart size={22} color={COLORS.serviceBlueIcon} strokeWidth={2.3} />
            </View>
            <View style={styles.highlightTextCol}>
              <Text style={[styles.highlightTitle, { color: COLORS.serviceBlueIcon }]}>
                Garden Terrace + Treat
              </Text>
              <Text style={styles.highlightDesc}>
                Held in our leafy terrace. Includes a sweet treat for every child.
              </Text>
            </View>
          </View>
        </View>

        {/* How It Works Accordion */}
        <View style={styles.stepsSection}>
          <Text style={styles.sectionHeaderTitle}>HOW IT WORKS</Text>
          
          <View style={styles.stepsCard}>
            {/* Step 1 */}
            <Pressable
              style={styles.stepAccordionHeader}
              onPress={() => toggleStep(1)}
              accessibilityRole="button"
              accessibilityLabel="Step 1: Pick a Sketch Outline"
            >
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepTitle}>Pick a Sketch Outline</Text>
              <ChevronDown
                size={18}
                color={COLORS.textSecondary}
                style={[styles.chevron, expandedStep === 1 && styles.chevronRotated]}
              />
            </Pressable>
            {expandedStep === 1 && (
              <View style={styles.stepAccordionBody}>
                <Text style={styles.stepSubtitle}>
                  Choose a cartoon or animal outline sketch to paint.
                </Text>
              </View>
            )}

            <View style={styles.stepDivider} />

            {/* Step 2 */}
            <Pressable
              style={styles.stepAccordionHeader}
              onPress={() => toggleStep(2)}
              accessibilityRole="button"
              accessibilityLabel="Step 2: Paint with Oil Colors"
            >
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepTitle}>Paint with Oil Colors</Text>
              <ChevronDown
                size={18}
                color={COLORS.textSecondary}
                style={[styles.chevron, expandedStep === 2 && styles.chevronRotated]}
              />
            </Pressable>
            {expandedStep === 2 && (
              <View style={styles.stepAccordionBody}>
                <Text style={styles.stepSubtitle}>
                  Paint with vibrant colors and friendly guide tips.
                </Text>
              </View>
            )}

            <View style={styles.stepDivider} />

            {/* Step 3 */}
            <Pressable
              style={styles.stepAccordionHeader}
              onPress={() => toggleStep(3)}
              accessibilityRole="button"
              accessibilityLabel="Step 3: Take Your Artwork Home"
            >
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepTitle}>Take Your Artwork Home</Text>
              <ChevronDown
                size={18}
                color={COLORS.textSecondary}
                style={[styles.chevron, expandedStep === 3 && styles.chevronRotated]}
              />
            </Pressable>
            {expandedStep === 3 && (
              <View style={styles.stepAccordionBody}>
                <Text style={styles.stepSubtitle}>
                  Take home your finished canvas to display!
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Event Photo Gallery (At Most 4 Photos Preview) */}
        <View style={styles.gallerySection}>
          <View style={styles.galleryHeaderRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}>EVENT GALLERY</Text>
              <Text style={styles.gallerySubtitle}>Recent moments at Little Polo</Text>
            </View>
            <View style={styles.photoCountPill}>
              <Text style={styles.photoCountText}>{GALLERY_PHOTOS.length} Total</Text>
            </View>
          </View>

          {/* 2-Column Photo Grid (4 Photos preview) */}
          <View style={styles.photoGrid}>
            {GALLERY_PHOTOS.slice(0, 4).map((item) => (
              <Pressable
                key={item.id}
                style={styles.photoCard}
                onPress={() => setSelectedImage(item)}
                accessibilityRole="button"
                accessibilityLabel={`View ${item.label}`}
              >
                <Image source={item.source} style={styles.photoThumbnail} resizeMode="cover" />
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* See More Button with Arrow (Icon removed from left) */}
          <Pressable
            style={styles.seeMoreCard}
            onPress={() => router.push('/activities/gallery')}
            accessibilityRole="button"
            accessibilityLabel="See more gallery photos"
          >
            <View style={styles.seeMoreTextGroup}>
              <Text style={styles.seeMoreTitle}>See All Photos</Text>
              <Text style={styles.seeMoreSub}>
                View all {GALLERY_PHOTOS.length} session pictures
              </Text>
            </View>
            <View style={styles.seeMoreArrowCircle}>
              <ArrowRight size={20} color={COLORS.white} strokeWidth={2.4} />
            </View>
          </Pressable>
        </View>

        {/* Book Appointment CTA Section */}
        <View style={styles.ctaCard}>
          <View style={styles.ctaIconContainer}>
            <Image
              source={require('../../assets/images/little-polo-logo.png')}
              style={styles.ctaMascot}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.ctaTitle}>Book Sunday Painting</Text>
          <Text style={styles.ctaSubtitle}>
            Limited spots every Sunday. Reserve via WhatsApp.
          </Text>

          <Pressable
            style={styles.whatsappButton}
            onPress={handleBookViaWhatsApp}
            accessibilityRole="button"
            accessibilityLabel="Book an Appointment via WhatsApp"
          >
            <MessageCircle size={22} color={COLORS.white} strokeWidth={2.4} style={styles.waIcon} />
            <Text style={styles.whatsappButtonText}>Book via WhatsApp</Text>
          </Pressable>

          <View style={styles.ctaFooterRow}>
            <ShieldCheck size={14} color={COLORS.textSecondary} strokeWidth={2} />
            <Text style={styles.ctaFooterText}>
              WhatsApp +254 704 769 219
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Fullscreen Photo Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalCloseButton} onPress={() => setSelectedImage(null)}>
            <X size={26} color={COLORS.white} strokeWidth={2.5} />
          </Pressable>

          {selectedImage && (
            <View style={styles.modalContent}>
              <Image
                source={selectedImage.source}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <Text style={styles.modalCaption}>{selectedImage.label}</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingTop: SPACING.md,
  },
  heroSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE7F3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.primaryDark,
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.heading,
    letterSpacing: -0.5,
    marginTop: 6,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
  highlightsContainer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    ...SHADOW.soft,
  },
  highlightIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  highlightTextCol: {
    flex: 1,
  },
  highlightTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    marginBottom: 2,
  },
  highlightDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 17,
  },
  stepsSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  sectionHeaderSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  stepsCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.soft,
  },
  stepAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  stepNumberText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
  },
  stepTitle: {
    flex: 1,
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.heading,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  stepAccordionBody: {
    paddingLeft: 42,
    paddingRight: SPACING.sm,
    paddingTop: 4,
    paddingBottom: 6,
  },
  stepSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  stepDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 6,
    marginLeft: 42,
  },
  gallerySection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  galleryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  gallerySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  photoCountPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  photoCountText: {
    fontFamily: FONTS.semibold,
    fontSize: 11,
    color: COLORS.heading,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  photoCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.35,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    ...SHADOW.soft,
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  photoLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.white,
  },
  seeMoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    ...SHADOW.soft,
  },
  seeMoreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  seeMoreIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  seeMoreTextGroup: {
    flex: 1,
  },
  seeMoreTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.heading,
  },
  seeMoreSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  seeMoreArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  ctaCard: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.soft,
  },
  ctaIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  ctaMascot: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  ctaTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.heading,
    textAlign: 'center',
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  whatsappButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A', // WhatsApp green
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    ...SHADOW.soft,
    marginBottom: SPACING.sm,
  },
  waIcon: {
    marginRight: 8,
  },
  whatsappButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
  ctaFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ctaFooterText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalContent: {
    width: '100%',
    alignItems: 'center',
  },
  modalImage: {
    width: SCREEN_WIDTH - SPACING.xl * 2,
    height: (SCREEN_WIDTH - SPACING.xl * 2) * 1.35,
    borderRadius: RADIUS.xl,
  },
  modalCaption: {
    fontFamily: FONTS.semibold,
    fontSize: 16,
    color: COLORS.white,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});
