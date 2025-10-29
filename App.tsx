import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView } from 'react-native';
import CameraScreen from './src/screens/CameraScreen';
import GalleryScreen from './src/screens/GalleryScreen';

type Screen = 'camera' | 'gallery';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('camera');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {currentScreen === 'camera' ? (
        <CameraScreen onNavigateToGallery={() => setCurrentScreen('gallery')} />
      ) : (
        <GalleryScreen onNavigateToCamera={() => setCurrentScreen('camera')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
