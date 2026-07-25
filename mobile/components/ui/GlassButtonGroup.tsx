import React from 'react';
import { View, StyleSheet, Platform, useColorScheme, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassButtonGroupProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function GlassButtonGroup({ children, style }: GlassButtonGroupProps) {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const isDark = colorScheme === 'dark';

  const strokeColor = isDark
    ? 'rgba(255, 255, 255, 0.35)'
    : 'rgba(255, 255, 255, 0.65)';

  const glassBgColor = isDark
    ? 'rgba(255, 255, 255, 0.10)'
    : 'rgba(255, 255, 255, 0.30)';

  return (
    <View
      style={[
        styles.groupContainer,
        {
          borderColor: strokeColor,
          backgroundColor: glassBgColor,
        },
        style,
      ]}
    >
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={90}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.contentRow}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  groupContainer: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    gap: 4,
  },
});
