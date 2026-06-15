import React from 'react';
import { StyleSheet, View, ViewStyle, Platform, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/Colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
}

export default function GlassCard({ children, style, intensity = 60, tint }: GlassCardProps) {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];

  const selectedTint = tint || (colorScheme === 'dark' ? 'dark' : 'light');

  const shadowStyle = {
    shadowColor: '#000000',
    shadowOpacity: colorScheme === 'dark' ? 0.38 : 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 4,
  };

  const containerStyle = [
    styles.outerContainer,
    shadowStyle,
    style,
  ];

  const innerStyle = [
    styles.innerContainer,
    {
      borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.45)',
      backgroundColor: Platform.OS === 'web'
        ? (colorScheme === 'dark' ? 'rgba(26, 26, 46, 0.75)' : 'rgba(255, 255, 255, 0.75)')
        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.35)'),
    },
  ];

  return (
    <View style={containerStyle}>
      <View style={innerStyle}>
        {Platform.OS !== 'web' ? (
          <BlurView
            intensity={intensity}
            tint={selectedTint}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  innerContainer: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
});
