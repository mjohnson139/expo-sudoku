import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, AppState, DeviceEventEmitter, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HubScreen from './screens/HubScreen';
import { HUB_ROUTE, GAMES } from './games/registry';

/**
 * App shell and navigator.
 *
 * A native stack over `games/registry.js`: the hub is the root route and each
 * game is a route pushed on top of it (docs/cube-flow-plan.md §3.1). This
 * replaced a hand-rolled `useState` route in Cube Flow Step 1, because Step 2
 * pushes a solve screen onto a stack and the hand-rolled router had no answer
 * for Android hardware back or the iOS edge swipe.
 *
 * `headerShown: false` throughout — every screen already draws its own
 * `ScreenHeader`.
 *
 * Two behaviours the old router got for free and this one has to arrange:
 *
 *  - **A game screen dies when you leave it.** Each game owns its state and its
 *    persistence, and unmounting is what guarantees its timer stops; progress
 *    survives because the screen hydrates from the same saved snapshot on the
 *    way back in. Leaving is always `popToTop()`, which pops the game off the
 *    stack and unmounts it. A `navigate` back to the hub would not.
 *  - **The hub re-reads progress when you return to it.** It reads on mount,
 *    which was enough when it unmounted behind an open game; on a stack it
 *    stays mounted underneath, so `HubRoute` remounts it on the way back.
 *
 * ### The resume remount, and why one game opts out
 *
 * `appKey` bumps on `AppState → 'active'` and is keyed onto the open game, so
 * resuming remounts it and it re-reads its saved snapshot. That is how Sudoku
 * and Fungiku restore themselves and they keep it.
 *
 * **The cube opts out** (`keepsStateOnResume` in `games/registry.js`), for two
 * reasons found on a device in Cube Flow Step 3a:
 *
 *  - It does not need it. `CubeContext` owns everything persisted, above both of
 *    the cube's screens, and flushes on the way out — so on resume the state in
 *    memory is *fresher* than the file, and re-reading replaces it with an older
 *    copy of itself.
 *  - It was visibly wrong. The cube has **its own navigator** inside it, and a
 *    remount resets that navigator to its first route — so an open solve had to
 *    be pushed back onto the stack from the save file, and a native stack
 *    *animates* a route it is handed. The operator came back to their solve and
 *    then watched it slide in over itself. No amount of suppressing that
 *    animation makes rebuilding the stack the right thing to have done.
 *
 * What the remount was quietly enforcing for the cube — that the scrub position
 * and the turn speed do not survive a background (docs/cube-plan.md §7.1) — is
 * now written down where it belongs, as `rewind` in `useScramblePlayer`.
 */
const Stack = createNativeStackNavigator();

/**
 * The hub, remounted whenever it is returned to.
 *
 * `HubScreen` reads each game's Continue badge on mount and nothing else
 * refreshes it, so without this the badges would show the state you *started*
 * the game with. Keyed off a blur→focus round trip rather than focus alone:
 * the initial route is focused as it mounts, and reacting to that would remount
 * the hub for nothing on every cold start.
 */
function HubRoute({ navigation }) {
  const [visit, setVisit] = useState(0);
  const leftForAGame = useRef(false);

  useEffect(() => {
    const stopBlur = navigation.addListener('blur', () => {
      leftForAGame.current = true;
    });
    const stopFocus = navigation.addListener('focus', () => {
      if (!leftForAGame.current) return;
      leftForAGame.current = false;
      setVisit((previous) => previous + 1);
    });

    return () => {
      stopBlur();
      stopFocus();
    };
  }, [navigation]);

  return <HubScreen key={visit} onSelectGame={(id) => navigation.navigate(id)} />;
}

export default function App() {
  const [appKey, setAppKey] = useState(0);

  useEffect(() => {
    // Handle app state changes
    const appStateSubscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        // Remount the open game screen to restore UI on resume
        setAppKey(prev => prev + 1);
      }
    });

    // Setup touch event interception for simulator taps
    // This helps with displaying the debug taps
    let lastTouchEvent = null;
    const handleTouch = (e) => {
      // Different handling based on platform
      if (Platform.OS === 'web') {
        // For web, handle mouse clicks
        const pageX = e.nativeEvent.pageX || e.nativeEvent.clientX;
        const pageY = e.nativeEvent.pageY || e.nativeEvent.clientY;

        if (pageX && pageY) {
          // Don't emit duplicate events for the same touch
          const touchKey = `${pageX}-${pageY}`;
          if (lastTouchEvent !== touchKey) {
            lastTouchEvent = touchKey;

            // Use a custom event for web
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('simulatorTap', {
                detail: { x: pageX, y: pageY }
              }));
            }

            // Reset after a short delay to prevent duplicate filtering
            setTimeout(() => {
              lastTouchEvent = null;
            }, 500);
          }
        }
      } else {
        // Native platforms (iOS/Android)
        const touch = e.nativeEvent.touches[0];
        if (touch) {
          // Don't emit duplicate events for the same touch
          const touchKey = `${touch.pageX}-${touch.pageY}`;
          if (lastTouchEvent !== touchKey) {
            lastTouchEvent = touchKey;

            // Emit event for DebugCrosshair to pick up
            DeviceEventEmitter.emit('simulatorTap', {
              x: touch.pageX,
              y: touch.pageY
            });

            // Reset after a short delay to prevent duplicate filtering
            setTimeout(() => {
              lastTouchEvent = null;
            }, 500);
          }
        }
      }
    };

    // Make this listener available globally
    global.touchHandler = handleTouch;

    return () => {
      appStateSubscription.remove();
      global.touchHandler = null;
    };
  }, []);

  // Handle touch events with platform awareness
  const handleTouchStart = (e) => {
    // Call the touch handler to capture simulator taps
    if (global.touchHandler) {
      global.touchHandler(e);
    }
  };

  return (
    <SafeAreaProvider>
      {/* The tap interception wraps the whole tree, navigator included, exactly
          as it did around the hand-rolled router. */}
      <SafeAreaView
        style={{ flex: 1 }}
        onTouchStart={handleTouchStart}
        onClick={Platform.OS === 'web' ? handleTouchStart : undefined}
      >
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName={HUB_ROUTE}
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name={HUB_ROUTE} component={HubRoute} />

            {/* A route per registry entry, so adding a game stays a registry
                edit. `onExitToHub` keeps its name: nothing in `games/` changes
                for the navigator, it is adapted here at the call site. */}
            {GAMES.map((game) => (
              <Stack.Screen key={game.id} name={game.id}>
                {({ navigation }) => (
                  <game.Screen
                    // The resume remount, unless the game keeps its own state —
                    // see the docblock above. A constant key is still a key: it
                    // is this screen's only child either way.
                    key={
                      game.keepsStateOnResume ? game.id : `${game.id}-${appKey}`
                    }
                    onExitToHub={() => navigation.popToTop()}
                  />
                )}
              </Stack.Screen>
            ))}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
