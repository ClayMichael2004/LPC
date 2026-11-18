import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Coffee,
  Sparkles,
  Flame,
  Clock,
  ArrowRight,
  Palette,
  Plus,
  Pencil,
  Trash2,
  X,
  Heart,
  Star,
} from 'lucide-react-native';
import AppHeader from '../../src/components/AppHeader';
import BannerCarousel from '../../src/components/BannerCarousel';
import BrowseCategoriesSlideshow from '../../src/components/BrowseCategoriesSlideshow';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useCategory } from '../../src/context/CategoryContext';
import { useAuth } from '../../src/context/AuthContext';
import { adminApi } from '../../src/services/api';
import { SpecialPromo } from '../../src/types';

const INITIAL_SPECIALS: SpecialPromo[] = [
  {
    id: 'special-1',
    title: '18-Hour Cold Brews',
    description: 'Steeped with single-origin Kenyan beans and finished with vanilla sweet cream.',
    category: 'artisan-coffee',
    iconName: 'coffee',
    badge: 'Cold Brew',
    tintColor: '#DBEAFE',
    iconColor: '#07345F',
  },
  {
    id: 'special-2',
    title: 'Brioche Burgers & Bakes',
    description: 'Artisanal house relish, melted cheddar, and crisp fresh patties.',
    category: 'burgers',
    iconName: 'flame',
    badge: 'Special Grill',
    tintColor: '#DCFCE7',
    iconColor: '#075B35',
  },
  {
    id: 'special-3',
    title: 'Kisumu Lakeview Brunch',
    description: 'Fluffy buttermilk pancakes, wildflower honey, and fresh fruit bowls.',
    category: 'breakfast',
    iconName: 'sparkles',
    badge: 'Brunch',
    tintColor: '#FCE7F3',
    iconColor: '#691414',
  },
  {
    id: 'special-4',
    title: 'Sunday Family Oil Painting',
    description: 'Sundays 12–2 PM: Fun guided sketches & oil paints for little ones in our garden terrace.',
    category: 'activities',
    iconName: 'palette',
    badge: 'Workshop',
    tintColor: '#E5D9FF',
    iconColor: '#4C1D95',
  },
];

const PASTEL_THEMES = [
  { bg: '#DBEAFE', icon: '#07345F', name: 'Blue' },
  { bg: '#DCFCE7', icon: '#075B35', name: 'Green' },
  { bg: '#FCE7F3', icon: '#691414', name: 'Pink' },
  { bg: '#E5D9FF', icon: '#4C1D95', name: 'Purple' },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectCategoryAndNavigate } = useCategory();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [specials, setSpecials] = useState<SpecialPromo[]>(INITIAL_SPECIALS);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState<SpecialPromo | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('artisan-coffee');
  const [formIcon, setFormIcon] = useState('coffee');
  const [formTheme, setFormTheme] = useState(PASTEL_THEMES[0]);

  useEffect(() => {
    let mounted = true;
    adminApi
      .getSpecials()
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setSpecials(data);
        }
      })
      .catch(() => {
        // Fallback to initial
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleOpenAddModal = () => {
    setEditingSpecial(null);
    setFormTitle('');
    setFormDesc('');
    setFormCategory('artisan-coffee');
    setFormIcon('coffee');
    setFormTheme(PASTEL_THEMES[0]);
    setIsModalVisible(true);
  };

  const handleOpenEditModal = (spec: SpecialPromo) => {
    setEditingSpecial(spec);
    setFormTitle(spec.title);
    setFormDesc(spec.description);
    setFormCategory(spec.category || 'artisan-coffee');
    setFormIcon(spec.iconName || 'coffee');
    const matchedTheme =
      PASTEL_THEMES.find((t) => t.bg === spec.tintColor) || PASTEL_THEMES[0];
    setFormTheme(matchedTheme);
    setIsModalVisible(true);
  };

  const handleSaveSpecial = async () => {
    if (!formTitle.trim()) {
      return;
    }

    const payload: SpecialPromo = {
      id: editingSpecial?.id || `special-${Date.now()}`,
      title: formTitle.trim(),
      description: formDesc.trim(),
      category: formCategory,
      iconName: formIcon,
      badge: 'Special',
      tintColor: formTheme.bg,
      iconColor: formTheme.icon,
      isActive: true,
    };

    if (editingSpecial) {
      setSpecials((prev) => prev.map((s) => (s.id === editingSpecial.id ? payload : s)));
    } else {
      setSpecials((prev) => [payload, ...prev]);
    }

    setIsModalVisible(false);

    try {
      await adminApi.createSpecial(payload);
    } catch {
      // Handled silently
    }
  };

  const handleDeleteSpecial = async (id: string) => {
    setSpecials((prev) => prev.filter((s) => s.id !== id));
    try {
      await adminApi.deleteSpecial(id);
    } catch {
      // Handled silently
    }
  };

  const renderIcon = (name: string, color: string) => {
    switch (name) {
      case 'flame':
        return <Flame size={24} color={color} strokeWidth={2.2} />;
      case 'sparkles':
        return <Sparkles size={24} color={color} strokeWidth={2.2} />;
      case 'palette':
        return <Palette size={24} color={color} strokeWidth={2.2} />;
      case 'heart':
        return <Heart size={24} color={color} strokeWidth={2.2} />;
      case 'star':
        return <Star size={24} color={color} strokeWidth={2.2} />;
      case 'coffee':
      default:
        return <Coffee size={24} color={color} strokeWidth={2.2} />;
    }
  };

  const handleSpecialPress = (spec: SpecialPromo) => {
    if (spec.category === 'activities') {
      router.push('/(tabs)/activities');
    } else {
      selectCategoryAndNavigate(spec.category);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 }]}
      >
        {/* Top Hero Cards */}
        <BannerCarousel />

        {/* Browse Categories (Slideshow + customizable cards for admin) */}
        <BrowseCategoriesSlideshow />

        {/* Otto Standard Pastel Feature Cards — Today's Specials */}
        <View style={styles.highlightsSection}>
          <View style={styles.specialsHeaderRow}>
            <Text style={styles.sectionTitle}>TODAY'S SPECIALS</Text>
            {isAdmin && (
              <Pressable
                style={styles.addSpecialBtn}
                onPress={handleOpenAddModal}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Add new special"
              >
                <Plus size={14} color={COLORS.white} strokeWidth={2.5} />
                <Text style={styles.addSpecialBtnText}>Add Special</Text>
              </Pressable>
            )}
          </View>

          {specials.map((spec) => {
            const tint = spec.tintColor || '#DBEAFE';
            const iconCol = spec.iconColor || '#07345F';

            return (
              <View key={spec.id} style={styles.cardWrapper}>
                <Pressable
                  onPress={() => handleSpecialPress(spec)}
                  style={[styles.featureCard, { backgroundColor: tint }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Special: ${spec.title}`}
                >
                  <View style={[styles.featureIconCircle, { backgroundColor: '#FFFFFF' }]}>
                    {renderIcon(spec.iconName, iconCol)}
                  </View>
                  <View style={styles.featureInfo}>
                    <Text style={[styles.featureTitle, { color: iconCol }]}>
                      {spec.title}
                    </Text>
                    <Text style={styles.featureDesc}>{spec.description}</Text>
                  </View>
                  <ArrowRight size={20} color={iconCol} strokeWidth={2.2} />
                </Pressable>

                {isAdmin && (
                  <View style={styles.adminCardActions}>
                    <Pressable
                      style={styles.cardActionCircle}
                      onPress={() => handleOpenEditModal(spec)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Pencil size={13} color="#374151" strokeWidth={2.4} />
                    </Pressable>
                    <Pressable
                      style={[styles.cardActionCircle, { backgroundColor: '#FEE2E2' }]}
                      onPress={() => handleDeleteSpecial(spec.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Trash2 size={13} color="#DC2626" strokeWidth={2.4} />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Quick Delivery Guarantee Note */}
        <View style={styles.deliveryNoteCard}>
          <Clock size={18} color={COLORS.primary} strokeWidth={2.2} />
          <Text style={styles.deliveryNoteText}>
            Delivering hot & fresh to East Kisumu, LBDA HQ & Milimani in 20–30 mins.
          </Text>
        </View>
      </ScrollView>

      {/* Add / Edit Special Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSpecial ? 'Edit Special Banner' : 'Add Today\'s Special'}
              </Text>
              <Pressable
                onPress={() => setIsModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={COLORS.heading} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              <Text style={styles.fieldLabel}>Banner Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 18-Hour Cold Brews"
                placeholderTextColor="#9CA3AF"
                value={formTitle}
                onChangeText={setFormTitle}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Short mouthwatering highlights..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                value={formDesc}
                onChangeText={setFormDesc}
              />

              <Text style={styles.fieldLabel}>Category / Target</Text>
              <View style={styles.chipGroup}>
                {[
                  { id: 'artisan-coffee', label: 'Coffee' },
                  { id: 'burgers', label: 'Burgers' },
                  { id: 'breakfast', label: 'Brunch' },
                  { id: 'activities', label: 'Activities' },
                ].map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setFormCategory(cat.id)}
                    style={[
                      styles.choiceChip,
                      formCategory === cat.id && styles.choiceChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        formCategory === cat.id && styles.choiceChipTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Icon</Text>
              <View style={styles.chipGroup}>
                {['coffee', 'flame', 'sparkles', 'palette', 'heart', 'star'].map((ic) => (
                  <Pressable
                    key={ic}
                    onPress={() => setFormIcon(ic)}
                    style={[
                      styles.iconChoiceBtn,
                      formIcon === ic && styles.iconChoiceBtnSelected,
                    ]}
                  >
                    {renderIcon(ic, formIcon === ic ? COLORS.primary : '#6B7280')}
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Pastel Color Tint</Text>
              <View style={styles.themeGroup}>
                {PASTEL_THEMES.map((theme, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setFormTheme(theme)}
                    style={[
                      styles.themePill,
                      { backgroundColor: theme.bg, borderColor: theme.icon },
                      formTheme.bg === theme.bg && styles.themePillSelected,
                    ]}
                  >
                    <Text style={[styles.themePillText, { color: theme.icon }]}>
                      {theme.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.saveBtn} onPress={handleSaveSpecial}>
                <Text style={styles.saveBtnText}>
                  {editingSpecial ? 'Save Changes' : 'Add Special Banner'}
                </Text>
              </Pressable>
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
  specialsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontFamily: FONTS.sfDisplay,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.heading,
    letterSpacing: 0.5,
  },
  addSpecialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  addSpecialBtnText: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    color: COLORS.white,
  },
  cardWrapper: {
    position: 'relative',
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  adminCardActions: {
    position: 'absolute',
    top: 8,
    right: 36,
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
  },
  cardActionCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  featureIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: SPACING.sm,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
  },
  modalBody: {
    gap: 12,
    paddingBottom: 20,
  },
  fieldLabel: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.heading,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.heading,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  choiceChipSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  choiceChipText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#4B5563',
  },
  choiceChipTextSelected: {
    color: '#07345F',
    fontFamily: FONTS.semibold,
  },
  iconChoiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChoiceBtnSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FEE2E2',
  },
  themeGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  themePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  themePillSelected: {
    borderWidth: 2.5,
  },
  themePillText: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  saveBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
});
