import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ALG_FONT } from './algText';
import CubeGlyph from './CubeGlyph';
import CubeKeyMenu, {
  MENU_HEIGHT,
  MENU_LIFT,
  MENU_OPTIONS,
  MENU_PADDING,
  MENU_WIDTH,
  OPTION_WIDTH,
} from './CubeKeyMenu';
import { padPalette } from './padPalette';
import {
  BACKSPACE_REPEAT_MS,
  HOLD_MS,
  PAD_COLUMNS,
  PAD_LAYOUT,
  describeToken,
} from './solve';

/**
 * The pad's fixed geometry (plan §8.8): three 44pt rows, two 5pt gaps, 10pt of
 * top padding.
 */
export const KEY_HEIGHT = 44;
export const KEY_GAP = 5;
export const PAD_TOP = 10;

/** How long a backspace waits before it starts repeating. */
const REPEAT_AFTER_MS = 400;

/** How far a finger may stray from a key before the press is abandoned. */
const SLOP = 16;

/**
 * The keyboard a solve gets written on — **with the accessory menu, on the
 * experiment branch** (operator, 2026-08-05).
 *
 * Tap a key for the plain move. **Press and hold and a menu opens above it**
 * with `′` and `2`; slide onto one and release to write it, release anywhere
 * else and you get the plain move. One gesture, both modifiers, and nothing to
 * remember between two taps.
 *
 * ### What this replaces, and why it is worth trying
 *
 * The shipped branch reaches the same two tokens by **three** routes: hold for
 * prime, tap the same key again for a half turn, and an armed `′` key for the
 * people the hold does not suit. Each was a good answer to the problem in front
 * of it and together they are three things to remember for two modifiers — which
 * is what the operator was second-guessing. All three come off here.
 *
 * It also puts the feedback where the hand is not, which is the thing the armed
 * `′` key was added to fix: **the menu opens clear of the fingertip**, so the
 * target and the confirmation are the same object.
 *
 * ### Why the gesture lives on the pad and not on the keys
 *
 * Sliding from a key onto a menu that overlaps its neighbours is one continuous
 * touch that crosses several views, and a `Pressable` per key cannot see a
 * finger that has left it. So the pad owns one `PanResponder`, hit-tests the
 * touch against the geometry every cell reports through `onLayout`, and the keys
 * are plain views that draw what the pad tells them.
 *
 * The cost is that keys are no longer `Pressable`s, so **VoiceOver cannot open
 * the menu**. `accessibilityActions` carry the two modifiers instead — the
 * standard equivalent of a long-press menu — and that is the accessible route to
 * a prime here. Worth checking with a screen reader before this ever ships.
 */
const CubeMovePad = ({ canUndo, canPhase, accent, theme, onKey, onUndo, onType, onPhase }) => {
  const palette = padPalette(theme, accent);

  const [pressed, setPressed] = useState(null);
  // The key the menu belongs to, or null. Separate from `pressed` because the
  // finger leaves the key as soon as it slides up onto the menu.
  const [menuKey, setMenuKey] = useState(null);
  // Which menu option is lit. **0 — the plain move — not −1**, because the
  // accent picker always has something selected and it starts on the base
  // character. There is no "nothing chosen" state to fall out of.
  const [option, setOption] = useState(0);

  // Where every cell is, in the pad's own coordinates. Filled by `onLayout` and
  // read by the hit test, so nothing here assumes a key width — the pad is
  // `flex`ed and its keys are 43pt on the narrowest phone and 56 on the widest.
  const cells = useRef({});
  const rows = useRef({});
  const padRef = useRef(null);
  // **Where the pad is on the screen**, measured rather than inferred.
  //
  // The obvious shortcut is `locationX`/`locationY` off the grant event, and it
  // is wrong: react-native-web reports those relative to the element the touch
  // *landed on* — a key — not to the view holding the responder. Every key then
  // reports roughly the same local point, which lands in whichever cell happens
  // to sit at the pad's top-left. Page coordinates are the only frame both the
  // gesture and the layout agree on.
  const padPage = useRef({ x: 0, y: 0 });
  const menuRect = useRef(null);
  const padWidthRef = useRef(0);

  const holdTimer = useRef(null);
  const repeatTimer = useRef(null);
  const repeatTick = useRef(null);
  // The gesture's own copy of what the render is showing. The responder
  // callbacks outlive the render that created them, so they cannot read state.
  const live = useRef({ cell: null, menu: false, option: 0 });

  const clearTimers = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (repeatTimer.current) clearTimeout(repeatTimer.current);
    if (repeatTick.current) clearInterval(repeatTick.current);
    holdTimer.current = null;
    repeatTimer.current = null;
    repeatTick.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    live.current = { cell: null, menu: false, option: 0 };
    menuRect.current = null;
    setPressed(null);
    setMenuKey(null);
    setOption(0);
  }, [clearTimers]);

  /** A cell's box in the pad's own coordinates, or null. */
  const boxOf = useCallback((id) => {
    const cell = cells.current[id];
    if (!cell) return null;
    const row = rows.current[cell.row];
    if (!row) return null;
    return { x: row.x + cell.x, y: row.y, w: cell.w, h: cell.h, isKey: cell.isKey };
  }, []);

  /** Which cell is under a point in pad coordinates, or null. */
  const cellAt = useCallback(
    (x, y) => {
      const found = Object.keys(cells.current).find((id) => {
        const box = boxOf(id);
        return box && x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
      });
      return found || null;
    },
    [boxOf]
  );

  /**
   * Which menu option is under a point.
   *
   * **Falls back to 0 — the plain move — rather than to "none".** Sliding off
   * the menu and letting go is the accent picker's way of changing your mind,
   * and it should land on the same token the lit cell is showing rather than on
   * a separate unlit path that happens to agree with it.
   */
  const optionAt = useCallback((x, y) => {
    const rect = menuRect.current;
    if (!rect) return 0;
    if (y < rect.y - SLOP || y > rect.y + rect.h + SLOP) return 0;
    const inset = x - (rect.x + MENU_PADDING);
    if (inset < 0 || inset > OPTION_WIDTH * MENU_OPTIONS.length) return 0;
    return Math.min(MENU_OPTIONS.length - 1, Math.floor(inset / OPTION_WIDTH));
  }, []);

  const openMenu = useCallback(
    (id) => {
      const box = boxOf(id);
      if (!box) return;

      // Centred over the key and lifted clear of it, then clamped so a menu on
      // the first or last column stays on the pad.
      const width = padWidthRef.current || 0;
      const left = Math.max(
        0,
        Math.min(width - MENU_WIDTH, box.x + box.w / 2 - MENU_WIDTH / 2)
      );
      const top = box.y - MENU_HEIGHT - MENU_LIFT;
      menuRect.current = { x: left, y: top, w: MENU_WIDTH, h: MENU_HEIGHT };

      live.current = { ...live.current, menu: true, option: 0 };
      setMenuKey(id);
      setOption(0);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    },
    [boxOf]
  );

  const fireTool = useCallback(
    (tool) => {
      if (tool === 'backspace') {
        if (canUndo) onUndo();
        return;
      }
      if (tool === 'keyboard') onType();
      if (tool === 'flag' && canPhase) onPhase();
    },
    [canUndo, canPhase, onUndo, onType, onPhase]
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (evt, gesture) => {
          const id = cellAt(gesture.x0 - padPage.current.x, gesture.y0 - padPage.current.y);
          if (!id) return;

          live.current = { cell: id, menu: false, option: 0 };
          setPressed(id);

          if (id === 'backspace') {
            repeatTimer.current = setTimeout(() => {
              repeatTick.current = setInterval(() => {
                if (canUndo) onUndo();
              }, BACKSPACE_REPEAT_MS);
            }, REPEAT_AFTER_MS);
            return;
          }

          // Only move keys have modifiers to offer.
          if (cells.current[id] && cells.current[id].isKey) {
            holdTimer.current = setTimeout(() => openMenu(id), HOLD_MS);
          }
        },

        onPanResponderMove: (evt, gesture) => {
          const x = gesture.moveX - padPage.current.x;
          const y = gesture.moveY - padPage.current.y;
          const state = live.current;
          if (!state.cell) return;

          if (state.menu) {
            const next = optionAt(x, y);
            if (next !== state.option) {
              live.current = { ...state, option: next };
              setOption(next);
            }
            return;
          }

          // Before the menu opens, straying off the key abandons the press —
          // the same escape the hold has always had.
          const box = boxOf(state.cell);
          if (
            box &&
            (x < box.x - SLOP || x > box.x + box.w + SLOP ||
              y < box.y - SLOP || y > box.y + box.h + SLOP)
          ) {
            reset();
          }
        },

        onPanResponderRelease: () => {
          const { cell, menu, option: chosen } = live.current;
          if (!cell) {
            reset();
            return;
          }

          const box = boxOf(cell);
          if (box && box.isKey) {
            // Whatever the menu had lit — and option 0 is the plain move, so a
            // tap, a hold released on the base, and a hold slid off the menu
            // all arrive here by the same route.
            const modifier = menu ? MENU_OPTIONS[chosen] || '' : '';
            onKey(cell, { modifier });
          } else if (box && !menu) {
            fireTool(cell);
          }
          reset();
        },

        onPanResponderTerminate: reset,
      }),
    [cellAt, boxOf, optionAt, openMenu, onKey, fireTool, reset, canUndo, onUndo]
  );

  // A cell's `onLayout` is relative to its **row**, so the row's own offset has
  // to be added to get pad coordinates. It is added **at hit-test time, not
  // here**: `onLayout` runs children before parents, so a cell that folded in
  // `rows.current[rowIndex]` as it was measured would fold in a zero — which is
  // exactly the bug that made every key below the first row unhittable while
  // the top row worked perfectly.
  const noteCell = (id, isKey, rowIndex) => ({ nativeEvent }) => {
    const { x, width, height } = nativeEvent.layout;
    cells.current[id] = { x, w: width, h: height, row: rowIndex, isKey };
  };

  const grid = [];
  for (let i = 0; i < PAD_LAYOUT.length; i += PAD_COLUMNS) {
    grid.push(PAD_LAYOUT.slice(i, i + PAD_COLUMNS));
  }

  const moveKey = (cell, rowIndex) => {
    const { key, tag } = cell;
    const group = palette.tone(cell.tone);
    const down = pressed === key || menuKey === key;

    const face = down
      ? { backgroundColor: palette.pressed, borderColor: palette.pressedBorder }
      : { backgroundColor: group.bg, borderColor: group.border };

    return (
      <View
        key={key}
        onLayout={noteCell(key, true, rowIndex)}
        style={[styles.cell, styles.key, face, down && styles.keyDown, styles.keyShadow]}
        accessibilityRole="button"
        accessibilityLabel={describeToken(key)}
        accessibilityHint="Tap to add this move; hold for prime or a half turn"
        // The accessible equivalent of the hold: VoiceOver cannot slide onto a
        // menu, so the two modifiers are offered as actions on the key.
        accessibilityActions={[
          { name: 'prime', label: 'Prime' },
          { name: 'double', label: 'Half turn' },
        ]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'prime') onKey(key, { modifier: "'" });
          if (nativeEvent.actionName === 'double') onKey(key, { modifier: '2' });
        }}
      >
        <Text
          style={[styles.keyText, { color: group.ink }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {key}
        </Text>

        {!!tag && <Text style={[styles.tag, { color: palette.faint }]}>{tag}</Text>}
      </View>
    );
  };

  const toolKey = (cell, rowIndex) => {
    const { tool } = cell;
    const isFlag = tool === 'flag';
    const group = isFlag ? palette.accent : palette.tone('tool');
    const disabled = tool === 'backspace' ? !canUndo : isFlag ? !canPhase : false;
    const label = {
      backspace: 'Undo the last move',
      keyboard: 'Type an algorithm',
      flag: 'End the phase here',
    }[tool];
    const down = pressed === tool;

    return (
      <View
        key={tool}
        onLayout={noteCell(tool, false, rowIndex)}
        style={[
          styles.cell,
          styles.key,
          { backgroundColor: down ? palette.pressed : group.bg, borderColor: group.border },
          down && styles.keyDown,
          disabled && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        // A plain `View` does not carry a `disabled` prop the way the `Pressable`
        // this replaced did, and `accessibilityState` alone does not reach the
        // DOM — so a dimmed backspace announced as available. Spelled out.
        aria-disabled={disabled || undefined}
      >
        <CubeGlyph name={tool} size={tool === 'keyboard' ? 20 : 19} color={group.ink} />
      </View>
    );
  };

  return (
    <View
      ref={padRef}
      style={styles.pad}
      onLayout={({ nativeEvent }) => {
        padWidthRef.current = nativeEvent.layout.width;
        // Re-measured on every layout, so a rotation or a keyboard appearing
        // cannot leave the hit test pointing at where the pad used to be.
        if (padRef.current && padRef.current.measureInWindow) {
          padRef.current.measureInWindow((x, y) => {
            padPage.current = { x, y };
          });
        }
      }}
      {...responder.panHandlers}
    >
      {grid.map((row, rowIndex) => (
        <View
          key={`row-${rowIndex}`}
          style={styles.row}
          onLayout={({ nativeEvent }) => {
            const { x, y } = nativeEvent.layout;
            rows.current[rowIndex] = { x, y };
          }}
        >
          {row.map((cell, cellIndex) => {
            if (cell.gap) return <View key={`gap-${cellIndex}`} style={styles.cell} />;
            return cell.tool ? toolKey(cell, rowIndex) : moveKey(cell, rowIndex);
          })}
        </View>
      ))}

      {menuKey && menuRect.current && (
        <CubeKeyMenu
          left={menuRect.current.x}
          top={menuRect.current.y}
          active={option}
          label={menuKey}
          accent={accent}
          palette={palette}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  pad: {
    alignSelf: 'stretch',
    paddingTop: PAD_TOP,
    paddingHorizontal: 8,
    gap: KEY_GAP,
  },
  row: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: KEY_GAP,
  },
  cell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  key: {
    height: KEY_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
  },
  keyShadow: {
    shadowColor: '#1f2430',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 0,
    elevation: 1,
  },
  keyDown: {
    transform: [{ translateY: 1 }],
  },
  keyText: {
    fontFamily: ALG_FONT,
    fontSize: 17,
    fontWeight: '700',
  },
  tag: {
    position: 'absolute',
    top: 3,
    right: 5,
    fontFamily: ALG_FONT,
    fontSize: 9,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.35,
  },
});

export default CubeMovePad;
