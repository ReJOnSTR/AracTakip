import React from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function MovingBackground() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.background, zIndex: -10 }]} />
  );
}
