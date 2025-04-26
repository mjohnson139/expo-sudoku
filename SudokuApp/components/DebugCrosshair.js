import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, PanResponder, Dimensions, Animated, TouchableOpacity, DeviceEventEmitter } from 'react-native';

const REST_DELAY_MS = 2000; // Configurable delay in ms

// Global reference to allow external access to tap dot function
let globalAddTapDot = null;

/**
 * DebugTapDot - A visual indicator for automated tap locations
 * Renders a semi-transparent red dot at the specified coordinates
 */
const DebugTapDot = ({ x, y }) => {
  return (
    <View
      style={{
        position: 'absolute',
        left: x - 10,
        top: y - 10,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'red',
        opacity: 0.5,
        zIndex: 9999,
      }}
    />
  );
};

/**
 * DebugCrosshair - A development overlay component that displays crosshair lines
 * with X/Y coordinates and element identification for UI testing.
 * 
 * This component is completely independent and renders as an overlay on top of the app.
 */
const DebugCrosshair = () => {
  // Get screen dimensions for proper positioning
  const { width, height } = Dimensions.get('window');
  
  // Use Animated.Value for smooth movement
  const crosshairX = useRef(new Animated.Value(width / 2)).current;
  const crosshairY = useRef(new Animated.Value(height / 2)).current;
  const [crosshairPosition, setCrosshairPosition] = useState({ x: width / 2, y: height / 2 });
  const [elementId, setElementId] = useState('No element');
  
  // Track tap dots for visualization
  const [tapDots, setTapDots] = useState([]);
  
  const overlayRef = useRef(null);
  const [overlayOffset, setOverlayOffset] = useState({ x: 0, y: 0 });

  // Add manual active toggle
  const [active, setActive] = useState(true);

  // Measure overlay absolute position when it lays out
  const onOverlayLayout = () => {
    overlayRef.current?.measureInWindow((x, y) => {
      setOverlayOffset({ x, y });
    });
  };

  // Adjusted helper to print debug message for LLM/IDP
  const printLLMDebugTap = (x, y, elementId) => {
    const absX = Math.round(x + overlayOffset.x);
    const absY = Math.round(y + overlayOffset.y + 70); // Adjust Y-axis by 70
    console.log(
      `[LLM INSTRUCTION] Tap at coordinates: x=${absX}, y=${absY} (element: ${elementId})`
    );
  };

  // Heuristic for cell to coordinate conversion
  // cell(1,1) = (62,184), cell(1,9) = (347,184), cell(9,9) = (347,471)
  const getCellCoordinate = (row, col) => {
    // Top-left cell: (62,184), bottom-right: (347,471)
    const x0 = 62, y0 = 184;
    const x9 = 347, y9 = 471;
    const cellWidth = (x9 - x0) / 8; // 8 intervals for 9 cells
    const cellHeight = (y9 - y0) / 8;
    const x = Math.round(x0 + (col - 1) * cellWidth);
    const y = Math.round(y0 + (row - 1) * cellHeight);
    return { x, y };
  };

  // Keep state in sync with animated values
  useEffect(() => {
    const xListener = crosshairX.addListener(({ value }) => setCrosshairPosition(pos => ({ ...pos, x: value })));
    const yListener = crosshairY.addListener(({ value }) => setCrosshairPosition(pos => ({ ...pos, y: value })));
    return () => {
      crosshairX.removeListener(xListener);
      crosshairY.removeListener(yListener);
    };
  }, [crosshairX, crosshairY]);

  // Update dimensions if screen size changes
  useEffect(() => {
    const updateDimensions = () => {
      const { width, height } = Dimensions.get('window');
      setCrosshairPosition(prev => ({
        x: Math.min(prev.x, width),
        y: Math.min(prev.y, height)
      }));
    };
    
    const subscription = Dimensions.addEventListener('change', updateDimensions);
    return () => subscription.remove();
  }, []);
  
  // PanResponder for crosshair movement
  const lastPan = useRef({ x: width / 2, y: height / 2 });
  const crosshairPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => active,
      onMoveShouldSetPanResponder: (e, gs) => active && (Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5),
      onPanResponderGrant: () => {},
      onPanResponderMove: (e, gestureState) => {
        const newX = lastPan.current.x + gestureState.dx;
        const newY = lastPan.current.y + gestureState.dy;
        Animated.timing(crosshairX, { toValue: newX, duration: 16, useNativeDriver: false }).start();
        Animated.timing(crosshairY, { toValue: newY, duration: 16, useNativeDriver: false }).start();
        identifyElementAtPosition(newX, newY);
      },
      onPanResponderRelease: (e, gestureState) => {
        lastPan.current = { x: lastPan.current.x + gestureState.dx, y: lastPan.current.y + gestureState.dy };
        addTapDot(lastPan.current.x, lastPan.current.y);
      },
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  // Function to identify UI element at the given position
  const identifyElementAtPosition = (x, y) => {
    // In a real implementation, this would use accessibility API
    // or another method to identify the actual element
    // For now, we'll just display the coordinates
    const elementAtPosition = `Element at (${Math.round(x)}, ${Math.round(y)})`;
    setElementId(elementAtPosition);
  };

  // Function to add a tap dot at the given position
  const addTapDot = (x, y) => {
    const newDot = { id: Date.now(), x, y };
    setTapDots(dots => [...dots, newDot]);
    setTimeout(() => {
      setTapDots(dots => dots.filter(dot => dot.id !== newDot.id));
    }, REST_DELAY_MS);
  };

  // Public method to add automated tap dots from external components
  const addAutomatedTapDot = (x, y) => {
    // Apply Y-axis offset correction (-70) to match the actual tap location
    // Add an additional +10 pixels to the Y axis to center the dot properly
    const newDot = { id: Date.now(), x, y: y - 70 + 10, automated: true };
    setTapDots(dots => [...dots, newDot]);
    setTimeout(() => {
      setTapDots(dots => dots.filter(dot => dot.id !== newDot.id));
    }, REST_DELAY_MS);
  };

  // Store the function in the global reference so it can be called externally
  useEffect(() => {
    globalAddTapDot = addAutomatedTapDot;
    
    // Listen for simulator tap events
    const tapSubscription = DeviceEventEmitter.addListener('simulatorTap', ({x, y}) => {
      addAutomatedTapDot(x, y);
      console.log(`Debug dot added at (${x}, ${y})`);
    });
    
    return () => {
      globalAddTapDot = null;
      tapSubscription.remove();
    };
  }, []);

  // Adjusted crosshair position display to add 70 to the Y-coordinate
  const getInfoBoxPosition = () => {
    const { width, height } = Dimensions.get('window');
    const infoBoxWidth = 200; // matches maxWidth in styles
    const infoBoxHeight = 48; // estimate for two lines of text
    const PADDING = 32; // Increased padding from crosshairs
    let left = crosshairPosition.x + PADDING;
    let top = crosshairPosition.y + PADDING;
    if (left + infoBoxWidth > width) {
      left = width - infoBoxWidth - 10;
    }
    if (top + infoBoxHeight > height) {
      top = height - infoBoxHeight - 10;
    }
    if (left < 0) left = 0;
    if (top < 0) top = 0;
    return { left, top };
  };

  return (
    <View
      ref={overlayRef}
      onLayout={onOverlayLayout}
      style={styles.overlayContainer}
      pointerEvents="box-none"
    >
      {/* Manual toggle button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setActive(a => !a)}
      >
        <Text style={styles.toggleText}>{active ? 'Disable' : 'Enable'} Crosshair</Text>
      </TouchableOpacity>

      <View
        style={styles.crosshairContainer}
        pointerEvents={active ? 'box-only' : 'none'}
        {...crosshairPanResponder.panHandlers}
      >
        {/* Vertical line */}
        <Animated.View style={[
          styles.crosshairLine, 
          styles.verticalLine, 
          { left: crosshairX }
        ]} />
        
        {/* Horizontal line */}
        <Animated.View style={[
          styles.crosshairLine, 
          styles.horizontalLine,
          { top: crosshairY }
        ]} />
        
        {/* Info box always visible, not touchable */}
        <View style={[styles.crosshairInfo, getInfoBoxPosition()]}>
          <Text style={styles.crosshairText}>
            X: {Math.round(crosshairPosition.x)}, Y: {Math.round(crosshairPosition.y) + 70}
          </Text>
        </View>

        {/* Render tap dots using the new component */}
        {tapDots.map((dot) => (
          dot.automated ? (
            <DebugTapDot key={dot.id} x={dot.x} y={dot.y} />
          ) : (
            <View
              key={dot.id}
              style={[
                styles.tapDot,
                { left: dot.x - 5, top: dot.y - 5 }
              ]}
            />
          )
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999, // Ensure it's on top of everything else
    elevation: 9999, // For Android
  },
  crosshairContainer: {
    width: '100%',
    height: '100%',
  },
  crosshairLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 0, 0, 0.75)',
  },
  verticalLine: {
    width: 1,
    height: '100%',
    top: 0,
  },
  horizontalLine: {
    height: 1,
    width: '100%',
    left: 0,
  },
  crosshairInfo: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 8,
    borderRadius: 4,
    maxWidth: 200,
  },
  crosshairText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  toggleButton: {
    position: 'absolute', top: 16, left: 16, zIndex: 10001,
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 4,
  },
  toggleText: { color: '#fff', fontSize: 12 },
  tapDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0, 255, 0, 0.75)',
  },
});

// Export both components
export { DebugTapDot };
export default DebugCrosshair;