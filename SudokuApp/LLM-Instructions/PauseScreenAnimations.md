# Pause Screen (Menu Modal) Animations: How to Add or Modify

The pause/menu screen in this Sudoku app is implemented as a modal in `GameScreen.js` (triggered by the `showMenu` state). To enhance user experience, the modal supports engaging animations and a blurred/dimmed overlay. This guide explains how to add, modify, or extend these animations.

## Current Implementation
- **Animation API:** Uses React Native's `Animated` API to animate the modal's appearance (fade-in, scale) and an animated element (currently a large pause emoji).
- **Blurred Overlay:** The modal background is dimmed/blurred while the menu is open, keeping the board visible but de-emphasized.
- **Extensibility:** The code is structured to allow easy replacement or extension of the animated element (e.g., with a Lottie animation).

## How to Add or Modify Animations

### 1. Locate the Menu Modal Code
- File: `screens/GameScreen.js`
- Look for the `Modal` component controlled by `showMenu`.
- The animation logic is set up using a `menuAnim` Animated.Value and related `Animated.View` wrappers.

### 2. Replace or Extend the Animated Element
- The animated element is currently a large pause emoji (`⏸️`) wrapped in an `Animated.View`.
- **To use a Lottie animation:**
  1. Install `lottie-react-native` and add a Lottie JSON animation file to your project.
  2. Import and render `<LottieView ... />` inside the animated wrapper, using the same animation triggers (e.g., play when `showMenu` is true).
  3. Remove or comment out the emoji if not needed.
- **To add more effects:**
  - You can animate other properties (e.g., color, rotation) using the same `menuAnim` value or add new ones.

### 3. Ensure Button Accessibility
- The animation and overlay should not block or interfere with the menu's buttons (restart, difficulty selection, etc.).
- Test on device/emulator to confirm all buttons remain accessible and responsive.

### 4. Example: Adding a Lottie Animation
```js
import LottieView from 'lottie-react-native';
// ...inside the Animated.View...
<LottieView
  source={require('../assets/pause-animation.json')}
  autoPlay={showMenu}
  loop
  style={{ width: 120, height: 120 }}
/>
```

## Tips
- Keep animations short and non-distracting.
- Test on both iOS and Android for performance and appearance.
- For advanced effects, consider using libraries like `react-native-reanimated` or `react-native-blur` for overlays.

## References
- [React Native Animated API](https://reactnative.dev/docs/animated)
- [Lottie for React Native](https://github.com/lottie-react-native/lottie-react-native)

---
For further questions, see comments in `GameScreen.js` or ask your team for animation best practices.
