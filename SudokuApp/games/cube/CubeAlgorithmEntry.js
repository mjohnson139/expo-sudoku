import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import CubeAlgInputModal from './CubeAlgInputModal';
import CubeCaseTile from './CubeCaseTile';
import { describeCase, sanitizeCase } from './algCase';
import { ALG_FONT } from './algText';
import {
  MAX_ALG_NAME,
  MAX_ALG_NOTES,
  algorithmCase,
  describeAlgorithmSize,
  hasAssignment,
  toggleAssignment,
} from './algorithms';
import { METHODS } from './methods';
import { CUBE_ACCENT, styles as chrome } from './cubeChrome';
import { useCube } from './CubeContext';

/** The tile here is bigger than the library card's 40 — this is the screen you
 *  are on when you want to *check* the case rather than recognise it, and 76
 *  divides into three 22-point stickers with nothing left over. */
const ENTRY_TILE = 76;

/**
 * One algorithm (docs/cube-methods-plan.md §3.1, Step 1).
 *
 * Name, moves, the stages it is for, and private notes — pushed over the library
 * by `＋` and by a card.
 *
 * ### The moves come first, and that is what makes this screen have one mode
 *
 * A new entry could have been a draft held here until a Save button, and then
 * this screen would be two screens: one that edits a thing and one that composes
 * a thing that does not exist. The moves are the one **required** field — an
 * entry whose moves do not parse is not an entry (`algorithms.js`) — so `＋`
 * asks for them straight away, in the modal, and the entry is created from the
 * answer. Cancel and there was never anything to save; submit and everything
 * from that point on is an edit of a real record.
 *
 * The id is written back onto the route (`setParams`) rather than kept in state,
 * so a re-render, a keyboard, or the operator backing out and in again all see
 * the same entry.
 *
 * ### Every field writes live, through the one funnel
 *
 * There is no Save. The name as it is typed, a tapped stage chip, the notes —
 * all of it goes through `editAlgorithmById`, which is `editAlgorithm` with the
 * clock attached (plan §5: *two edit funnels is how the file and the screen
 * learn to disagree*). That also means the rules — the name made unique, the
 * moves validated, an assignment checked against the catalogue — are enforced
 * once, in the pure module, rather than at each field.
 *
 * The name is the one field with a **local mirror**, because it is the one the
 * funnel can answer differently: type a name another entry already has and what
 * is stored is `Sune 2`. The mirror is what is being typed; the blur reseeds it
 * from what was kept, so the operator sees the answer rather than discovering it
 * on the card later.
 *
 * ### The page scrolls, and that is the difference from every other cube screen
 *
 * `CubeHome` and `CubeSolve` are fixed columns because the cube claims every pan
 * inside its square, and because a keyboard would cover a field nothing could
 * scroll out of the way (which is why typing an algorithm into a *solve* is a
 * modal). There is no cube here, so the page can scroll and the fields can be
 * fields.
 */
const CubeAlgorithmEntry = ({ navigation, route }) => {
  const { theme } = useAppTheme();
  const { algorithmById, addAlgorithm, editAlgorithmById, deleteAlgorithm } = useCube();

  const id = (route.params && route.params.id) || null;
  const entry = algorithmById(id);

  // Open with the modal up for a brand-new entry, and never again: this is the
  // "the moves come first" flow, and it must not re-arm when the operator opens
  // the same modal later to change them.
  const [asking, setAsking] = useState(id === null);

  const [nameText, setNameText] = useState((entry && entry.name) || '');
  useEffect(() => {
    setNameText((entry && entry.name) || '');
    // Keyed on the **id**, not the name: reseeding on every stored change would
    // rewrite the field under the thumb that is typing in it.
  }, [entry && entry.id]);

  const titleColor = theme.colors.title;
  const border = theme.colors.numberPad.border;
  const surface = theme.colors.numberPad.background;

  /**
   * What the moves modal's Save means, and it means two different things.
   *
   * With no entry yet this is the create — and `addAlgorithm` can still refuse,
   * because the library may be full. There is nowhere useful to stand in that
   * case, so the screen leaves; the library's own `＋` already says so, and this
   * path is only reachable by racing it.
   */
  const submitMoves = useCallback(
    (moves) => {
      setAsking(false);
      if (entry) {
        editAlgorithmById(entry.id, { moves });
        return;
      }

      const made = addAlgorithm({ moves });
      if (!made) {
        navigation.goBack();
        return;
      }
      navigation.setParams({ id: made.id });
    },
    [entry, addAlgorithm, editAlgorithmById, navigation]
  );

  /** Cancelling the *first* modal leaves, because there is no entry behind it to
   *  stand on. Cancelling any later one just closes. */
  const cancelMoves = useCallback(() => {
    setAsking(false);
    if (!entry) navigation.goBack();
  }, [entry, navigation]);

  const commitName = useCallback(
    (text) => {
      setNameText(text);
      if (entry) editAlgorithmById(entry.id, { name: text });
    },
    [entry, editAlgorithmById]
  );

  /** What the funnel actually kept, which is not always what was typed. */
  const settleName = useCallback(() => {
    setNameText((entry && entry.name) || '');
  }, [entry]);

  const toggleStage = useCallback(
    (method, stage) => {
      if (!entry) return;
      editAlgorithmById(entry.id, {
        assignments: toggleAssignment(entry.assignments, method, stage),
      });
    },
    [entry, editAlgorithmById]
  );

  const removeEntry = useCallback(() => {
    if (entry) deleteAlgorithm(entry.id);
    navigation.goBack();
  }, [entry, deleteAlgorithm, navigation]);

  const header = (
    <ScreenHeader
      title={entry ? entry.name : 'New algorithm'}
      theme={theme}
      onHomePress={navigation.goBack}
      homeIcon="chevron-left"
      homeLabel="Back to the library"
      homeHint="Leaves this algorithm and shows the library again; it is kept"
      dense
    />
  );

  // The modal is still up over an entry that does not exist yet, or the operator
  // deleted this one from under the screen. Either way there is nothing to draw
  // and the modal (or the pop) is what happens next.
  if (!entry) {
    return (
      <View style={[chrome.container, { backgroundColor: theme.colors.background }]}>
        {header}
        <CubeAlgInputModal
          visible={asking}
          theme={theme}
          accent={CUBE_ACCENT}
          title="The moves"
          onAdd={submitMoves}
          onClose={cancelMoves}
          submitLabel="Save"
          submitIcon="check"
          submitHint="Keeps these moves as a new algorithm"
        />
      </View>
    );
  }

  // Derived on every render rather than held: the moves can change under this
  // screen (the modal writes them) and a case worked out at mount would be the
  // previous algorithm's. `algorithmCase` memoizes the arithmetic, so this is a
  // map lookup after the first one.
  const caseTile = algorithmCase(entry);
  const stored = sanitizeCase(entry.case) !== null;

  return (
    <View style={[chrome.container, { backgroundColor: theme.colors.background }]}>
      {header}

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.label, { color: titleColor }]}>Name</Text>
          <TextInput
            value={nameText}
            onChangeText={commitName}
            onBlur={settleName}
            onEndEditing={settleName}
            placeholder="Sune"
            placeholderTextColor={border}
            maxLength={MAX_ALG_NAME}
            autoCapitalize="sentences"
            autoCorrect={false}
            returnKeyType="done"
            style={[styles.field, { color: titleColor, borderColor: border, backgroundColor: surface }]}
            accessibilityLabel="Name"
            accessibilityHint="What this algorithm is called in the library"
          />

          <Text style={[styles.label, { color: titleColor }]}>Moves</Text>
          {/* A row that opens the validated field rather than a second field.
              `CubeAlgInputModal` already owns the parser's error message, and the
              only thing worth duplicating is nothing. */}
          <TouchableOpacity
            style={[styles.field, styles.movesField, { borderColor: border, backgroundColor: surface }]}
            onPress={() => setAsking(true)}
            accessibilityRole="button"
            accessibilityLabel={`Moves, ${entry.moves}, ${describeAlgorithmSize(entry)}`}
            accessibilityHint="Opens the algorithm field to change them"
          >
            <Text style={[styles.moves, { color: titleColor }]} numberOfLines={2}>
              {entry.moves}
            </Text>
            <MaterialCommunityIcons name="pencil" size={16} color={titleColor} style={styles.pencil} />
          </TouchableOpacity>
          <Text style={[styles.hint, { color: titleColor }]}>{describeAlgorithmSize(entry)}</Text>

          <Text style={[styles.label, { color: titleColor }]}>Case</Text>
          {/* Nobody typed this and there is no field to type it into: it is the
              moves, inverted and applied to a solved cube (`algCase.js`). Which
              is why it sits under the moves — change them and it follows on the
              next render, and watching it follow is how you know the entry says
              what you meant. */}
          <View style={styles.caseRow}>
            <CubeCaseTile pattern={caseTile} size={ENTRY_TILE} label={describeCase(caseTile)} />
            <Text style={[styles.caseHint, { color: titleColor }]}>
              {stored
                ? 'Corrected by hand; the moves no longer change it.'
                : 'Worked out from the moves — the case these moves solve.'}
            </Text>
          </View>

          <Text style={[styles.label, { color: titleColor }]}>Used for</Text>
          {/* Zero or more, and **zero is a real answer**: an unassigned entry is
              still findable, by search and by the `Unassigned` chip. Nothing here
              is a required field, which is why there is no prompt telling the
              operator to pick something. */}
          {METHODS.map((method) => (
            <View key={method.id} style={styles.methodBlock}>
              <Text style={[styles.methodName, { color: titleColor }]}>{method.name}</Text>
              <View style={styles.stages}>
                {method.stages.map((stage) => {
                  const on = hasAssignment(entry.assignments, method.id, stage);
                  return (
                    <TouchableOpacity
                      key={stage}
                      // Colour only: a border that changed width when a chip was
                      // tapped would shuffle the whole row under the finger.
                      style={[styles.stage, { borderColor: on ? CUBE_ACCENT : border }]}
                      onPress={() => toggleStage(method.id, stage)}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`${method.name} ${stage}`}
                      accessibilityState={{ checked: on }}
                    >
                      <Text
                        style={[styles.stageText, { color: on ? CUBE_ACCENT : titleColor }]}
                        numberOfLines={1}
                      >
                        {stage}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          <Text style={[styles.label, { color: titleColor }]}>Notes</Text>
          {/* Finger tricks and personal cues. **Never shown on the solve screen**
              (plan §3.1) — a solve screen is not where you read them, and it is
              worth obeying from the first line rather than after they have leaked
              onto a card. */}
          <TextInput
            value={entry.notes}
            onChangeText={(notes) => editAlgorithmById(entry.id, { notes })}
            placeholder="Finger tricks, cues, what to watch for"
            placeholderTextColor={border}
            maxLength={MAX_ALG_NOTES}
            multiline
            autoCapitalize="sentences"
            style={[
              styles.field,
              styles.notes,
              { color: titleColor, borderColor: border, backgroundColor: surface },
            ]}
            accessibilityLabel="Notes"
            accessibilityHint="Private to the library; never shown while you are solving"
          />

          <TouchableOpacity
            style={[styles.delete, { borderColor: CUBE_ACCENT }]}
            onPress={removeEntry}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${entry.name}`}
            accessibilityHint="Removes this algorithm from the library"
          >
            <MaterialCommunityIcons name="trash-can-outline" size={16} color={CUBE_ACCENT} />
            <Text style={[styles.deleteText, { color: CUBE_ACCENT }]}>Delete</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <CubeAlgInputModal
        visible={asking}
        theme={theme}
        accent={CUBE_ACCENT}
        title="The moves"
        initialText={entry.moves}
        onAdd={submitMoves}
        onClose={cancelMoves}
        submitLabel="Save"
        submitIcon="check"
        submitHint="Keeps these moves as this algorithm"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    alignSelf: 'stretch',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  scroll: {
    alignSelf: 'stretch',
  },
  scrollBody: {
    paddingBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    opacity: 0.6,
    marginTop: 14,
    marginBottom: 5,
  },
  field: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
  },
  movesField: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
  },
  moves: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    fontFamily: ALG_FONT,
    fontSize: 14,
    lineHeight: 20,
  },
  pencil: {
    marginLeft: 8,
    opacity: 0.7,
  },
  hint: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 4,
  },
  caseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caseHint: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    fontSize: 11,
    lineHeight: 15,
    opacity: 0.6,
    marginLeft: 12,
  },
  methodBlock: {
    marginBottom: 8,
  },
  methodName: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.8,
    marginBottom: 5,
  },
  stages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stage: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stageText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Four lines of prose before it scrolls inside itself, which is about as much
  // as a note ever is.
  notes: {
    minHeight: 84,
    lineHeight: 19,
    textAlignVertical: 'top',
  },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 22,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
});

export default CubeAlgorithmEntry;
