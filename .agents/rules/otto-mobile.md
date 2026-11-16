---
trigger: always_on
description: Mandatory mobile UI/UX engineering, non-jargon copywriting, and zero-slop rules for all React Native and Expo projects.
---

# Otto Mobile Engineering & Zero-Slop Rules

When writing, editing, or scaffolding React Native or Expo mobile code:

1. **Colors & Surfaces**:
   - Card backgrounds must use delicate pastel tints: Blue (`#DBEAFE`/`#D8E5FF`), Green (`#DCFCE7`/`#72F2A5`), Pink (`#FCE7F3`/`#FFD8D8`), Purple (`#E5D9FF`).
   - Card icons must use deep contrasting shades: Navy (`#07345F`), Forest Green (`#075B35`), Crimson (`#691414`), Deep Violet (`#4C1D95`).
   - Shadows must be soft: `{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }`.

2. **Safe Area & Translucency**:
   - Never hardcode status bar or notch padding (e.g. `paddingTop: 45`). Always read `useSafeAreaInsets()`.
   - Always mount `SystemBarBlur` over `insets.top` (`expo-blur` intensity 100, `pointerEvents="none"`).

3. **Motion Without Jitter**:
   - Accordions must measure their natural height using an off-screen twin text element before expanding. Never animate height blindly.
   - Screen headers must collapse smoothly on downward scroll (`offset - lastOffset > 4`) and restore on upward scroll.
   - Lists must stagger item entrances using `delay = Math.min(index, 8) * 60ms`.

4. **Navigation Safety**:
   - Back buttons must use fail-safe routing: `router.canGoBack() ? router.back() : router.replace(...)`.
   - Headers must include a symmetrical `22px` spacer matching the left back icon to mathematically center the title.

5. **Non-Jargon UX Writing**:
   - Never write technical system messages ("Null results", "Status code 404", "Authentication required").
   - Always write human, action-first microcopy ("No candidates match your search", "Guest User — Explore without an account", "Start Reading").
