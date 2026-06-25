import React from 'react';
import { StyleSheet, View, ViewStyle, Platform, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/Colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderRadius?: number;
  isListRow?: boolean;
}

export default function GlassCard({ children, style, intensity = 60, tint, borderRadius, isListRow }: GlassCardProps) {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];

  const selectedTint = tint || (colorScheme === 'dark' ? 'dark' : 'light');

  const shadowStyle = isListRow ? {} : {
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
      borderRadius: isListRow ? 0 : (borderRadius ?? 16),
      borderWidth: isListRow ? 0 : 1,
      borderBottomWidth: isListRow ? 0.5 : 1,
      borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.45)',
      borderBottomColor: isListRow
        ? (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)')
        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.45)'),
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
        <View style={[styles.content, isListRow && { padding: 0 }]}>
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
    alignSelf: 'stretch',
  },
  innerContainer: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
    flex: 1,
  },
  content: {
    padding: 16,
    flex: 1,
    width: '100%',
  },
});
