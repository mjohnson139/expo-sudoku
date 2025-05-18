import { Platform, UIManager } from 'react-native';

// Apply Android-specific optimizations
const applyAndroidOptimizations = () => {
  if (Platform.OS !== 'android') return;

  // Enable layout animations
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  // Pre-calculate common styles
  global.AndroidStyles = {
    // Force hardware acceleration for components
    hardwareAccelerated: {
      renderToHardwareTextureAndroid: true,
      backfaceVisibility: 'hidden',
    },
    // Disable elevation completely
    noElevation: {
      elevation: 0,
    },
    // Optimize text performance
    fastText: {
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    // Fast touchable with minimum overhead
    fastTouchable: {
      overflow: 'hidden',
      backfaceVisibility: 'hidden',
    },
    // Fast view with minimum overhead
    fastView: {
      needsOffscreenAlphaCompositing: false,
    },
    // Cell specific optimizations
    cell: {
      borderWidth: 1,
      borderColor: '#ccc',
      overflow: 'hidden',
      backfaceVisibility: 'hidden',
    }
  };
};

// Apply immediately when imported
applyAndroidOptimizations();

export default {
  applyAndroidOptimizations,
};