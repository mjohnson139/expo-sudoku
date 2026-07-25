import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import ScreenHeader from '../../components/ScreenHeader';
import FungikuPreview from './FungikuPreview';
import useAppTheme from '../../hooks/useAppTheme';

/**
 * Fungiku's screen — reached from the hub, a peer of the Sudoku screen rather
 * than a button buried in Sudoku's menu (docs/fungiku-plan.md §6).
 *
 * The body is still the read-only engine preview: this step builds the shell,
 * and the playable board arrives in Step 4. When it does, the preview comes out
 * and the real board goes in right here — the screen, header and hub routing
 * stay as they are.
 */
const FungikuScreen = ({ onExitToHub }) => {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Fungiku" theme={theme} onHomePress={onExitToHub} />
      <FungikuPreview theme={theme} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    ...(Platform.OS === 'web'
      ? {
          paddingTop: 20,
          paddingBottom: 20,
          maxWidth: 600,
          marginHorizontal: 'auto',
          width: '100%',
        }
      : {}),
  },
});

export default FungikuScreen;
