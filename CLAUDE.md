# Mobile App Engineering Guidelines (Otto Standard)

Adhere strictly to skills.md and agents.md for all React Native and Expo screens:
- Theme tokens: Soft shadows (0.08 opacity, radius 12), Poppins typography, pastel card surfaces.
- Safe Area: Always use `useSafeAreaInsets()`. Never hardcode top padding.
- Motion: Measure accordion height before expanding; collapse headers on downward scroll delta; stagger list entrances.
- Copy: Zero jargon. Use human, action-first phrasing.
