import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Modal, Animated, View } from 'react-native';
import { useGameContext } from '../../contexts/GameContext';

/**
 * Game Menu Modal for game settings and difficulty selection
 */
const GameMenuModal = () => {
  const { 
    theme, 
    showMenu, 
    startNewGame, 
    dispatch,
    debugFillBoard,
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
    dispatch({ type: 'HIDE_MENU' });
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
        {/* Animated element - Sudoku icon instead of pause */}
        <Animated.View
          style={{
            transform: [{ scale: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 48, textAlign: 'center' }}>🧩</Text>
        </Animated.View>
        <View style={[styles.menuBox, { backgroundColor: theme.colors.numberPad.background, borderColor: theme.colors.numberPad.border }]}> 
          <TouchableOpacity style={styles.menuCloseButton} onPress={handleCloseMenu}>
            <Text style={styles.menuCloseText}>✕</Text>
          </TouchableOpacity>
          
          <Text style={[styles.menuTitle, { color: theme.colors.title }]}>Sudoku</Text>
          <Text style={[styles.menuSubtitle, { color: theme.colors.title }]}>Select Difficulty</Text>
          <TouchableOpacity 
            style={[styles.menuButton, styles.menuButtonEasy]} 
            onPress={() => startNewGame('easy')}
          >
            <Text style={styles.menuButtonEmoji}>😊</Text>
            <Text style={styles.menuButtonText}>Easy</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuButton, styles.menuButtonChallenge]} 
            onPress={() => startNewGame('medium')}
          >
            <Text style={styles.menuButtonEmoji}>😐</Text>
            <Text style={styles.menuButtonText}>Medium</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuButton, styles.menuButtonHard]} 
            onPress={() => startNewGame('hard')}
          >
            <Text style={styles.menuButtonEmoji}>😎</Text>
            <Text style={styles.menuButtonText}>Hard</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuButton, styles.menuButtonHard]} 
            onPress={() => startNewGame('expert')}
          >
            <Text style={styles.menuButtonEmoji}>😈</Text>
            <Text style={styles.menuButtonText}>Expert</Text>
          </TouchableOpacity>
          {__DEV__ && (
            <TouchableOpacity 
              style={[styles.menuButton, { backgroundColor: '#d0d0d0' }]} 
              onPress={debugFillBoard}
            >
              <Text style={styles.menuButtonEmoji}>🐞</Text>
              <Text style={styles.menuButtonText}>Debug Fill</Text>
            </TouchableOpacity>
          )}
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
    color: '#333',
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
  menuButtonEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

export default GameMenuModal;