import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Switch } from 'react-native';
import { useGameContext } from '../contexts/GameContext';
import { ACTIONS } from '../contexts/GameContext';

/**
 * GameToolBar component containing game controls displayed above the number pad
 * Includes: feedback toggle, theme selector, notes mode toggle
 */
const GameToolBar = () => {
  const { 
    theme, 
    showFeedback, 
    dispatch, 
    cycleTheme,
    notesMode 
  } = useGameContext();

  const handleToggleFeedback = (value) => {
    dispatch({ 
      type: ACTIONS.TOGGLE_FEEDBACK, 
      payload: value 
    });
  };

  const handleToggleNotesMode = () => {
    dispatch({ type: ACTIONS.TOGGLE_NOTES_MODE });
  };

  return (
    <View style={styles.container}>
      <View style={styles.controlsRow}>
        {/* Feedback Toggle */}
        <View style={styles.feedbackControl}>
          <Text style={[styles.feedbackLabel, { color: theme.colors.title }]}>
            Feedback
          </Text>
          <Switch
            value={showFeedback}
            onValueChange={handleToggleFeedback}
            trackColor={{ 
              false: '#d3d3d3', 
              true: theme.colors.cell.correctValueText 
            }}
            thumbColor={showFeedback ? theme.colors.numberPad.background : '#f4f3f4'}
          />
        </View>

        {/* Theme Selector Button */}
        <TouchableOpacity 
          style={[styles.themeButton, { backgroundColor: theme.colors.numberPad.background }]} 
          onPress={cycleTheme}
        >
          <Text style={{ color: theme.colors.numberPad.text }}>
            Theme: {theme.name}
          </Text>
        </TouchableOpacity>

        {/* Notes Mode Toggle */}
        <TouchableOpacity
          style={[
            styles.notesButton,
            notesMode ? 
              { backgroundColor: theme.colors.cell.correctValueText } : 
              { backgroundColor: theme.colors.numberPad.background }
          ]}
          onPress={handleToggleNotesMode}
        >
          <Text style={{ 
            color: notesMode ? '#fff' : theme.colors.numberPad.text
          }}>
            Notes: {notesMode ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    flexWrap: 'wrap', // Allow wrapping on smaller screens
  },
  feedbackControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackLabel: {
    marginRight: 10,
    fontSize: 16,
  },
  themeButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  notesButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
});

export default GameToolBar;