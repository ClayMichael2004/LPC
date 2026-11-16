import { Platform } from 'react-native';

export const COLORS = {
  // Brand Anchors (Little Polo Cafe Crimson & Obsidian)
  primary: '#E51A24',
  primaryDark: '#B91C1C',
  primaryLight: '#FEE2E2',
  background: '#FFFFFF',
  canvas: '#F8F9FA',
  surface: '#FFFFFF',
  white: '#FFFFFF',

  // Typography
  text: '#111827',
  textSecondary: '#6B7280',
  heading: '#1A1A1A',
  bodyText: '#374151',

  // Structural Dividers
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  cardBorder: '#EEEEEE',

  // Pastel Card Backgrounds
  blueCard: '#DBEAFE',
  greenCard: '#DCFCE7',
  pinkCard: '#FCE7F3',
  purpleCard: '#E5D9FF',

  // Contrasting Icon Tints
  serviceBlueTint: '#D8E5FF',
  serviceBlueIcon: '#07345F',
  serviceGreenTint: '#72F2A5',
  serviceGreenIcon: '#075B35',
  servicePinkTint: '#FFD8D8',
  servicePinkIcon: '#691414',
  servicePurpleTint: '#E5D9FF',
  servicePurpleIcon: '#4C1D95',
  resourcePurpleTint: '#E5D9FF',
  resourcePurpleIcon: '#4C1D95',

  // Badges & Status Indicators
  badgeRequiredBg: '#FCE7F3',
  badgeRequiredText: '#991B1B',
  badgeDoneBg: '#DCFCE7',
  badgeDoneText: '#166534',

  // Action Buttons
  darkAction: '#14171A',
  darkActionPressed: '#22272E',
  disabledButton: '#F3F4F6',
  disabledButtonText: '#9CA3AF',
  disabledBorder: '#D1D5DB',

  // Overlays
  overlayBackdrop: 'rgba(0, 0, 0, 0.45)',
  glassBlur: 'rgba(255, 255, 255, 0.88)',
};

export const SPACING = {
  xxs: 3,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 999,
};

export const FONT_SIZE = {
  xxs: 9,
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

export const SHADOW = {
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },
  subtle: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },
};

const fontFallback = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'sans-serif',
});

export const FONTS = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  fallback: fontFallback,
};
