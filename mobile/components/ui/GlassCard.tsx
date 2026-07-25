import React from 'react';
import { StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { useThemeStore } from '../../stores/themeStore';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderRadius?: number;
  isListRow?: boolean;
}

export default function GlassCard({ children, style, intensity = 75, tint, borderRadius, isListRow }: GlassCardProps) {
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark';
  const c = Colors[themeMode];

  const selectedTint = tint || (isDark ? 'dark' : 'light');

  const shadowStyle = {
    shadowColor: '#000000',
    shadowOpacity: isDark ? (isListRow ? 0.30 : 0.45) : (isListRow ? 0.06 : 0.12),
    shadowOffset: isListRow ? { width: 0, height: 4 } : { width: 0, height: 10 },
    shadowRadius: isListRow ? 12 : 20,
    elevation: isListRow ? 3 : 6,
  };

  const containerStyle = [
    styles.outerContainer,
    shadowStyle,
    style,
  ];

  const innerStyle = [
    styles.innerContainer,
    {
      borderRadius: borderRadius ?? 22,
      borderWidth: 1.2,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.65)',
      backgroundColor: Platform.OS === 'web'
        ? (isDark ? 'rgba(26, 26, 36, 0.75)' : 'rgba(255, 255, 255, 0.75)')
        : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.40)'),
    },
  ];

  const gradientColors: readonly [string, string, ...string[]] = isDark
    ? ['rgba(255, 255, 255, 0.09)', 'rgba(255, 255, 255, 0.01)']
    : ['rgba(255, 255, 255, 0.65)', 'rgba(255, 255, 255, 0.20)'];

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
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
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
    borderWidth: 1.2,
    overflow: 'hidden',
    width: '100%',
    flex: 1,
  },
  content: {
    padding: 18,
    flex: 1,
    width: '100%',
  },
});
