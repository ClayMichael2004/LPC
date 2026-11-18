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
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  Plus,
  Pencil,
  Trash2,
  Check,
} from 'lucide-react-native';
import AppHeader from '../../src/components/AppHeader';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { activitiesApi, adminApi } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - GRID_GAP) / 2;

export interface ActivityBadgeItem {
  id: string;
  title: string;
  desc: string;
  icon: 'clock' | 'brush' | 'heart' | 'sparkles' | 'mapPin';
  isNew?: boolean;
}

export interface GalleryPhotoItem {
  id: string;
  source: any;
  label: string;
  isCustomUri?: boolean;
}

const DEFAULT_ACTIVITY_BADGES: ActivityBadgeItem[] = [
  {
    id: 'badge-1',
    title: 'Sundays · 12:00 PM – 2:00 PM',
    desc: '2-hour guided painting workshop for kids and parents.',
    icon: 'clock',
    isNew: false,
  },
  {
    id: 'badge-2',
    title: 'Sketches & Oil Paints',
    desc: 'Sketch sheets, child-safe paints, and take-home canvas provided.',
    icon: 'brush',
    isNew: false,
  },
  {
    id: 'badge-3',
    title: 'Garden Terrace + Treat',
    desc: 'Held in our leafy terrace. Includes a sweet treat for every child.',
    icon: 'heart',
    isNew: false,
  },
];

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

const DEFAULT_GALLERY_PHOTOS: GalleryPhotoItem[] = [
  { id: '1', source: PRESET_GALLERY_IMAGES[0], label: 'Coloring the Sketch' },
  { id: '2', source: PRESET_GALLERY_IMAGES[1], label: 'Young Artist in Action' },
  { id: '3', source: PRESET_GALLERY_IMAGES[2], label: 'Sunday Garden Session' },
  { id: '4', source: PRESET_GALLERY_IMAGES[3], label: 'Oil Paints & Palette' },
  { id: '5', source: PRESET_GALLERY_IMAGES[4], label: 'Canvas Work in Progress' },
  { id: '6', source: PRESET_GALLERY_IMAGES[5], label: 'Family Joy & Creativity' },
  { id: '7', source: PRESET_GALLERY_IMAGES[6], label: 'Detailed Brushwork' },
  { id: '8', source: PRESET_GALLERY_IMAGES[7], label: 'Masterpiece Complete' },
];

const STORAGE_BADGES_KEY = '@lpc_activity_badges_v3';
const STORAGE_GALLERY_KEY = '@lpc_gallery_photos_v2';

const WHATSAPP_NUMBER = '254704769219';
const WHATSAPP_MESSAGE =
  'Hello Little Polo Cafe! I would like to book an appointment for the Sunday Family Painting activity (12:00 PM – 2:00 PM).';

export default function ActivitiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [badges, setBadges] = useState<ActivityBadgeItem[]>(DEFAULT_ACTIVITY_BADGES);
  const [gallery, setGallery] = useState<GalleryPhotoItem[]>(DEFAULT_GALLERY_PHOTOS);
  const [selectedImage, setSelectedImage] = useState<GalleryPhotoItem | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [whatsappTarget, setWhatsappTarget] = useState(WHATSAPP_NUMBER);

  // Badge Modal State
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [editingBadge, setEditingBadge] = useState<ActivityBadgeItem | null>(null);
  const [badgeTitle, setBadgeTitle] = useState('');
  const [badgeDesc, setBadgeDesc] = useState('');
  const [badgeIcon, setBadgeIcon] = useState<'clock' | 'brush' | 'heart' | 'sparkles' | 'mapPin'>('sparkles');
  const [badgeIsNew, setBadgeIsNew] = useState(true);

  // Photo Modal State
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoLabel, setPhotoLabel] = useState('');
  const [photoPresetIndex, setPhotoPresetIndex] = useState(0);
  const [customPhotoUri, setCustomPhotoUri] = useState('');

  // Load Badges from Storage
  useEffect(() => {
    (async () => {
      try {
        const rawBadges = await AsyncStorage.getItem(STORAGE_BADGES_KEY);
        if (rawBadges) {
          const parsed = JSON.parse(rawBadges);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBadges(parsed);
          }
        }
      } catch {
        // Keep default
      }
    })();
  }, []);

  // Load Gallery from Storage and Backend
  useEffect(() => {
    (async () => {
      try {
        const rawGallery = await AsyncStorage.getItem(STORAGE_GALLERY_KEY);
        if (rawGallery) {
          const parsed = JSON.parse(rawGallery);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const rehydrated = parsed.map((item: any) => {
              if (item.presetIndex !== undefined && PRESET_GALLERY_IMAGES[item.presetIndex]) {
                return { ...item, source: PRESET_GALLERY_IMAGES[item.presetIndex] };
              }
              if (item.uri) {
                return { ...item, source: { uri: item.uri }, isCustomUri: true };
              }
              return item;
            });
            setGallery(rehydrated);
          }
        }
      } catch {
        // Keep default
      }
    })();
  }, []);

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
      Linking.openURL(`https://wa.me/${whatsappTarget}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`);
    }
  };

  // --------------------------------------------------------------------------
  // Activity Badge Handlers (Admin)
  // --------------------------------------------------------------------------
  const openAddBadgeModal = () => {
    setEditingBadge(null);
    setBadgeTitle('');
    setBadgeDesc('');
    setBadgeIcon('sparkles');
    setBadgeIsNew(true);
    setBadgeModalVisible(true);
  };

  const openEditBadgeModal = (badge: ActivityBadgeItem) => {
    setEditingBadge(badge);
    setBadgeTitle(badge.title);
    setBadgeDesc(badge.desc);
    setBadgeIcon(badge.icon);
    setBadgeIsNew(!!badge.isNew);
    setBadgeModalVisible(true);
  };

  const handleSaveBadge = async () => {
    if (!badgeTitle.trim()) {
      Alert.alert('Required', 'Please enter a title for the activity card.');
      return;
    }

    let updated: ActivityBadgeItem[];
    if (editingBadge) {
      updated = badges.map((b) =>
        b.id === editingBadge.id
          ? {
              ...b,
              title: badgeTitle.trim(),
              desc: badgeDesc.trim(),
              icon: badgeIcon,
              isNew: badgeIsNew,
            }
          : b
      );
    } else {
      const newBadge: ActivityBadgeItem = {
        id: `badge-${Date.now()}`,
        title: badgeTitle.trim(),
        desc: badgeDesc.trim(),
        icon: badgeIcon,
        isNew: badgeIsNew,
      };
      updated = [...badges, newBadge];
    }

    setBadges(updated);
    setBadgeModalVisible(false);

    try {
      await AsyncStorage.setItem(STORAGE_BADGES_KEY, JSON.stringify(updated));
    } catch {
      // Storage error ignored
    }
  };

  const handleDeleteBadge = (badgeId: string) => {
    Alert.alert(
      'Remove Activity Badge',
      'Are you sure you want to remove this activity card from the customer view?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = badges.filter((b) => b.id !== badgeId);
            setBadges(updated);
            try {
              await AsyncStorage.setItem(STORAGE_BADGES_KEY, JSON.stringify(updated));
            } catch {
              // Ignore
            }
          },
        },
      ]
    );
  };

  // --------------------------------------------------------------------------
  // Gallery Handlers (Admin)
  // --------------------------------------------------------------------------
  const openAddPhotoModal = () => {
    setPhotoLabel('');
    setCustomPhotoUri('');
    setPhotoPresetIndex(0);
    setPhotoModalVisible(true);
  };

  const handleSavePhoto = async () => {
    if (!photoLabel.trim()) {
      Alert.alert('Required', 'Please provide a caption/description for this photo.');
      return;
    }

    const newId = `photo-${Date.now()}`;
    let newPhoto: GalleryPhotoItem;
    let serializableItem: any;

    if (customPhotoUri.trim()) {
      newPhoto = {
        id: newId,
        source: { uri: customPhotoUri.trim() },
        label: photoLabel.trim(),
        isCustomUri: true,
      };
      serializableItem = {
        id: newId,
        uri: customPhotoUri.trim(),
        label: photoLabel.trim(),
      };
    } else {
      newPhoto = {
        id: newId,
        source: PRESET_GALLERY_IMAGES[photoPresetIndex % PRESET_GALLERY_IMAGES.length],
        label: photoLabel.trim(),
      };
      serializableItem = {
        id: newId,
        presetIndex: photoPresetIndex % PRESET_GALLERY_IMAGES.length,
        label: photoLabel.trim(),
      };
    }

    const updated = [newPhoto, ...gallery];
    setGallery(updated);
    setPhotoModalVisible(false);

    try {
      const storedList = updated.map((item) => {
        if (item.isCustomUri && item.source?.uri) {
          return { id: item.id, uri: item.source.uri, label: item.label };
        }
        const foundIdx = PRESET_GALLERY_IMAGES.findIndex((p) => p === item.source);
        return {
          id: item.id,
          presetIndex: foundIdx >= 0 ? foundIdx : 0,
          label: item.label,
        };
      });
      await AsyncStorage.setItem(STORAGE_GALLERY_KEY, JSON.stringify(storedList));
      adminApi.addGalleryPhoto({
        source: customPhotoUri.trim() || `preset-${photoPresetIndex + 1}`,
        label: photoLabel.trim(),
      }).catch(() => {});
    } catch {
      // Ignore
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    Alert.alert(
      'Remove Photo',
      'Remove this photo from the event gallery?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = gallery.filter((p) => p.id !== photoId);
            setGallery(updated);
            try {
              const storedList = updated.map((item) => {
                if (item.isCustomUri && item.source?.uri) {
                  return { id: item.id, uri: item.source.uri, label: item.label };
                }
                const foundIdx = PRESET_GALLERY_IMAGES.findIndex((p) => p === item.source);
                return {
                  id: item.id,
                  presetIndex: foundIdx >= 0 ? foundIdx : 0,
                  label: item.label,
                };
              });
              await AsyncStorage.setItem(STORAGE_GALLERY_KEY, JSON.stringify(storedList));
              adminApi.deleteGalleryPhoto(photoId).catch(() => {});
            } catch {
              // Ignore
            }
          },
        },
      ]
    );
  };

  const renderBadgeIcon = (icon: ActivityBadgeItem['icon']) => {
    switch (icon) {
      case 'clock':
        return <Clock size={22} color={COLORS.serviceBlueIcon} strokeWidth={2.3} />;
      case 'brush':
        return <Brush size={22} color={COLORS.serviceBlueIcon} strokeWidth={2.3} />;
      case 'heart':
        return <Heart size={22} color={COLORS.serviceBlueIcon} strokeWidth={2.3} />;
      case 'mapPin':
        return <MapPin size={22} color={COLORS.serviceBlueIcon} strokeWidth={2.3} />;
      case 'sparkles':
      default:
        return <Sparkles size={22} color={COLORS.serviceBlueIcon} strokeWidth={2.3} />;
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

        {/* Section Header with Add Badge for Admin */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionHeaderTitle}>ACTIVITY HIGHLIGHTS</Text>
          {isAdmin && (
            <Pressable
              style={styles.adminActionBtn}
              onPress={openAddBadgeModal}
              accessibilityRole="button"
              accessibilityLabel="Add Activity Highlight"
            >
              <Plus size={15} color={COLORS.primary} strokeWidth={2.5} />
              <Text style={styles.adminActionBtnText}>Add Card</Text>
            </Pressable>
          )}
        </View>

        {/* Otto Mobile Pastel Detail Cards (Consistent Light Blue Tint) */}
        <View style={styles.highlightsContainer}>
          {badges.map((item) => (
            <View
              key={item.id}
              style={[styles.highlightCard, { backgroundColor: COLORS.serviceBlueTint }]}
            >
              <View style={[styles.highlightIconCircle, { backgroundColor: COLORS.white }]}>
                {renderBadgeIcon(item.icon)}
              </View>
              <View style={styles.highlightTextCol}>
                <View style={styles.highlightTitleRow}>
                  <Text style={[styles.highlightTitle, { color: COLORS.serviceBlueIcon }]}>
                    {item.title}
                  </Text>
                  {item.isNew && (
                    <View style={styles.newBadgePill}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.highlightDesc}>{item.desc}</Text>
              </View>

              {/* Admin Actions */}
              {isAdmin && (
                <View style={styles.badgeActionsRow}>
                  <Pressable
                    style={styles.badgeMiniBtn}
                    onPress={() => openEditBadgeModal(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Edit badge"
                  >
                    <Pencil size={15} color={COLORS.heading} strokeWidth={2.2} />
                  </Pressable>
                  <Pressable
                    style={styles.badgeMiniBtn}
                    onPress={() => handleDeleteBadge(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Delete badge"
                  >
                    <Trash2 size={15} color="#EF4444" strokeWidth={2.2} />
                  </Pressable>
                </View>
              )}
            </View>
          ))}
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

        {/* Event Photo Gallery */}
        <View style={styles.gallerySection}>
          <View style={styles.galleryHeaderRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}>EVENT GALLERY</Text>
              <Text style={styles.gallerySubtitle}>Recent moments at Little Polo</Text>
            </View>

            <View style={styles.galleryHeaderRight}>
              {isAdmin && (
                <Pressable
                  style={styles.adminActionBtn}
                  onPress={openAddPhotoModal}
                  accessibilityRole="button"
                  accessibilityLabel="Add Photo to Gallery"
                >
                  <Plus size={15} color={COLORS.primary} strokeWidth={2.5} />
                  <Text style={styles.adminActionBtnText}>Add Photo</Text>
                </Pressable>
              )}
              <View style={styles.photoCountPill}>
                <Text style={styles.photoCountText}>{gallery.length} Total</Text>
              </View>
            </View>
          </View>

          {/* 2-Column Photo Grid (4 Photos preview) */}
          <View style={styles.photoGrid}>
            {gallery.slice(0, 4).map((item) => (
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

                {/* Admin Delete Photo Button */}
                {isAdmin && (
                  <Pressable
                    style={styles.photoDeleteBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(item.id);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Delete photo"
                  >
                    <Trash2 size={13} color={COLORS.white} strokeWidth={2.4} />
                  </Pressable>
                )}
              </Pressable>
            ))}
          </View>

          {/* See More Button with Arrow */}
          <Pressable
            style={styles.seeMoreCard}
            onPress={() => router.push('/activities/gallery')}
            accessibilityRole="button"
            accessibilityLabel="See more gallery photos"
          >
            <View style={styles.seeMoreTextGroup}>
              <Text style={styles.seeMoreTitle}>See All Photos</Text>
              <Text style={styles.seeMoreSub}>
                View all {gallery.length} session pictures
              </Text>
            </View>
            <View style={styles.seeMoreArrowCircle}>
              <ArrowRight size={20} color={COLORS.white} strokeWidth={2.4} />
            </View>
          </Pressable>
        </View>

        {/* Book Appointment CTA Section: Strictly hidden for Admin */}
        {!isAdmin && (
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
        )}
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

      {/* Admin: Add / Edit Activity Badge Modal */}
      <Modal
        visible={badgeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBadgeModalVisible(false)}
      >
        <View style={styles.adminModalBackdrop}>
          <View style={styles.adminModalCard}>
            <View style={styles.adminModalHeader}>
              <Text style={styles.adminModalTitle}>
                {editingBadge ? 'Edit Activity Highlight' : 'New Activity Highlight'}
              </Text>
              <Pressable
                onPress={() => setBadgeModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={COLORS.heading} strokeWidth={2.3} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Clay Modeling Workshop"
                placeholderTextColor={COLORS.textSecondary}
                value={badgeTitle}
                onChangeText={setBadgeTitle}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Brief summary shown on customer card..."
                placeholderTextColor={COLORS.textSecondary}
                value={badgeDesc}
                onChangeText={setBadgeDesc}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Icon Symbol</Text>
              <View style={styles.iconSelectorRow}>
                {(['clock', 'brush', 'heart', 'sparkles', 'mapPin'] as const).map((ico) => (
                  <Pressable
                    key={ico}
                    style={[
                      styles.iconChoiceBtn,
                      badgeIcon === ico && styles.iconChoiceBtnActive,
                    ]}
                    onPress={() => setBadgeIcon(ico)}
                  >
                    {renderBadgeIcon(ico)}
                  </Pressable>
                ))}
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchTextCol}>
                  <Text style={styles.switchTitle}>Mark as "NEW" badge</Text>
                  <Text style={styles.switchSub}>Displays a pastel green NEW pill on customer side</Text>
                </View>
                <Switch
                  value={badgeIsNew}
                  onValueChange={setBadgeIsNew}
                  trackColor={{ false: '#E5E7EB', true: '#DCFCE7' }}
                  thumbColor={badgeIsNew ? '#16A34A' : '#9CA3AF'}
                />
              </View>

              <View style={styles.modalBtnRow}>
                <Pressable
                  style={styles.modalCancelBtn}
                  onPress={() => setBadgeModalVisible(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSaveBtn} onPress={handleSaveBadge}>
                  <Check size={18} color={COLORS.white} strokeWidth={2.4} />
                  <Text style={styles.modalSaveBtnText}>Save Card</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Admin: Add Gallery Photo Modal */}
      <Modal
        visible={photoModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.adminModalBackdrop}>
          <View style={styles.adminModalCard}>
            <View style={styles.adminModalHeader}>
              <Text style={styles.adminModalTitle}>Add Event Photo</Text>
              <Pressable
                onPress={() => setPhotoModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={COLORS.heading} strokeWidth={2.3} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Caption / Description</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Painting Masterpiece in Garden"
                placeholderTextColor={COLORS.textSecondary}
                value={photoLabel}
                onChangeText={setPhotoLabel}
              />

              <Text style={styles.inputLabel}>Choose from Cafe Photo Presets</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetScroll}
              >
                {PRESET_GALLERY_IMAGES.map((src, idx) => (
                  <Pressable
                    key={idx}
                    style={[
                      styles.presetThumbWrap,
                      photoPresetIndex === idx && !customPhotoUri && styles.presetThumbWrapActive,
                    ]}
                    onPress={() => {
                      setPhotoPresetIndex(idx);
                      setCustomPhotoUri('');
                    }}
                  >
                    <Image source={src} style={styles.presetThumb} resizeMode="cover" />
                    {photoPresetIndex === idx && !customPhotoUri && (
                      <View style={styles.presetActiveCheck}>
                        <Check size={12} color={COLORS.white} strokeWidth={2.8} />
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Or Remote Image URL (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="https://images.unsplash.com/..."
                placeholderTextColor={COLORS.textSecondary}
                value={customPhotoUri}
                onChangeText={setCustomPhotoUri}
                autoCapitalize="none"
              />

              <View style={styles.modalBtnRow}>
                <Pressable
                  style={styles.modalCancelBtn}
                  onPress={() => setPhotoModalVisible(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSaveBtn} onPress={handleSavePhoto}>
                  <Plus size={18} color={COLORS.white} strokeWidth={2.4} />
                  <Text style={styles.modalSaveBtnText}>Add Photo</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
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
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
  },
  adminActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.canvas,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  adminActionBtnText: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    color: COLORS.primary,
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
  highlightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  highlightTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  newBadgePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  newBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#075B35',
    letterSpacing: 0.5,
  },
  highlightDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 17,
  },
  badgeActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: SPACING.sm,
  },
  badgeMiniBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  stepsSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  stepsCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    ...SHADOW.soft,
  },
  stepAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  stepNumberText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primary,
  },
  stepTitle: {
    flex: 1,
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.heading,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  stepAccordionBody: {
    paddingLeft: 34,
    paddingRight: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  stepSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  stepDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.xs,
  },
  gallerySection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  galleryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  gallerySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  galleryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoCountPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    marginBottom: SPACING.md,
  },
  photoCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.35,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    ...SHADOW.soft,
    position: 'relative',
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  photoLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.white,
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeMoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.soft,
  },
  seeMoreTextGroup: {
    flex: 1,
  },
  seeMoreTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.heading,
    marginBottom: 2,
  },
  seeMoreSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  seeMoreArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaCard: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOW.soft,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.lg,
  },
  ctaIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  ctaMascot: {
    width: 44,
    height: 44,
  },
  ctaTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    width: '100%',
    marginBottom: SPACING.md,
  },
  waIcon: {
    marginRight: SPACING.sm,
  },
  whatsappButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
  ctaFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH * 0.92,
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: SCREEN_WIDTH * 1.1,
    borderRadius: RADIUS.xl,
  },
  modalCaption: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.white,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  adminModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  adminModalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: SPACING.xl,
    maxHeight: '85%',
  },
  adminModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  adminModalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
  },
  inputLabel: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.heading,
    marginTop: SPACING.sm,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.heading,
  },
  modalTextArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  iconSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.sm,
  },
  iconChoiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  iconChoiceBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FED7AA',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  switchTextCol: {
    flex: 1,
    marginRight: SPACING.md,
  },
  switchTitle: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.heading,
  },
  switchSub: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 13,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modalSaveBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 13,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
  presetScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  presetThumbWrap: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  presetThumbWrapActive: {
    borderColor: COLORS.primary,
  },
  presetThumb: {
    width: '100%',
    height: '100%',
  },
  presetActiveCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
