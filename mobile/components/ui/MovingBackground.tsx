import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useThemeStore } from '../../stores/themeStore';

export default function MovingBackground() {
  const { themeMode } = useThemeStore();
  const c = Colors[themeMode];

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.background, zIndex: -10 }]} />
  );
}
