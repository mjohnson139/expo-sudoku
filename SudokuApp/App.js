import React from 'react';
import { SafeAreaView } from 'react-native';
import GameScreen from './screens/GameScreen';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <GameScreen />
    </SafeAreaView>
  );
}
