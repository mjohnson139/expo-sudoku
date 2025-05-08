# Current work in progress

## Implementation Strategy

### Phase 1: Enhance UX with Haptics and Icons
- Add tactile feedback for cell selection and number placement using `expo-haptics`.
- Replace text buttons with icons where appropriate using `@expo/vector-icons`.

### Phase 2: Add Animations
- Implement animations for cell selection, number placement, and win condition using `react-native-reanimated`.
- Add transitions between screens/modals for a smoother user experience.

### Phase 3: Improve Navigation and Structure
- Set up `expo-router` and `@react-navigation/native` for better app organization.
- Create dedicated screens for different app sections (e.g., Home, Game, Settings, Statistics).

### Phase 4: Expand Platforms
- Ensure the app works well on web using `react-native-web`.
- Optimize layout for different screen sizes and devices.

## Proposed Libraries

- `expo-haptics`: For tactile feedback during interactions.
- `@expo/vector-icons`: To enhance UI with consistent and visually appealing icons.
- `react-native-reanimated`: For smooth and physics-based animations.
- `expo-router` and `@react-navigation/native`: To implement structured navigation and deep linking.
- `react-native-web`: To make the app accessible on web platforms.
- `expo-blur`: To add blur effects for modals and overlays, enhancing visual depth.