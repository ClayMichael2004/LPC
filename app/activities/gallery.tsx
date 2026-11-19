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
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, X, MessageCircle, ShieldCheck } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { activitiesApi, resolveUploadUrl } from '../../src/services/api';
import RefreshSpinnerHeader from '../../src/components/RefreshSpinnerHeader';
import { useAuth } from '../../src/context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - GRID_GAP) / 2;

const PRESET_GALLERY_IMAGES = [
  require('../../assets/activities/painting-1.jpg'),
  require('../../assets/activities/painting-2.jpg'),
  require('../../assets/activities/painting-3.jpg'),
  require('../../assets/activities/painting-4.jpg'),
  require('../../assets/activities/painting-5.jpg'),
  require('../../assets/activities/painting-6.jpg'),
  require('../../assets/activities/painting-7.jpg'),
  require('../../assets/activities/painting-8.jpg'),
];

export const ALL_GALLERY_PHOTOS = [
  { id: '1', source: PRESET_GALLERY_IMAGES[0], label: 'Coloring the Sketch' },
  { id: '2', source: PRESET_GALLERY_IMAGES[1], label: 'Young Artist in Action' },
  { id: '3', source: PRESET_GALLERY_IMAGES[2], label: 'Sunday Garden Session' },
  { id: '4', source: PRESET_GALLERY_IMAGES[3], label: 'Oil Paints & Palette' },
  { id: '5', source: PRESET_GALLERY_IMAGES[4], label: 'Canvas Work in Progress' },
  { id: '6', source: PRESET_GALLERY_IMAGES[5], label: 'Family Joy & Creativity' },
  { id: '7', source: PRESET_GALLERY_IMAGES[6], label: 'Detailed Brushwork' },
  { id: '8', source: PRESET_GALLERY_IMAGES[7], label: 'Masterpiece Complete' },
];

const STORAGE_GALLERY_KEY = '@lpc_gallery_photos_v2';

const WHATSAPP_NUMBER = '254704769219';
const WHATSAPP_MESSAGE =
  'Hello Little Polo Cafe! I would like to book an appointment for the Sunday Family Painting activity (12:00 PM – 2:00 PM).';

export default function ActivitiesGalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [photos, setPhotos] = useState<any[]>(ALL_GALLERY_PHOTOS);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const resolveGallerySource = (source: any) => {
    if (!source) return PRESET_GALLERY_IMAGES[0];
    if (typeof source === 'number') return source;
    if (typeof source === 'object' && source?.uri) return source;
    if (typeof source === 'string') {
      if (
        source.startsWith('data:image') ||
        source.startsWith('http://') ||
        source.startsWith('https://') ||
        source.startsWith('file://')
      ) {
        return { uri: source };
      }
      if (source.startsWith('/uploads') || source.startsWith('uploads/')) {
        return { uri: resolveUploadUrl(source) };
      }
      const match = source.match(/painting-(\d+)/);
      if (match && match[1]) {
        const idx = parseInt(match[1], 10) - 1;
        if (PRESET_GALLERY_IMAGES[idx]) return PRESET_GALLERY_IMAGES[idx];
      }
      return { uri: resolveUploadUrl(source) };
    }
    return source;
  };

  const loadPhotos = async () => {
    try {
      const serverPhotos = await activitiesApi.getGallery();
      if (Array.isArray(serverPhotos) && serverPhotos.length > 0) {
        const formatted = serverPhotos.map((item: any) => ({
          id: item.id,
          source: resolveGallerySource(item.source),
          label: item.label,
        }));
        setPhotos(formatted);
        return;
      }
    } catch {
      // Fallback
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_GALLERY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const rehydrated = parsed.map((item: any) => {
            if (item.presetIndex !== undefined && PRESET_GALLERY_IMAGES[item.presetIndex]) {
              return { ...item, source: PRESET_GALLERY_IMAGES[item.presetIndex] };
            }
            if (item.uri) {
              return { ...item, source: resolveGallerySource(item.uri) };
            }
            return item;
          });
          setPhotos(rehydrated);
        }
      }
    } catch {
      // Keep defaults
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadPhotos();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const handleBookViaWhatsApp = () => {
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/activities');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Symmetrical Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back to Activities"
        >
          <ChevronLeft size={24} color={COLORS.heading} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Event Gallery</Text>
          <Text style={styles.headerSub}>Sunday Family Oil Painting</Text>
        </View>

        {/* 22px spacer for mathematical symmetry */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="transparent"
            colors={['#E11D48']}
          />
        }
      >
        <RefreshSpinnerHeader refreshing={isRefreshing} label="Refreshing gallery photos..." />

        <View style={styles.introRow}>
          <Text style={styles.introText}>
            Tap any photo to expand. Held Sundays 12–2 PM.
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{photos.length} Photos</Text>
          </View>
        </View>

        {/* Full 2-Column Photo Grid */}
        <View style={styles.photoGrid}>
          {photos.map((item) => (
            <Pressable
              key={item.id}
              style={styles.photoCard}
              onPress={() => setSelectedImage(item)}
              accessibilityRole="button"
              accessibilityLabel={`View ${item.label}`}
            >
              <Image
                source={item.source}
                style={styles.photoThumbnail}
                resizeMode="cover"
                defaultSource={PRESET_GALLERY_IMAGES[0]}
              />
              <View style={styles.photoOverlay}>
                <Text style={styles.photoLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* WhatsApp Booking Card: Hidden for admin */}
        {!isAdmin && (
          <View style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Book Sunday Painting</Text>
            <Text style={styles.ctaSubtitle}>
              Reserve materials and a spot for your child.
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
              <Text style={styles.ctaFooterText}>WhatsApp +254 704 769 219</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fullscreen Photo Viewer Modal */}
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
                defaultSource={PRESET_GALLERY_IMAGES[0]}
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
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.heading,
  },
  headerSub: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  introRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  introText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  countBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  countText: {
    fontFamily: FONTS.semibold,
    fontSize: 11,
    color: COLORS.heading,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: SPACING.xl,
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
  ctaCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.soft,
    marginBottom: SPACING.xl,
  },
  ctaTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
    textAlign: 'center',
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  whatsappButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
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
