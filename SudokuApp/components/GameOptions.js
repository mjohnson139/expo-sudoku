import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * GameOptions component - now without controls as they have been moved elsewhere
 */
const GameOptions = () => {
  return (
    <View style={styles.container}>
      {/* Empty component - controls have been moved */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 5,
    marginTop: 5,
  },
});

export default GameOptions;