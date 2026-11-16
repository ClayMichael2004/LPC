# OTTO Mobile Design System & Engineering Skills (`skills.md`)

> **The Definitive Engineering & UI/UX Playbook for Building World-Class, Clean, and Non-Jargon Mobile Applications**  
> Extracted and codified directly from the reference mobile application architecture. Reusable across any React Native & Expo project.

---

## Table of Contents

1. [Design Philosophy: The "Anti-Slop" Civic Clean Standard](#1-design-philosophy-the-anti-slop-civic-clean-standard)
2. [Design Tokens & Theme Architecture](#2-design-tokens--theme-architecture)
   - [2.1 Color Palette & Semantic Tints](#21-color-palette--semantic-tints)
   - [2.2 Typography Hierarchy](#22-typography-hierarchy)
   - [2.3 Spacing Scale & Layout Grid](#23-spacing-scale--layout-grid)
   - [2.4 Border Radii & Elevation/Shadows](#24-border-radii--elevation-shadows)
   - [2.5 Translucency & Glassmorphism](#25-translucency--glassmorphism)
3. [Navigation & Screen Flow Engineering](#3-navigation--screen-flow-engineering)
   - [3.1 Expo Router Directory Architecture](#31-expo-router-directory-architecture)
   - [3.2 Fail-Safe Back Navigation Pattern](#32-fail-safe-back-navigation-pattern)
   - [3.3 Custom Bottom Tab Navigation (`BottomNav`)](#33-custom-bottom-tab-navigation-bottomnav)
   - [3.4 Safe Area Inset Management](#34-safe-area-inset-management)
4. [Master Component Catalog (Complete Implementations)](#4-master-component-catalog-complete-implementations)
   - [4.1 `SystemBarBlur` — Native Glassmorphism Overlay](#41-systembarblur--native-glassmorphism-overlay)
   - [4.2 `PageWatermark` — Low-Opacity Graphic with Gradient Fade](#42-pagewatermark--low-opacity-graphic-with-gradient-fade)
   - [4.3 `AppHeader` — Floating Brand Header with Blur](#43-appheader--floating-brand-header-with-blur)
   - [4.4 `ScreenHeader` — Symmetrical Header with Fail-Safe Back](#44-screenheader--symmetrical-header-with-fail-safe-back)
   - [4.5 `CandidateProfileHeader` — Cross-Fading Morphing Header](#45-candidateprofileheader--cross-fading-morphing-header)
   - [4.6 `PrimaryButton` & `SecondaryButton`](#46-primarybutton--secondarybutton)
   - [4.7 `BiographyAccordion` — Non-Jumping Height Measurement Hack](#47-biographyaccordion--non-jumping-height-measurement-hack)
   - [4.8 `ServiceCard` — Pastel Themed Feature Card](#48-servicecard--pastel-themed-feature-card)
   - [4.9 `ElectionStatusCard` — Countdown & Accessible Progress Bar](#49-electionstatuscard--countdown--accessible-progress-bar)
   - [4.10 `CandidateCard` — Horizontal Carousel Card](#410-candidatecard--horizontal-carousel-card)
   - [4.11 `CandidateListCard` — Actionable List Card](#411-candidatelistcard--actionable-list-card)
   - [4.12 `CandidateSelectorCard` & `CompareBottomBar`](#412-candidateselectorcard--comparebottombar)
   - [4.13 `PolicyComparisonSection` — Side-by-Side Comparison](#413-policycomparisonsection--side-by-side-comparison)
   - [4.14 `CandidatePickerModal` — Bottom-Sheet Slide Picker](#414-candidatepickermodal--bottom-sheet-slide-picker)
   - [4.15 `FilterChip` — Two-Tier Dynamic Filter System](#415-filterchip--two-tier-dynamic-filter-system)
   - [4.16 `CareerTimeline` — Milestone Rail & Timeline](#416-careertimeline--milestone-rail--timeline)
   - [4.17 `CivicCheckCard` & `VotingRecordCard`](#417-civiccheckcard--votingrecordcard)
   - [4.18 `VideoTutorialCard` — Inline Player & Fullscreen Modal](#418-videotutorialcard--inline-player--fullscreen-modal)
   - [4.19 `Badge` & `EventBadge` — Status Indicator Pills](#419-badge--eventbadge--status-indicator-pills)
   - [4.20 `SearchBar` & `SectionHeader`](#420-searchbar--sectionheader)
5. [Motion & Animation Engineering Formulas](#5-motion--animation-engineering-formulas)
   - [5.1 Scroll-Driven Dynamic Header Collapse](#51-scroll-driven-dynamic-header-collapse)
   - [5.2 Staggered Entrance Animations](#52-staggered-entrance-animations)
6. [UX Writing & Non-Jargon Copywriting Directives](#6-ux-writing--non-jargon-copywriting-directives)
7. [Offline-First State & Storage Patterns](#7-offline-first-state--storage-patterns)
8. [Accessibility, Touch Boundaries & Performance](#8-accessibility-touch-boundaries--performance)

---

## 1. Design Philosophy: The "Anti-Slop" Civic Clean Standard

### What Causes "AI Slop" in Mobile Apps?
1. **Generic Purple/Cyan Gradients & Dark-Mode Cliches**: Lazy AI models default to cyber-glow gradients or stark black themes that feel like cheap templates.
2. **Hardcoded Offsets & Notch Collisions**: Writing `paddingTop: 45` or `marginTop: 50` that clips on iPhone Dynamic Islands or overlaps Android status bars.
3. **Harsh Drop Shadows**: Using `shadowOpacity: 0.35` or `elevation: 10`, making cards look like 2012 skeuomorphism or muddy cutouts.
4. **Jumpy Layout Shifts**: Animating height blindly, causing text to snap, clip, or jitter during accordion toggles.
5. **Technical Jargon & Robotic Microcopy**: Displaying `Null result set`, `Entity verification status: 1`, `Authentication required`, or `Loading state...`.
6. **Tiny Touch Targets**: Tiny 16px icons without `hitSlop`, making them frustratingly hard to tap.
7. **Broken Navigation on Deep Links**: Calling `router.back()` without checking if there is a history stack, leaving users trapped.

### The Otto Standard:
- **Clean Canvas**: Neutral cool-tinted canvas (`#F5F7FB`, `#F9F9FC`) + crisp white surfaces (`#FFFFFF`).
- **Pastel Tints with Saturated Contrasting Icons**: Cards use delicate pastel fills (`#DBEAFE`, `#DCFCE7`, `#FCE7F3`, `#E5D9FF`) paired with rich, deeply saturated icons (`#07345F`, `#075B35`, `#691414`, `#4C1D95`).
- **Whisper Elevation**: Soft 12px blur radius with 0.08 opacity (`elevation: 4`). No heavy black outlines.
- **Layered Watermarks**: Faint background images at `0.16–0.24` opacity with a 60% bottom linear gradient feathering into the background.
- **Flawless Motion**: Measured layout heights for 60fps expansion, auto-collapsing headers, and staggered list entrances.
- **Human Microcopy**: Zero jargon, transparent expectations, and active prompts.

---

## 2. Design Tokens & Theme Architecture

Implement this theme directly in `src/constants/theme.ts`:

```typescript
export const COLORS = {
  // Brand Anchors
  primary: '#1E5AA8',
  primaryDark: '#15467F',
  background: '#F5F7FB',
  white: '#FFFFFF',

  // Typography
  text: '#111827',
  textSecondary: '#6B7280',
  heading: '#202124',
  bodyText: '#414552',

  // Structural Dividers
  border: '#E5E7EB',
  headerBorder: '#CBD1DB',

  // Pastel Card Backgrounds
  blueCard: '#DBEAFE',
  greenCard: '#DCFCE7',
  pinkCard: '#FCE7F3',

  // Service / Feature Card Tints & Contrasting Icons
  serviceBlueTint: '#D8E5FF',
  serviceBlueIcon: '#07345F',
  serviceGreenTint: '#72F2A5',
  serviceGreenIcon: '#075B35',
  servicePinkTint: '#FFD8D8',
  servicePinkIcon: '#691414',
  resourcePurpleTint: '#E5D9FF',
  resourcePurpleIcon: '#4C1D95',

  // Onboarding & Special Surfaces
  onboardingBackground: '#F9F9FC',
  onboardingHeaderBg: '#F0F2F7',
  onboardingDivider: '#C6C8D0',
  onboardingLogo: '#003E78',
  watermarkTint: '#7C8490',
  ctaBlue: '#075DA6',
  ctaButtonText: '#00529A',
  secondaryButtonBorder: '#747985',
  secondaryButtonText: '#004B91',

  // Badges & Status Indicators
  badgeBg: '#6FF0A3',
  badgeIcon: '#079447',
  stationOpenBg: '#DCFCE7',
  stationOpenText: '#166534',
  stationLimitedBg: '#F3F4F6',
  stationLimitedText: '#6B7280',
  freePillBg: '#E3F5E9',
  freePillText: '#1E8A4C',
  paidPillBg: '#FDEEE3',
  paidPillText: '#B5651D',

  // Timeline & Progress Bars
  timelineDotActive: '#1E5AA8',
  timelineDotInactive: '#C6C8D0',
  timelineLine: '#E5E7EB',
  votingBarTrack: '#E5E7EB',
  votingBarEconomic: '#1E5AA8',
  votingBarEnvironmental: '#1AA260',
  votingBarSocial: '#D6432F',

  // Comparison Indicators
  compareCandidateA: '#1E5AA8', // blue
  compareCandidateB: '#1AA260', // green
  civicCheckIconBg: '#EEF2F7',

  // Overlays
  videoOverlay: 'rgba(16, 24, 40, 0.4)',
  tutorialBadgeBg: '#1AA260',
};

export const SPACING = {
  xxs: 3,
  xs: 4,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const RADIUS = {
  sm: 2,     // Micro tags, pill badges, subtle button corners
  md: 6,     // Standard buttons, inputs, icon containers
  lg: 8,     // Content cards, hero containers, floating action buttons
  xl: 10,    // Modal headers, rounded dialogs
  full: 999, // Circular avatars, search pill inputs
};

export const FONT_SIZE = {
  xxs: 9,
  xs: 11,
  sm: 12,
  md: 14,
  lg: 17,
  xl: 20,
  xxl: 30,
};

export const SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: {
    width: 0,
    height: 4,
  },
  elevation: 4,
};

export const FONTS = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};
```

---

## 3. Navigation & Screen Flow Engineering

### 3.1 Expo Router Directory Architecture

```
app/
├── _layout.tsx                     # Root Layout: Fonts, SafeAreaProvider, SystemBarBlur
├── (tabs)/
│   ├── _layout.tsx                 # Tabs Layout hosting BottomNav
│   ├── index.tsx                   # Home Dashboard
│   ├── candidates.tsx              # Candidate Explorer with Search & Filter Chips
│   ├── education.tsx               # Civic Education Hub & Resource Grid
│   └── events.tsx                  # Geolocation-Aware Civic Events List
├── candidates/
│   └── [id]/
│       ├── index.tsx               # Detailed Candidate Profile
│       └── manifesto.tsx           # Full Reading Manifesto View
├── compare.tsx                     # Side-by-side Comparison Arena
├── saved-comparisons.tsx           # Offline Saved Comparison Sets
├── profile.tsx                     # User Account / Guest Overview
├── onboarding.tsx                  # Splash / Value Proposition Screen
└── report-issue.tsx                # Local Feedback & Issue Submission
```

### 3.2 Fail-Safe Back Navigation Pattern

Never call `router.back()` blindly. If the user landed from a deep link or external notification, `router.back()` can exit the app or fail silently. Always guard with `canGoBack()`:

```typescript
import { router } from 'expo-router';

export function handleSafeBack(fallbackRoute: string = '/(tabs)') {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackRoute as any);
  }
}
```

### 3.3 Custom Bottom Tab Navigation (`BottomNav`)

```typescript
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { House, CircleUserRound, BookOpen, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, FONTS, SPACING } from '../constants/theme';

type TabBarRenderer = NonNullable<ComponentProps<typeof Tabs>['tabBar']>;
type BottomNavProps = Parameters<TabBarRenderer>[0];

const ICONS: Record<string, typeof House> = {
  index: House,
  candidates: CircleUserRound,
  education: BookOpen,
  events: MapPin,
};

export default function BottomNav({ state, descriptors, navigation }: BottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = (options.tabBarLabel ?? options.title ?? route.name) as string;
        const isFocused = state.index === index;
        const Icon = ICONS[route.name] ?? House;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tab}>
            <Icon
              size={22}
              color={isFocused ? COLORS.primary : COLORS.textSecondary}
              strokeWidth={2}
            />
            <Text style={[styles.label, isFocused && styles.labelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  labelActive: {
    fontFamily: FONTS.semibold,
    color: COLORS.primary,
  },
});
```

---

## 4. Master Component Catalog (Complete Implementations)

### 4.1 `SystemBarBlur` — Native Glassmorphism Overlay

```typescript
import { StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SystemBarBlur() {
  const insets = useSafeAreaInsets();
  if (insets.top === 0) return null;

  return (
    <BlurView
      pointerEvents="none"
      blurMethod="dimezisBlurViewSdk31Plus"
      intensity={100}
      tint="light"
      style={[styles.overlay, { height: insets.top }]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
  },
});
```

### 4.2 `PageWatermark` — Low-Opacity Graphic with Gradient Fade

```typescript
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';

type Props = {
  source: any;
  height?: number;
  opacity?: number;
  fadeColor?: string;
  fullScreen?: boolean;
};

export default function PageWatermark({
  source,
  height = 220,
  opacity = 0.18,
  fadeColor = COLORS.background,
  fullScreen = false,
}: Props) {
  return (
    <View
      style={[styles.container, fullScreen ? styles.fullScreen : { height }]}
      pointerEvents="none"
    >
      <Image source={source} style={[styles.image, { opacity }]} resizeMode="cover" />
      <LinearGradient colors={['transparent', fadeColor]} style={styles.fade} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  fullScreen: { top: 0, bottom: 0 },
  image: { width: '100%', height: '100%' },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
});
```

### 4.3 `AppHeader` — Floating Brand Header with Blur

```typescript
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UserRound } from 'lucide-react-native';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { COLORS, FONT_SIZE, FONTS, SPACING } from '../constants/theme';

type AppHeaderProps = {
  onProfilePress?: () => void;
  blurIntensity?: number;
};

export default function AppHeader({ onProfilePress, blurIntensity }: AppHeaderProps) {
  const handlePress = onProfilePress ?? (() => router.push('/profile'));

  return (
    <View style={[styles.container, blurIntensity !== undefined && styles.blurredContainer]}>
      {blurIntensity !== undefined && (
        <BlurView intensity={blurIntensity} tint="light" style={StyleSheet.absoluteFill} />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go to onboarding"
        hitSlop={8}
        onPress={() => router.push('/onboarding')}
        style={styles.brand}
      >
        <Text style={styles.title}>
          civic<Text style={styles.titleAccent}>Vote</Text>
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        onPress={handlePress}
        style={styles.profileButton}
        hitSlop={8}
      >
        <UserRound size={20} color="#38516B" strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.headerBorder,
  },
  blurredContainer: { backgroundColor: 'transparent' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  title: { fontSize: FONT_SIZE.xl, fontFamily: FONTS.bold, color: COLORS.primary },
  titleAccent: { color: '#79BBFD' },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7EDF5',
  },
});
```

### 4.4 `ScreenHeader` — Symmetrical Header with Fail-Safe Back

```typescript
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, FONT_SIZE, FONTS, SPACING } from '../constants/theme';

type Props = {
  title: string;
  fallbackRoute?: string;
};

export default function ScreenHeader({ title, fallbackRoute = '/(tabs)' }: Props) {
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handleBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
        <ArrowLeft size={22} color={COLORS.primary} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      {/* Symmetrical spacer matching icon size ensures mathematically centered title */}
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.headerBorder,
  },
  title: { fontSize: FONT_SIZE.md, fontFamily: FONTS.semibold, color: COLORS.text },
  spacer: { width: 22 },
});
```

### 4.5 `CandidateProfileHeader` — Cross-Fading Morphing Header

```typescript
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, User } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, FONT_SIZE, FONTS, SPACING } from '../constants/theme';

type Props = {
  candidateName?: string;
  scrollY?: Animated.Value;
  onProfilePress?: () => void;
};

export default function CandidateProfileHeader({
  candidateName,
  scrollY,
  onProfilePress = () => router.push('/profile'),
}: Props) {
  const brandOpacity = scrollY?.interpolate({
    inputRange: [12, 48],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const nameOpacity = scrollY?.interpolate({
    inputRange: [12, 48],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/candidates');
    }
  };

  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={handleBack} hitSlop={12}>
        <ArrowLeft size={22} color={COLORS.primary} />
      </Pressable>

      {candidateName && brandOpacity && nameOpacity ? (
        <View pointerEvents="none" style={styles.titleContainer}>
          <Animated.Text style={[styles.wordmark, { opacity: brandOpacity }]}>
            civicVote
          </Animated.Text>
          <Animated.Text ellipsizeMode="tail" numberOfLines={1} style={[styles.candidateName, { opacity: nameOpacity }]}>
            {candidateName}
          </Animated.Text>
        </View>
      ) : (
        <Text style={styles.wordmark}>civicVote</Text>
      )}

      <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={onProfilePress} hitSlop={8}>
        <View style={styles.avatar}>
          <User size={18} color={COLORS.textSecondary} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.headerBorder,
  },
  wordmark: { fontSize: FONT_SIZE.lg, fontFamily: FONTS.bold, color: COLORS.primary },
  titleContainer: { position: 'absolute', left: 64, right: 64, alignItems: 'center' },
  candidateName: { position: 'absolute', maxWidth: '100%', fontSize: FONT_SIZE.lg, fontFamily: FONTS.bold, color: COLORS.primary },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
});
```

### 4.6 `PrimaryButton` & `SecondaryButton`

```typescript
import { Pressable, StyleSheet, Text } from 'react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS } from '../constants/theme';

export function PrimaryButton({ title, icon, onPress }: { title: string; icon?: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={styles.primaryText}>{title}</Text>
      {icon}
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={styles.secondaryText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryBtn: {
    height: 43,
    width: '100%',
    backgroundColor: COLORS.ctaBlue,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  secondaryBtn: {
    height: 43,
    width: '100%',
    backgroundColor: COLORS.onboardingHeaderBg,
    borderWidth: 1,
    borderColor: COLORS.secondaryButtonBorder,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { opacity: 0.8 },
  primaryText: { fontFamily: FONTS.medium, fontSize: FONT_SIZE.sm, color: COLORS.white },
  secondaryText: { fontFamily: FONTS.medium, fontSize: FONT_SIZE.sm, color: COLORS.secondaryButtonText },
});
```

### 4.7 `BiographyAccordion` — Non-Jumping Height Measurement Hack

```typescript
import { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../constants/theme';

export default function BiographyAccordion({ biography }: { biography: string }) {
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));
  const [rotation] = useState(() => new Animated.Value(0));

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);

    Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();

    Animated.timing(rotation, {
      toValue: next ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const animatedHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={toggle} accessibilityRole="button" accessibilityState={{ expanded }}>
        <Text style={styles.title}>Candidate Biography</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={18} color={COLORS.primary} />
        </Animated.View>
      </Pressable>

      <Animated.View style={{ height: animatedHeight, opacity: progress, overflow: 'hidden' }}>
        <Text style={styles.body}>{biography}</Text>
      </Animated.View>

      {/* Invisible, unconstrained twin text element to measure true natural height */}
      <Text
        style={[styles.body, styles.measuringText]}
        onLayout={(e) => {
          const measured = e.nativeEvent.layout.height;
          if (measured > 0 && measured !== contentHeight) {
            setContentHeight(measured);
          }
        }}
        pointerEvents="none"
      >
        {biography}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    ...SHADOW,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  title: { fontSize: FONT_SIZE.md, fontFamily: FONTS.semibold, color: COLORS.primary },
  body: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.regular, color: COLORS.bodyText, lineHeight: 20, paddingBottom: SPACING.md },
  measuringText: {
    position: 'absolute',
    opacity: 0,
    left: SPACING.lg,
    right: SPACING.lg,
    top: 0,
    zIndex: -1,
  },
});
```

### 4.8 `ServiceCard` — Pastel Themed Feature Card

```typescript
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../constants/theme';

type Props = {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkText: string;
  backgroundColor: string;
  onPress?: () => void;
};

export default function ServiceCard({ icon, title, description, linkText, backgroundColor, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor }]}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.link}>
        <Text style={styles.linkText}>{linkText}</Text>
        <Text style={styles.greaterThan}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 244,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOW,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: { fontFamily: FONTS.bold, fontSize: FONT_SIZE.lg, lineHeight: 21, color: COLORS.heading, marginBottom: SPACING.sm },
  description: { fontFamily: FONTS.regular, fontSize: FONT_SIZE.md, lineHeight: 21, color: COLORS.bodyText },
  link: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xxl },
  linkText: { fontFamily: FONTS.medium, fontSize: FONT_SIZE.md, color: COLORS.ctaButtonText, marginRight: 3 },
  greaterThan: { fontFamily: FONTS.regular, fontSize: FONT_SIZE.xl, lineHeight: 18, color: COLORS.ctaButtonText },
});
```

### 4.9 `ElectionStatusCard` — Countdown & Accessible Progress Bar

```typescript
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SPACING } from '../constants/theme';

type Props = {
  title: string;
  daysRemaining: number;
  verifiedPercentage: number;
};

export default function ElectionStatusCard({ title, daysRemaining, verifiedPercentage }: Props) {
  const clamped = Number.isFinite(verifiedPercentage) ? Math.min(100, Math.max(0, verifiedPercentage)) : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{title.toUpperCase()}</Text>
      <View style={styles.daysRow}>
        <Text style={styles.daysNumber}>{daysRemaining}</Text>
        <Text style={styles.daysLabel}>Days Remaining</Text>
      </View>
      <View
        style={styles.track}
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: clamped }}
      >
        <View style={[styles.progress, { width: `${clamped}%` }]} />
      </View>
      <Text style={styles.subtext}>Candidates Verified: {clamped}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.lg },
  label: { color: '#D8E8FF', fontSize: FONT_SIZE.sm, fontFamily: FONTS.semibold, marginBottom: SPACING.xs },
  daysRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: SPACING.md },
  daysNumber: { color: COLORS.white, fontSize: FONT_SIZE.xxl, fontFamily: FONTS.bold, marginRight: SPACING.xs },
  daysLabel: { color: COLORS.white, fontSize: FONT_SIZE.md, fontFamily: FONTS.medium },
  track: { height: 8, backgroundColor: '#6FA9F5', borderRadius: 4, overflow: 'hidden' },
  progress: { height: '100%', backgroundColor: COLORS.white },
  subtext: { marginTop: SPACING.sm, color: COLORS.white, fontSize: FONT_SIZE.xs, opacity: 0.9 },
});
```

### 4.10 `CandidateCard` — Horizontal Carousel Card

```typescript
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import Badge from './badge';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../constants/theme';

type Props = {
  name: string;
  party: string;
  image: ImageSourcePropType;
  verified?: boolean;
  onPress?: () => void;
  fullWidth?: boolean;
};

export default function CandidateCard({ name, party, image, verified = false, onPress, fullWidth = false }: Props) {
  return (
    <Pressable
      style={[styles.card, fullWidth && styles.cardFullWidth]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${party}${verified ? ', verified candidate' : ''}`}
    >
      <View style={styles.imageWrap}>
        <Image source={image} style={styles.image} />
        {verified && (
          <View style={styles.badgeWrap}>
            <Badge label="VERIFIED" />
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      <Text style={styles.party} numberOfLines={1}>{party}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 150, backgroundColor: COLORS.white, borderRadius: RADIUS.md, overflow: 'hidden', marginRight: SPACING.xl, ...SHADOW },
  cardFullWidth: { width: '100%', marginRight: 0 },
  imageWrap: { width: '100%', height: 135 },
  image: { width: '100%', height: '100%' },
  badgeWrap: { position: 'absolute', top: 6, right: 6 },
  name: { paddingHorizontal: SPACING.sm, paddingTop: SPACING.sm, fontSize: FONT_SIZE.sm, fontFamily: FONTS.semibold, color: COLORS.text },
  party: { paddingHorizontal: SPACING.sm, paddingBottom: SPACING.sm, fontSize: FONT_SIZE.xs, fontFamily: FONTS.regular, color: COLORS.textSecondary },
});
```

### 4.11 `CandidateListCard` — Actionable List Card

```typescript
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Badge from './badge';
import BookmarkButton from './bookmark_button';
import { PrimaryButton } from './primary_button';
import { Candidate } from '../types';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../constants/theme';

export default function CandidateListCard({ candidate }: { candidate: Candidate }) {
  const subtitle = candidate.county ? `${candidate.role ?? ''} | ${candidate.county}` : candidate.role;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View profile for ${candidate.name}`}
        style={styles.topRow}
        onPress={() => router.push(`/candidates/${candidate.id}`)}
      >
        <Image source={candidate.image} style={styles.avatar} />
        <View style={styles.info}>
          <View style={styles.badgeRow}>
            {candidate.verified && <Badge label="Verified" />}
            {candidate.displayId && <Text style={styles.displayId}>ID: {candidate.displayId}</Text>}
          </View>
          <Text style={styles.name}>{candidate.name}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <Text style={styles.party}>{candidate.party}</Text>
        </View>
      </Pressable>

      <View style={styles.actionRow}>
        <View style={styles.actionButton}>
          <PrimaryButton title="View Manifesto" onPress={() => router.push(`/candidates/${candidate.id}/manifesto`)} />
        </View>
        <BookmarkButton candidateId={candidate.id} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOW },
  topRow: { flexDirection: 'row', marginBottom: SPACING.md },
  avatar: { width: 56, height: 56, borderRadius: RADIUS.md, backgroundColor: COLORS.border, marginRight: SPACING.md },
  info: { flex: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xs },
  displayId: { fontSize: FONT_SIZE.xs, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  name: { fontSize: FONT_SIZE.md, fontFamily: FONTS.bold, color: COLORS.text },
  subtitle: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
  party: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.semibold, color: COLORS.primary, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  actionButton: { flex: 1 },
});
```

### 4.12 `CandidateSelectorCard` & `CompareBottomBar`

```typescript
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Candidate } from '../types';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../constants/theme';

export function CandidateSelectorCard({ candidate, onChangePress }: { candidate: Candidate | null; onChangePress: () => void }) {
  return (
    <View style={styles.selectorCard}>
      {candidate ? (
        <Image source={candidate.image} style={styles.selectorAvatar} />
      ) : (
        <View style={styles.selectorPlaceholder} />
      )}
      <Text style={styles.selectorName} numberOfLines={2}>
        {candidate ? candidate.name : 'Select a candidate'}
      </Text>
      <Pressable onPress={onChangePress}>
        <Text style={styles.selectorChange}>CHANGE</Text>
      </Pressable>
    </View>
  );
}

export function CompareBottomBar({ selectedCount, onSave, disabled }: { selectedCount: number; onSave: () => void; disabled: boolean }) {
  return (
    <View style={styles.bottomBar}>
      <Text style={styles.countText}>{selectedCount} Candidates Selected</Text>
      <Pressable style={[styles.saveBtn, disabled && styles.saveBtnDisabled]} onPress={onSave} disabled={disabled}>
        <Text style={styles.saveBtnText}>Save Comparison</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  selectorCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', ...SHADOW },
  selectorAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
  selectorPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
  selectorName: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.semibold, color: COLORS.text, textAlign: 'center', marginBottom: SPACING.xs },
  selectorChange: { fontSize: FONT_SIZE.xs, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 0.5 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, ...SHADOW },
  countText: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.medium, color: COLORS.textSecondary },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontFamily: FONTS.semibold },
});
```

### 4.13 `PolicyComparisonSection` — Side-by-Side Comparison

```typescript
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Candidate, PolicyCategory } from '../types';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../constants/theme';

export default function PolicyComparisonSection({
  icon,
  category,
  candidateA,
  candidateB,
}: {
  icon: ReactNode;
  category: PolicyCategory;
  candidateA: Candidate | null;
  candidateB: Candidate | null;
}) {
  const planA = candidateA?.policyPlans?.find((p) => p.category === category);
  const planB = candidateB?.policyPlans?.find((p) => p.category === category);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {icon}
        <Text style={styles.title}>{category}</Text>
      </View>

      {candidateA && (
        <View style={styles.block}>
          <Text style={[styles.candidateLabel, { color: COLORS.compareCandidateA }]}>{candidateA.name}</Text>
          <Text style={styles.description}>{planA?.description ?? 'No policy data available for this category.'}</Text>
        </View>
      )}

      {candidateB && (
        <View style={styles.block}>
          <Text style={[styles.candidateLabel, { color: COLORS.compareCandidateB }]}>{candidateB.name}</Text>
          <Text style={styles.description}>{planB?.description ?? 'No policy data available for this category.'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOW },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  title: { fontSize: FONT_SIZE.md, fontFamily: FONTS.bold, color: COLORS.text },
  block: { marginBottom: SPACING.md },
  candidateLabel: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.semibold, marginBottom: 4 },
  description: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.regular, color: COLORS.bodyText, lineHeight: 20 },
});
```

### 4.14 `CandidatePickerModal` — Bottom-Sheet Slide Picker

```typescript
import { useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Candidate } from '../types';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SPACING } from '../constants/theme';

type Props = {
  visible: boolean;
  candidates: Candidate[];
  excludedCandidateId?: string;
  onSelect: (candidate: Candidate) => void;
  onClose: () => void;
};

export default function CandidatePickerModal({ visible, candidates, excludedCandidateId, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filtered = candidates.filter((c) => {
    if (excludedCandidateId && c.id === excludedCandidateId) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.party.toLowerCase().includes(q);
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: SPACING.lg + insets.bottom }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose a Candidate</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <X size={20} color={COLORS.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.searchBar}>
            <Search size={16} color={COLORS.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or party"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.searchInput}
              autoCorrect={false}
            />
          </View>

          {filtered.length === 0 ? (
            <Text style={styles.empty}>No candidates match &quot;{query}&quot;.</Text>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => onSelect(item)}>
                  <Image source={item.image} style={styles.avatar} />
                  <View>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.party}>{item.party}</Text>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(16, 24, 40, 0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: SPACING.lg, maxHeight: '70%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  title: { fontSize: FONT_SIZE.md, fontFamily: FONTS.bold, color: COLORS.text },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  searchInput: { flex: 1, paddingVertical: SPACING.sm, fontSize: FONT_SIZE.sm, fontFamily: FONTS.regular, color: COLORS.text },
  empty: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary, paddingVertical: SPACING.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, gap: SPACING.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.border },
  name: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.semibold, color: COLORS.text },
  party: { fontSize: FONT_SIZE.xs, fontFamily: FONTS.regular, color: COLORS.textSecondary },
});
```

### 4.15 `FilterChip` — Two-Tier Dynamic Filter System

```typescript
import { Pressable, StyleSheet, Text } from 'react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SPACING } from '../constants/theme';

type Props = {
  label: string;
  active?: boolean;
  expanded?: boolean;
  accessibilityLabel?: string;
  onPress?: () => void;
};

export default function FilterChip({ label, active, expanded, accessibilityLabel, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Filter by ${label}`}
      accessibilityState={{ selected: Boolean(active), expanded }}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  labelActive: {
    color: COLORS.white,
  },
});
```

### 4.16 `CareerTimeline` — Milestone Rail & Timeline

```typescript
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, FONTS, SPACING } from '../constants/theme';

export type CareerEntry = {
  id: string;
  period: string;
  role: string;
  organization: string;
  current?: boolean;
};

export default function CareerTimeline({ entries }: { entries: CareerEntry[] }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Career History</Text>
      {entries.map((entry, index) => (
        <View key={entry.id} style={styles.row}>
          <View style={styles.rail}>
            <View style={[styles.dot, entry.current && styles.dotActive]} />
            {index < entries.length - 1 && <View style={styles.line} />}
          </View>
          <View style={styles.textGroup}>
            <Text style={[styles.period, entry.current && styles.periodActive]}>{entry.period}</Text>
            <Text style={styles.role}>{entry.role}</Text>
            <Text style={styles.organization}>{entry.organization}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: FONT_SIZE.md, fontFamily: FONTS.semibold, color: COLORS.text, marginBottom: SPACING.md },
  row: { flexDirection: 'row' },
  rail: { alignItems: 'center', width: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.timelineDotInactive },
  dotActive: { backgroundColor: COLORS.timelineDotActive },
  line: { flex: 1, width: 2, backgroundColor: COLORS.timelineLine, marginVertical: 2 },
  textGroup: { flex: 1, paddingBottom: SPACING.lg, paddingLeft: SPACING.sm },
  period: { fontSize: FONT_SIZE.xs, fontFamily: FONTS.semibold, color: COLORS.textSecondary, marginBottom: 2 },
  periodActive: { color: COLORS.timelineDotActive },
  role: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.semibold, color: COLORS.text },
  organization: { fontSize: FONT_SIZE.xs, fontFamily: FONTS.regular, color: COLORS.textSecondary },
});
```

### 4.17 `CivicCheckCard` & `VotingRecordCard`

```typescript
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../constants/theme';

export function CivicCheckCard({ icon, title, status }: { icon: ReactNode; title: string; status: string }) {
  return (
    <View style={styles.checkCard}>
      <View style={styles.checkIconBox}>{icon}</View>
      <Text style={styles.checkTitle}>{title}</Text>
      <View style={styles.checkStatusRow}>
        <View style={styles.checkStatusDot} />
        <Text style={styles.checkStatus}>{status}</Text>
      </View>
    </View>
  );
}

type VotingBar = { label: string; percentage: number; color: string };

export function VotingRecordCard({ bars }: { bars: VotingBar[] }) {
  return (
    <View style={styles.votingCard}>
      <Text style={styles.votingTitle}>Voting Record Analysis</Text>
      <Text style={styles.votingSubtitle}>Based on legislative participation and public policy positions.</Text>
      {bars.map((bar) => (
        <View key={bar.label} style={styles.barRow}>
          <View style={styles.barLabelRow}>
            <Text style={styles.barLabel}>{bar.label}</Text>
            <Text style={styles.barPercentage}>{bar.percentage}%</Text>
          </View>
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.min(100, Math.max(0, bar.percentage || 0)) }}
          >
            <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, bar.percentage || 0))}%`, backgroundColor: bar.color }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  checkCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOW },
  checkIconBox: { width: 32, height: 32, borderRadius: RADIUS.sm, backgroundColor: COLORS.civicCheckIconBg, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  checkTitle: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.semibold, color: COLORS.text, marginBottom: 4 },
  checkStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  checkStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.serviceGreenIcon },
  checkStatus: { fontSize: FONT_SIZE.xs, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  votingCard: { backgroundColor: COLORS.onboardingHeaderBg, borderRadius: RADIUS.md, padding: SPACING.lg },
  votingTitle: { fontSize: FONT_SIZE.md, fontFamily: FONTS.semibold, color: COLORS.text, marginBottom: 4 },
  votingSubtitle: { fontSize: FONT_SIZE.xs, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  barRow: { marginBottom: SPACING.md },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.medium, color: COLORS.text },
  barPercentage: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.semibold, color: COLORS.text },
  track: { height: 6, borderRadius: 3, backgroundColor: COLORS.votingBarTrack, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
```

### 4.18 `VideoTutorialCard` — Inline Player & Fullscreen Modal

```typescript
import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Maximize, Play, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../constants/theme';

export default function VideoTutorialCard({ title, description, thumbnail, videoUrl }: { title: string; description: string; thumbnail: any; videoUrl: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const player = useVideoPlayer(videoUrl, (instance) => {
    instance.loop = false;
  });

  return (
    <View style={styles.card}>
      <View style={styles.videoWrap}>
        {isPlaying ? (
          <>
            {!isFullscreen && <VideoView style={styles.video} player={player} nativeControls />}
            <Pressable hitSlop={8} onPress={() => setIsFullscreen(true)} style={styles.fullscreenBtn}>
              <Maximize size={20} color={COLORS.white} />
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.thumbWrap} onPress={() => { setIsPlaying(true); player.play(); }}>
            <Image source={thumbnail} style={styles.thumb} />
            <View style={styles.overlay} />
            <View style={styles.playBtn}>
              <Play size={22} color={COLORS.white} fill={COLORS.white} />
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>TUTORIAL</Text>
            </View>
          </Pressable>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <Modal animationType="fade" visible={isFullscreen} presentationStyle="fullScreen" onRequestClose={() => setIsFullscreen(false)}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.fullscreenContainer}>
          <VideoView style={styles.fullscreenVideo} player={player} nativeControls />
          <Pressable hitSlop={8} onPress={() => setIsFullscreen(false)} style={styles.closeBtn}>
            <X size={22} color={COLORS.white} />
          </Pressable>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW },
  videoWrap: { width: '100%', height: 180, backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
  fullscreenBtn: { position: 'absolute', right: SPACING.sm, bottom: SPACING.sm, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  thumbWrap: { width: '100%', height: '100%' },
  thumb: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.videoOverlay },
  playBtn: { position: 'absolute', top: '50%', left: '50%', marginTop: -24, marginLeft: -24, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  tag: { position: 'absolute', top: SPACING.md, right: SPACING.md, backgroundColor: COLORS.tutorialBadgeBg, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  tagText: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.white },
  body: { padding: SPACING.lg },
  title: { fontSize: FONT_SIZE.md, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 4 },
  description: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary, lineHeight: 20 },
  fullscreenContainer: { flex: 1, backgroundColor: '#000' },
  fullscreenVideo: { flex: 1, width: '100%' },
  closeBtn: { position: 'absolute', top: SPACING.sm, right: SPACING.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
});
```

### 4.19 `Badge` & `EventBadge` — Status Indicator Pills

```typescript
import { StyleSheet, Text, View } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SPACING } from '../constants/theme';

export default function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <BadgeCheck size={14} color={COLORS.badgeBg} fill={COLORS.badgeIcon} strokeWidth={2} />
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function EventBadge({ date, isFree }: { date: string; isFree: boolean }) {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const dateStr = isToday ? `Today, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : d.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <View style={styles.row}>
      <View style={styles.dateBadge}>
        <Text style={styles.dateText}>{dateStr}</Text>
      </View>
      <View style={[styles.pill, isFree ? styles.freePill : styles.paidPill]}>
        <Text style={[styles.pillText, isFree ? styles.freeText : styles.paidText]}>
          {isFree ? 'Free' : 'Paid'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: COLORS.badgeBg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xxs, borderRadius: RADIUS.md, gap: 4 },
  badgeText: { fontFamily: FONTS.medium, fontSize: FONT_SIZE.xs, color: COLORS.serviceGreenIcon },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  dateBadge: { backgroundColor: COLORS.onboardingHeaderBg, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  dateText: { fontSize: FONT_SIZE.xs, fontFamily: FONTS.semibold, color: COLORS.text },
  pill: { borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  freePill: { backgroundColor: '#E3F5E9' },
  paidPill: { backgroundColor: '#FDEEE3' },
  pillText: { fontSize: FONT_SIZE.xs, fontFamily: FONTS.semibold },
  freeText: { color: '#1E8A4C' },
  paidText: { color: '#B5651D' },
});
```

### 4.20 `SearchBar` & `SectionHeader`

```typescript
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SPACING } from '../constants/theme';

export function SearchBar({ value, onChangeText, placeholder = 'Search candidates by name...' }: { value: string; onChangeText: (t: string) => void; placeholder?: string }) {
  return (
    <View style={styles.searchContainer}>
      <Search size={18} color={COLORS.textSecondary} />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
      />
    </View>
  );
}

export function SectionHeader({ title, actionText, onPress }: { title: string; actionText?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionText && (
        <Pressable onPress={onPress}>
          <Text style={styles.sectionAction}>{actionText}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 44, gap: SPACING.sm },
  searchInput: { flex: 1, fontSize: FONT_SIZE.sm, fontFamily: FONTS.regular, color: COLORS.text },
  sectionContainer: { marginTop: SPACING.xl, marginBottom: SPACING.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontFamily: FONTS.bold, color: COLORS.text },
  sectionAction: { color: COLORS.primary, fontFamily: FONTS.semibold },
});
```

---

## 5. Motion & Animation Engineering Formulas

### 5.1 Scroll-Driven Dynamic Header Collapse

```typescript
const HEADER_HEIGHT = 52;
const [headerTranslateY] = useState(() => new Animated.Value(0));
const lastScrollOffset = useRef(0);
const isHeaderVisible = useRef(true);

const setHeaderVisibility = (visible: boolean) => {
  if (isHeaderVisible.current === visible) return;
  isHeaderVisible.current = visible;
  Animated.timing(headerTranslateY, {
    toValue: visible ? 0 : -HEADER_HEIGHT,
    duration: 180,
    useNativeDriver: true,
  }).start();
};

const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
  const offset = Math.max(nativeEvent.contentOffset.y, 0);
  const difference = offset - lastScrollOffset.current;

  if (offset <= 0 || difference < -4) {
    setHeaderVisibility(true);
  } else if (difference > 4) {
    setHeaderVisibility(false);
  }
  lastScrollOffset.current = offset;
};
```

### 5.2 Staggered Entrance Animations

```typescript
useEffect(() => {
  const delay = Math.min(index, 8) * 60; // Up to 8 items stagger by 60ms

  Animated.parallel([
    Animated.timing(opacity, {
      toValue: 1,
      duration: 280,
      delay,
      useNativeDriver: true,
    }),
    Animated.timing(translateY, {
      toValue: 0,
      duration: 280,
      delay,
      useNativeDriver: true,
    }),
  ]).start();
}, [index]);
```

---

## 6. UX Writing & Non-Jargon Copywriting Directives

Clean mobile apps succeed because users immediately understand every screen without cognitive load:

| Instead of Technical/Jargon Copy | Use Human, Direct Otto Copy |
|---|---|
| "Authentication required to proceed" | "Guest User — Explore without an account" |
| "Entity verification status: confirmed" | "Verified Profile" |
| "Null query returned 0 results" | "No candidates match 'Nairobi'" |
| "Execute pairwise differential comparison" | "Side-by-side policy comparison" |
| "Persist comparison metadata" | "Save Comparison" |
| "Geolocation coordinates unavailable" | "-- km • Location disabled" |
| "System error submitting telemetry" | "Please select a category and describe the issue." |

### Copy Rules:
1. **Never Blame the User**: Write "No candidates found matching your criteria" instead of "Invalid search query".
2. **Transparent Expectations**: Always state if data is saved locally ("Note: your report is saved locally on this device only").
3. **Action-Oriented Prompts**: Use "Start Reading", "Browse Candidates", "See Events Near Me", "Watch Guide".

---

## 7. Offline-First State & Storage Patterns

All state persists reliably with AsyncStorage using hydration guards:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useOfflineStorage<T>(storageKey: string, initialValue: T) {
  const [data, setData] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (stored) setData(JSON.parse(stored));
      })
      .catch((err) => console.warn(`Failed loading ${storageKey}`, err))
      .finally(() => setIsHydrated(true));
  }, [storageKey]);

  const update = (newValue: T) => {
    setData(newValue);
    AsyncStorage.setItem(storageKey, JSON.stringify(newValue)).catch((err) =>
      console.warn(`Failed persisting ${storageKey}`, err)
    );
  };

  return { data, update, isHydrated };
}
```

---

## 8. Accessibility, Touch Boundaries & Performance

- **Hit Slop**: Always apply `hitSlop={8}` to `{12}` on icon buttons and back navigation arrows.
- **Minimum Target Size**: Standalone buttons must be at least 40x40px or height 43px.
- **Accessibility Roles**: Explicitly declare `accessibilityRole="button"`, `accessibilityRole="progressbar"`, etc.
- **Accessibility States**: Declare `accessibilityState={{ selected: boolean, expanded: boolean }}` on tabs, chips, and accordions.
- **Keyboard Persistence**: Every FlatList within a modal or search container must set `keyboardShouldPersistTaps="handled"`.
- **Scroll Event Throttle**: Set `scrollEventThrottle={16}` on all `ScrollView` and `FlatList` animated listeners.
