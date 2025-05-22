import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Modal, Animated, View, Switch } from 'react-native';
import { useGameContext, ACTIONS } from '../../contexts/GameContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import appJson from '../../app.json';

// Constants for consistent sizes
const ICON_SIZE = 24;

// Get build number from app.json
const BUILD_NUMBER = appJson.expo.version;

/**
 * Game Menu Modal for game settings and difficulty selection
 */
const GameMenuModal = () => {
  const {
    theme,
    showMenu,
    startNewGame,
    showFeedback,
    dispatch,
    debugFillBoard,
    debugCheatMode,
  } = useGameContext();

  // Animation for menu modal
  const [menuAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (showMenu) {
      Animated.timing(menuAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(menuAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showMenu]);

  const handleCloseMenu = () => {
    dispatch({ type: ACTIONS.HIDE_MENU });
  };

  const handleToggleFeedback = (value) => {
    dispatch({
      type: ACTIONS.TOGGLE_FEEDBACK,
      payload: value
    });
  };

  const handleBuildPress = () => {
    dispatch({ type: ACTIONS.SHOW_BUILD_NOTES });
    // Close the menu when showing build notes
    dispatch({ type: ACTIONS.HIDE_MENU });
  };

  return (
    <Modal
      visible={showMenu}
      transparent
      animationType="fade"
    >
      {/* Blurred/Dimmed background overlay */}
      <Animated.View
        style={{
          ...styles.menuOverlay,
          opacity: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
        }}
      >
        <View style={[styles.menuBox, { backgroundColor: theme.colors.numberPad.background, borderColor: theme.colors.numberPad.border }]}>
          <TouchableOpacity 
            style={styles.menuCloseButton} 
            onPress={handleCloseMenu}
            accessibilityLabel="Close menu"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="close"
              size={ICON_SIZE}
              color={theme.colors.title}
            />
          </TouchableOpacity>

          <Text style={[styles.menuTitle, { color: theme.colors.title }]}>Sudoku</Text>
          <Text style={[styles.menuSubtitle, { color: theme.colors.title }]}>Select Difficulty</Text>
          <TouchableOpacity
            style={[styles.menuButton, styles.menuButtonEasy]}
            onPress={() => startNewGame('easy')}
            accessibilityLabel="Start easy difficulty game"
            accessibilityRole="button"
          >
            <Text style={styles.menuButtonEmoji}>😊</Text>
            <Text style={[styles.menuButtonText, { color: theme.colors.text || '#333' }]}>Easy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuButton, styles.menuButtonChallenge]}
            onPress={() => startNewGame('medium')}
            accessibilityLabel="Start medium difficulty game"
            accessibilityRole="button"
          >
            <Text style={styles.menuButtonEmoji}>😐</Text>
            <Text style={[styles.menuButtonText, { color: theme.colors.text || '#333' }]}>Medium</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuButton, styles.menuButtonHard]}
            onPress={() => startNewGame('hard')}
            accessibilityLabel="Start hard difficulty game"
            accessibilityRole="button"
          >
            <Text style={styles.menuButtonEmoji}>😎</Text>
            <Text style={[styles.menuButtonText, { color: theme.colors.text || '#333' }]}>Hard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuButton, styles.menuButtonHard]}
            onPress={() => startNewGame('expert')}
            accessibilityLabel="Start expert difficulty game"
            accessibilityRole="button"
          >
            <Text style={styles.menuButtonEmoji}>😈</Text>
            <Text style={[styles.menuButtonText, { color: theme.colors.text || '#333' }]}>Expert</Text>
          </TouchableOpacity>

          {/* Build Notes button */}
          <View style={styles.settingSection}>
            <TouchableOpacity
              style={[styles.menuButton, styles.buildButton]}
              onPress={handleBuildPress}
              accessibilityLabel="View Build Notes"
            >
              <MaterialCommunityIcons
                name="information-outline"
                size={ICON_SIZE}
                color="#333"
                style={styles.menuButtonIcon}
              />
              <Text style={[styles.menuButtonText, { color: theme.colors.text || '#333' }]}>Build Notes</Text>
            </TouchableOpacity>
          </View>

          {/* Feedback toggle added to menu */}
          <View style={styles.feedbackControl}>
            <Text style={[styles.feedbackLabel, { color: theme.colors.title }]}>
              Show Mistakes
            </Text>
            <Switch
              value={showFeedback}
              onValueChange={handleToggleFeedback}
              trackColor={{
                false: theme.colors.inactive || '#d3d3d3',
                true: theme.colors.cell?.correctValueText || '#4caf50'
              }}
              thumbColor={showFeedback ? theme.colors.numberPad.background : theme.colors.inactiveText || '#f4f3f4'}
            />
          </View>

          {__DEV__ && (
            <>
              <TouchableOpacity
                style={[styles.menuButton, { backgroundColor: theme.colors.inactive || '#d0d0d0' }]}
                onPress={() => {
                  debugFillBoard();
                  handleCloseMenu(); // Close menu after filling board
                }}
                accessibilityLabel="Debug Fill Board"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name="bug-outline"
                  size={ICON_SIZE}
                  color="#333"
                  style={styles.menuButtonIcon}
                />
                <Text style={[styles.menuButtonText, { color: theme.colors.text || '#333' }]}>Debug Fill</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.menuButton, { backgroundColor: theme.colors.inactive || '#d0d0d0' }]}
                onPress={() => {
                  debugCheatMode();
                  handleCloseMenu(); // Close menu after activating cheat mode
                }}
                accessibilityLabel="Debug Cheat Mode"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name="magnify"
                  size={ICON_SIZE}
                  color="#333"
                  style={styles.menuButtonIcon}
                />
                <Text style={[styles.menuButtonText, { color: theme.colors.text || '#333' }]}>Show Hints</Text>
              </TouchableOpacity>
            </>
          )}
          
          {/* Version number at bottom of menu */}
          <Text style={[styles.versionText, { color: theme.colors.title }]}>
            v{BUILD_NUMBER}
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  menuBox: {
    width: 260,
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  menuCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
  menuCloseText: {
    fontSize: 18,
    // Color is now applied inline based on theme
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  menuSubtitle: {
    fontSize: 16,
    marginBottom: 18,
  },
  menuButton: {
    width: 180,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  menuButtonEasy: {
    backgroundColor: '#d4edda',
  },
  menuButtonChallenge: {
    backgroundColor: '#ffeeba',
  },
  menuButtonHard: {
    backgroundColor: '#f8d7da',
  },
  buildButton: {
    backgroundColor: '#e0e0e0',
  },
  menuButtonIcon: {
    marginRight: 8,
  },
  menuButtonEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: '600',
    // Color is now applied inline based on theme
  },
  feedbackControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  feedbackLabel: {
    marginRight: 10,
    fontSize: 16,
  },
  settingSection: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 5,
  },
  versionText: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 15,
  }
});

export default GameMenuModal;