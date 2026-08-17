import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CubeHome from './CubeHome';
import CubeSolve from './CubeSolve';
import { CUBE_ACCENT, CubeLoading } from './cubeChrome';
import { CubeProvider, HOME_ROUTE, SOLVE_ROUTE } from './CubeContext';

export { CUBE_ACCENT };

/**
 * Cube Scramble — get a scramble, save it, and write solves against it
 * (docs/cube-plan.md §2, docs/cube-flow-plan.md §3.2).
 *
 * ### What this file is
 *
 * Until Step 2 it was the whole feature: 1525 lines, two modes and a persisted
 * `solving` flag telling them apart. It is the game's **shell** now — one state
 * owner and a stack of two screens — and everything it used to do lives in one
 * of three places:
 *
 *  - `CubeContext.js` — the scramble, the favorites, the solves, which one is
 *    open, the view angle, and the single debounced writer for all of it;
 *  - `CubeHome.js` — the scramble;
 *  - `CubeSolve.js` — the solve, pushed on top of it.
 *
 * ### Why a nested stack
 *
 * "A solve is a page you open and close" is a *route*, and the moment it is one,
 * Android's hardware back and the iOS edge swipe leave it for free — where the
 * flag needed a button in the corner and could not be dismissed any other way.
 * It nests inside the app's stack (`App.js`), so backing out of the scramble
 * itself still leaves the cube for the hub: one gesture, two levels, in the
 * order the operator expects.
 *
 * The route is also **the reason there is a provider**: a screen under a push
 * stays mounted, so state that used to be shared by being in one component now
 * has to be shared by being above two (docs/cube-flow-plan.md §5).
 *
 * ### `headerShown: false`
 *
 * Both screens draw their own `ScreenHeader`, dense, with the controls riding on
 * it (docs/cube-plan.md §8.6) — a second, taller header above that would cost
 * the cube the height of a row on a screen whose subject is a square.
 */
const Stack = createNativeStackNavigator();

const CubeScreen = ({ onExitToHub }) => (
  <CubeProvider fallback={<CubeLoading onExitToHub={onExitToHub} />}>
    <Stack.Navigator initialRouteName={HOME_ROUTE} screenOptions={{ headerShown: false }}>
      <Stack.Screen name={HOME_ROUTE}>
        {({ navigation }) => <CubeHome navigation={navigation} onExitToHub={onExitToHub} />}
      </Stack.Screen>
      <Stack.Screen name={SOLVE_ROUTE} component={CubeSolve} />
    </Stack.Navigator>
  </CubeProvider>
);

export default CubeScreen;
