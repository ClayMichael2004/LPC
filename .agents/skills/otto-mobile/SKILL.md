---
name: otto-mobile
description: >-
  The definitive mobile UI/UX engineering, non-jargon copywriting, animation math,
  and component implementation standard for React Native & Expo apps. Activate whenever
  designing, building, styling, or reviewing mobile screens, cards, navigation, headers,
  or micro-interactions to guarantee zero AI slop and flawless polish.
---

# Otto Mobile Skill

This skill embeds the full engineering standards and component blueprints of the Otto Mobile Design System.

## Core Directives for the Agent
1. **Never generate generic AI slop**: Avoid raw neon colors, harsh black shadows (`shadowOpacity > 0.1`), hardcoded status bar offsets, and robotic technical error messages.
2. **Follow the Theme Tokens**: Always reference `COLORS`, `SPACING`, `RADIUS`, `FONT_SIZE`, `SHADOW`, and `FONTS` (Poppins 400, 500, 600, 700).
3. **Flawless Motion**:
   - Accordions must use an off-screen measuring twin text element with `onLayout` to measure exact natural content height before animating (220ms duration).
   - Dynamic headers must auto-collapse when scrolling down > 4px and restore when scrolling up < -4px.
   - Lists must stagger their card entrances with `delay = Math.min(index, 8) * 60ms`.
4. **Fail-Safe Routing**:
   - Headers must check `router.canGoBack() ? router.back() : router.replace(...)`.
   - Headers must include a symmetrical `22px` spacer to guarantee centered titles.
5. **Human Microcopy**:
   - Zero jargon. Write warm, direct, action-first prompts ("Start Reading", "Browse Candidates", "Verified Profile").

For the complete catalog of tested component source code and tokens, consult `skills.md` in the project root.
