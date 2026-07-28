import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * "You are out of lives, and the board is starting over" (docs/fungiku-plan.md
 * §14.3).
 *
 * **Why this exists at all.** The first version of Step 10 restarted the board in
 * the same breath as the third mistake, with a line of text in the counter row to
 * explain it. The operator's report from device was that the board simply emptied
 * and there was no way to tell what had just happened — which is fair: the one
 * moment in the game where the player *loses* something was also the one moment
 * with the least to look at.
 *
 * So the restart is now something the player presses. The reducer leaves the
 * board at `lives === 0` holding the mark that killed it, this modal says what
 * happened over the top of it, and only then are the marks cleared. The fatal
 * red ✕ is still visible behind the dialog on purpose — "you got this cell wrong"
 * is the last useful thing the lost board has to say.
 *
 * Deliberately built to `FungikuMenuModal`'s shape (same overlay, box, fade) so
 * the two dialogs in this game read as the same app.
 */
const FungikuOutOfLivesModal = ({ visible, theme, lives, onRestart }) => {
  const fade = useRef(new Animated.Value(0)).current;

  // The hearts land one after another rather than all at once, so the row reads
  // as "these are what you spent" instead of as decoration.
  const heartsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: visible ? 1 : 0,
      duration: visible ? 260 : 160,
      useNativeDriver: true,
    }).start();

    // Driven, never `setValue`d while a native-driver animation owns it — the
    // rule the win animation was fixed by (plan §2).
    Animated.timing(heartsAnim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 420 : 0,
      delay: visible ? 140 : 0,
      useNativeDriver: true,
    }).start();
  }, [visible, fade, heartsAnim]);

  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRestart}>
      <Animated.View style={[styles.overlay, { opacity: fade }]}>
        <View style={[styles.box, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.hearts}>
            {Array.from({ length: lives }, (_, i) => (
              <Animated.View
                key={i}
                style={{
                  transform: [
                    {
                      scale: heartsAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1.25, 1],
                      }),
                    },
                  ],
                  opacity: heartsAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }),
                }}
              >
                <MaterialCommunityIcons
                  name="heart-broken"
                  size={26}
                  color={OUT_OF_LIVES}
                  style={styles.heart}
                />
              </Animated.View>
            ))}
          </View>

          <Text style={[styles.title, { color: titleColor }]}>Out of lives</Text>

          <Text style={[styles.body, { color: titleColor }]}>
            That was your last one. Three wrong mushrooms and the board starts over.
          </Text>

          <Text style={[styles.body, styles.reassurance, { color: titleColor }]}>
            It is the <Text style={styles.bold}>same puzzle</Text> — same board, same answer. Your
            marks are cleared and you get three fresh lives.
          </Text>

          <TouchableOpacity
            style={[styles.button, { borderColor: titleColor }]}
            onPress={onRestart}
            accessibilityRole="button"
            accessibilityLabel="Start this board over with three fresh lives"
          >
            <MaterialCommunityIcons name="restart" size={18} color={titleColor} />
            <Text style={[styles.buttonText, { color: titleColor }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

// The same red the hearts in the counter row use, so a spent life and this
// dialog are visibly the same idea.
const OUT_OF_LIVES = '#d1495b';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    // Sits **low**, over the controls, rather than centred like the difficulty
    // menu. Centred it covered the bottom rows of the board, which defeats the
    // reason the board is still there — the fatal red ✕ is the last useful thing
    // the lost board has to say, and a dialog explaining the loss should not be
    // what hides it.
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 32,
    zIndex: 100,
  },
  box: {
    width: 280,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  hearts: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  heart: {
    marginHorizontal: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  reassurance: {
    opacity: 0.8,
    marginBottom: 16,
  },
  bold: {
    fontWeight: '700',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },
});

export default FungikuOutOfLivesModal;
