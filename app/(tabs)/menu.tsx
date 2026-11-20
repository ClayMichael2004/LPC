import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  X,
  Plus,
  Pencil,
  Trash2,
  Camera,
  ImageIcon,
  Sparkles,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AppHeader from '../../src/components/AppHeader';
import MenuItemRow from '../../src/components/MenuItemRow';
import CartFloatingBar from '../../src/components/CartFloatingBar';
import FeedbackModal from '../../src/components/FeedbackModal';
import { MENU_TABS, PRODUCTS } from '../../src/constants/menuData';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useCart } from '../../src/context/CartContext';
import { useCategory } from '../../src/context/CategoryContext';
import { useAuth } from '../../src/context/AuthContext';
import { adminApi, resolveBackendImage } from '../../src/services/api';
import { Product } from '../../src/types';

const FOOD_PRESETS = [
  { id: 'burger-boss', name: 'Boss Burger', image: require('../../assets/images/burger-boss.png') },
  { id: 'burger-colonel', name: 'Colonel Burger', image: require('../../assets/images/burger-colonel.png') },
  { id: 'burger-crunch', name: 'Crunch Burger', image: require('../../assets/images/burger-crunch.png') },
  { id: 'burger-meal', name: 'Burger Meal', image: require('../../assets/images/burger-meal.png') },
  { id: 'cold-brew', name: 'Cold Brew', image: require('../../assets/images/cold-brew.jpg') },
  { id: 'croissant', name: 'Flaky Croissant', image: require('../../assets/images/croissant.jpg') },
  { id: 'pancakes', name: 'Pancakes', image: require('../../assets/images/pancakes.jpg') },
  { id: 'latte', name: 'Vanilla Latte', image: require('../../assets/images/latte.jpg') },
  { id: 'soda-2l', name: 'Soda 2L', image: require('../../assets/images/soda-2l.png') },
];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const {
    selectedCategory,
    setSelectedCategory,
    categories,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
  } = useCategory();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const tabScrollRef = useRef<ScrollView>(null);
  const { totalCount } = useCart();

  // Admin Product Modal state
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('burgers');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodAvailable, setProdAvailable] = useState(true);

  // Food Image state
  const [prodImageUri, setProdImageUri] = useState<string>('');
  const [prodImageBase64, setProdImageBase64] = useState<string | null>(null);
  const [selectedPresetImage, setSelectedPresetImage] = useState<any>(FOOD_PRESETS[0].image);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isImagePickerSheetVisible, setIsImagePickerSheetVisible] = useState(false);

  // Polished Feedback Modal replacing native alerts
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    type?: 'info' | 'success' | 'error' | 'confirm';
    title: string;
    message: string;
    primaryText?: string;
    onPrimaryPress?: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  // Admin Category Modal state
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Dynamically derive tabs from categories
  const dynamicTabs = [
    { id: 'all', name: 'All' },
    ...categories.map((c) => ({ id: c.id, name: c.name })),
  ];

  const handleTabSelect = (tabId: string, index: number) => {
    setSelectedCategory(tabId);
    tabScrollRef.current?.scrollTo({
      x: Math.max(0, index * 95 - 40),
      animated: true,
    });
  };

  useEffect(() => {
    const tabIndex = dynamicTabs.findIndex((t) => t.id === selectedCategory);
    if (tabIndex > -1) {
      setTimeout(() => {
        tabScrollRef.current?.scrollTo({
          x: Math.max(0, tabIndex * 95 - 40),
          animated: true,
        });
      }, 80);
    }
  }, [selectedCategory, dynamicTabs.length]);

  useEffect(() => {
    if (params.categoryId) {
      setSelectedCategory(params.categoryId);
    }
  }, [params.categoryId]);

  const sourceProducts = products.length > 0 ? products : PRODUCTS;

  // Filter products by selected category and search query
  const filteredProducts = sourceProducts.filter((product) => {
    if (!isAdmin && product.isAvailable === false) return false;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (searchQuery.trim().length > 0) {
      return matchesSearch;
    }

    if (selectedCategory === 'all') return true;
    return product.category === selectedCategory;
  });

  const currentTab = dynamicTabs.find((t) => t.id === selectedCategory) || dynamicTabs[0];

  // Admin Handlers
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdCategory(selectedCategory === 'all' ? 'burgers' : selectedCategory);
    setProdPrice('');
    setProdDesc('');
    setProdAvailable(true);
    setProdImageUri('');
    setProdImageBase64(null);
    setSelectedPresetImage(FOOD_PRESETS[0].image);
    setIsProductModalVisible(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdCategory(prod.category);
    setProdPrice(String(prod.price));
    setProdDesc(prod.description || '');
    setProdAvailable(prod.isAvailable !== false);
    if (typeof prod.image === 'string') {
      setProdImageUri(prod.image);
      setSelectedPresetImage(null);
    } else if (prod.image && typeof prod.image === 'object' && prod.image.uri) {
      setProdImageUri(prod.image.uri);
      setSelectedPresetImage(null);
    } else {
      setProdImageUri('');
      setSelectedPresetImage(prod.image || FOOD_PRESETS[0].image);
    }
    setProdImageBase64(null);
    setIsProductModalVisible(true);
  };

  const pickFoodImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setFeedbackModal({
          visible: true,
          type: 'info',
          title: 'Photo Library Access',
          message: 'Please allow access to your photo library to select food pictures.',
          primaryText: 'Understood',
          onPrimaryPress: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // Takes whole picture without forced cropping or zooming in
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setProdImageUri(asset.uri);
        setSelectedPresetImage(null);
        if (asset.base64) {
          setProdImageBase64(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setProdImageBase64(null);
        }
        setIsImagePickerSheetVisible(false);
      }
    } catch (err: any) {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Selection Error',
        message: err?.message || 'Could not select photo',
        primaryText: 'Close',
        onPrimaryPress: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  const takeFoodPhotoWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setFeedbackModal({
          visible: true,
          type: 'info',
          title: 'Camera Access',
          message: 'Please allow camera access to take pictures of menu dishes.',
          primaryText: 'Understood',
          onPrimaryPress: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
        });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false, // Takes whole picture without forced cropping or zooming in
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setProdImageUri(asset.uri);
        setSelectedPresetImage(null);
        if (asset.base64) {
          setProdImageBase64(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setProdImageBase64(null);
        }
        setIsImagePickerSheetVisible(false);
      }
    } catch (err: any) {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Camera Error',
        message: err?.message || 'Could not launch camera',
        primaryText: 'Close',
        onPrimaryPress: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  const handleSaveProduct = async () => {
    if (!prodName.trim() || !prodPrice.trim()) return;

    setIsUploadingImage(true);
    let resolvedImage: any = selectedPresetImage || FOOD_PRESETS[0].image;

    // 1. If base64 photo was selected/captured, upload to backend /upload endpoint
    if (prodImageBase64) {
      try {
        const uploadRes = await adminApi.uploadImage(
          prodImageBase64,
          `food_${Date.now()}.jpg`
        );
        if (uploadRes?.url) {
          resolvedImage = uploadRes.url;
        } else if (prodImageUri) {
          resolvedImage = { uri: prodImageUri };
        }
      } catch {
        if (prodImageUri) {
          resolvedImage = { uri: prodImageUri };
        }
      }
    } else if (prodImageUri) {
      resolvedImage = prodImageUri.startsWith('http') || prodImageUri.startsWith('file://')
        ? { uri: prodImageUri }
        : prodImageUri;
    }

    const parsedPrice = parseFloat(prodPrice.replace(/[^0-9.]/g, '')) || 0;
    const itemPayload: Product = {
      id: editingProduct?.id || `prod-${Date.now()}`,
      name: prodName.trim(),
      category: prodCategory,
      price: parsedPrice,
      description: prodDesc.trim(),
      image: resolvedImage,
      isAvailable: prodAvailable,
      stockQuantity: prodAvailable ? 999 : 0,
    };

    if (editingProduct) {
      updateProduct(itemPayload);
    } else {
      addProduct(itemPayload);
    }

    setIsProductModalVisible(false);
    setIsUploadingImage(false);

    try {
      if (editingProduct) {
        await adminApi.updateProduct(itemPayload.id, itemPayload);
        await adminApi.updateStock(itemPayload.id, {
          isAvailable: prodAvailable,
          stockQuantity: prodAvailable ? 999 : 0,
        });
      } else {
        await adminApi.createProduct(itemPayload);
      }
    } catch {
      // Handled silently
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    deleteProduct(productId);
    try {
      await adminApi.deleteProduct(productId);
    } catch {
      // Handled silently
    }
  };

  const handleAddCategorySubmit = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    addCategory({
      id: slug,
      name: trimmed,
      image: require('../../assets/images/cat-grid-1.png'),
    });
    setNewCatName('');
    setIsCategoryModalVisible(false);
    setSelectedCategory(slug);
  };

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
          {dynamicTabs.map((tab, index) => {
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

          {isAdmin && (
            <Pressable
              onPress={() => setIsCategoryModalVisible(true)}
              style={styles.addCategoryTabBtn}
              accessibilityRole="button"
              accessibilityLabel="Add Category"
            >
              <Plus size={14} color={COLORS.primary} strokeWidth={2.5} />
              <Text style={styles.addCategoryTabText}>Category</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      {/* Menu List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: !isAdmin && totalCount > 0 ? 190 : 130 },
        ]}
      >
        {/* Category Header Row with Admin + Add Product button */}
        <View style={styles.categoryHeaderBox}>
          <Text style={styles.categoryHeaderText}>
            {searchQuery.trim().length > 0 ? `SEARCH RESULTS ("${searchQuery}")` : currentTab.name.toUpperCase()}
          </Text>

          {isAdmin && (
            <Pressable
              style={styles.addProductBtn}
              onPress={handleOpenAddProduct}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Add new product"
            >
              <Plus size={14} color={COLORS.white} strokeWidth={2.5} />
              <Text style={styles.addProductBtnText}>Add Item</Text>
            </Pressable>
          )}
        </View>

        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <MenuItemRow
              key={product.id}
              product={product}
              isAdmin={isAdmin}
              onEdit={() => handleOpenEditProduct(product)}
              onDelete={() => handleDeleteProduct(product.id)}
            />
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

      {/* Floating Black Cart Bar — Customer Only */}
      {!isAdmin && <CartFloatingBar />}

      {/* Admin Add/Edit Product Modal */}
      <Modal
        visible={isProductModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsProductModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Menu Product' : 'Add New Menu Item'}
              </Text>
              <Pressable
                onPress={() => setIsProductModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={COLORS.heading} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              {/* Food Photo Selection Card */}
              <Text style={styles.fieldLabel}>FOOD PHOTO</Text>
              <View style={styles.imagePickerCard}>
                <View style={styles.previewContainer}>
                  <Image
                    source={
                      prodImageUri
                        ? { uri: prodImageUri }
                        : resolveBackendImage(selectedPresetImage || editingProduct?.image)
                    }
                    style={styles.foodPreviewImage}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.imageActionButtons}>
                  <Pressable
                    style={styles.pickImageBtn}
                    onPress={() => setIsImagePickerSheetVisible(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Select food photo"
                  >
                    <Camera size={16} color="#07345F" strokeWidth={2.2} />
                    <Text style={styles.pickImageBtnText}>
                      {prodImageUri || selectedPresetImage ? 'Change Food Photo' : 'Upload Food Photo'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Item Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Signature Bacon Brioche"
                placeholderTextColor="#9CA3AF"
                value={prodName}
                onChangeText={setProdName}
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipGroup}>
                {categories.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setProdCategory(c.id)}
                    style={[
                      styles.choiceChip,
                      prodCategory === c.id && styles.choiceChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        prodCategory === c.id && styles.choiceChipTextSelected,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Price (KES)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 850"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={prodPrice}
                onChangeText={setProdPrice}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Ingredients, flavors, and serving details..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                value={prodDesc}
                onChangeText={setProdDesc}
              />

              <View style={styles.availabilityRow}>
                <View>
                  <Text style={styles.availTitle}>Available / In Stock</Text>
                  <Text style={styles.availSubtitle}>Item can be ordered by customers</Text>
                </View>
                <Switch
                  value={prodAvailable}
                  onValueChange={setProdAvailable}
                  trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              </View>

              <Pressable
                style={[styles.saveBtn, isUploadingImage && { opacity: 0.7 }]}
                onPress={handleSaveProduct}
                disabled={isUploadingImage}
              >
                {isUploadingImage ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingProduct ? 'Save Product Details' : 'Add to Menu'}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Canva-style Food Image Picker Sheet Modal */}
      <Modal
        visible={isImagePickerSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsImagePickerSheetVisible(false)}
      >
        <View style={styles.pickerSheetBackdrop}>
          <View style={styles.pickerSheetCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Food Photo</Text>
                <Text style={styles.modalSubTitle}>
                  Take a photo or choose from gallery (no cropping needed)
                </Text>
              </View>
              <Pressable
                onPress={() => setIsImagePickerSheetVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close photo picker"
              >
                <X size={20} color={COLORS.heading} />
              </Pressable>
            </View>

            <View style={styles.pickerOptionsRow}>
              <Pressable
                style={styles.pickerOptionCard}
                onPress={takeFoodPhotoWithCamera}
                accessibilityRole="button"
                accessibilityLabel="Take food photo with camera"
              >
                <View style={[styles.pickerIconCircle, { backgroundColor: '#DCFCE7' }]}>
                  <Camera size={22} color="#075B35" strokeWidth={2.2} />
                </View>
                <Text style={styles.pickerOptionTitle}>Take Photo</Text>
                <Text style={styles.pickerOptionSub}>Use Camera</Text>
              </Pressable>

              <Pressable
                style={styles.pickerOptionCard}
                onPress={pickFoodImageFromGallery}
                accessibilityRole="button"
                accessibilityLabel="Choose food photo from library"
              >
                <View style={[styles.pickerIconCircle, { backgroundColor: '#DBEAFE' }]}>
                  <ImageIcon size={22} color="#07345F" strokeWidth={2.2} />
                </View>
                <Text style={styles.pickerOptionTitle}>Photo Library</Text>
                <Text style={styles.pickerOptionSub}>Choose from Gallery</Text>
              </Pressable>
            </View>

            {/* Cafe Presets Grid/Row */}
            <Text style={styles.presetSectionTitle}>OR CHOOSE A CAFE PRESET</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsScroll}
            >
              {FOOD_PRESETS.map((preset) => (
                <Pressable
                  key={preset.id}
                  style={[
                    styles.presetThumbCard,
                    selectedPresetImage === preset.image && styles.presetThumbSelected,
                  ]}
                  onPress={() => {
                    setSelectedPresetImage(preset.image);
                    setProdImageUri('');
                    setProdImageBase64(null);
                    setIsImagePickerSheetVisible(false);
                  }}
                >
                  <Image source={preset.image} style={styles.presetThumbImg} resizeMode="contain" />
                  <Text style={styles.presetThumbText} numberOfLines={1}>
                    {preset.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Admin Add Category Modal */}
      <Modal
        visible={isCategoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: 280 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Category Tab</Text>
              <Pressable
                onPress={() => setIsCategoryModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={COLORS.heading} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Category Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Desserts or Gourmet Pies"
                placeholderTextColor="#9CA3AF"
                value={newCatName}
                onChangeText={setNewCatName}
              />

              <Pressable style={styles.saveBtn} onPress={handleAddCategorySubmit}>
                <Text style={styles.saveBtnText}>Create Category</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Zero-slop Feedback Modal */}
      <FeedbackModal
        visible={feedbackModal.visible}
        type={feedbackModal.type}
        title={feedbackModal.title}
        message={feedbackModal.message}
        primaryText={feedbackModal.primaryText}
        onPrimaryPress={
          feedbackModal.onPrimaryPress ||
          (() => setFeedbackModal((prev) => ({ ...prev, visible: false })))
        }
      />
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
    paddingHorizontal: 14,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.heading,
  },
  tabBarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: COLORS.white,
  },
  tabBarScroll: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
    alignItems: 'center',
  },
  tabItem: {
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#6B7280',
  },
  tabTextSelected: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  addCategoryTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF1F2',
    marginLeft: 4,
  },
  addCategoryTabText: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    color: COLORS.primary,
  },
  listContent: {
    flexGrow: 1,
  },
  categoryHeaderBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  categoryHeaderText: {
    fontFamily: FONTS.sfDisplay,
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  addProductBtnText: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    color: COLORS.white,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.heading,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
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
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  availTitle: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.heading,
  },
  availSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
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

  // Food Photo Upload & Preview
  imagePickerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: SPACING.sm,
    alignItems: 'center',
    gap: 8,
  },
  previewContainer: {
    width: '100%',
    height: 160,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  foodPreviewImage: {
    width: '100%',
    height: '100%',
  },
  imageActionButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  pickImageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
  },
  pickImageBtnText: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: '#07345F',
  },

  // Picker Sheet Modal
  pickerSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheetCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: 36,
  },
  modalSubTitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pickerOptionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: SPACING.md,
  },
  pickerOptionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 18,
    ...SHADOW.soft,
  },
  pickerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pickerOptionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.heading,
  },
  pickerOptionSub: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  presetSectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  presetsScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  presetThumbCard: {
    width: 84,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 6,
  },
  presetThumbSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF1F2',
  },
  presetThumbImg: {
    width: 60,
    height: 52,
    marginBottom: 4,
  },
  presetThumbText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.heading,
    textAlign: 'center',
  },
});
