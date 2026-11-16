import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SystemBarBlur() {
  const insets = useSafeAreaInsets();
  if (insets.top === 0) return null;

  return (
    <View pointerEvents="none" style={[styles.container, { height: insets.top }]}>
      <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
});
