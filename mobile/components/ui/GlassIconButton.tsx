import React, { ComponentProps } from 'react';
import {
  Pressable,
  StyleSheet,
  useColorScheme,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';

interface GlassIconButtonProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  size?: number;
  iconSize?: number;
  style?: ViewStyle | ViewStyle[];
}

export default function GlassIconButton({
  icon,
  onPress,
  size = 40,
  iconSize = 20,
  style,
}: GlassIconButtonProps) {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const handlePress = () => {
    triggerHaptic();
    onPress();
  };

  const glassBgColor = Platform.OS === 'web'
    ? (colorScheme === 'dark' ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.75)')
    : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.2)');
  
  const glassBorderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.5)';

  const gradientColors: readonly [string, string, ...string[]] = colorScheme === 'dark'
    ? ['rgba(255, 255, 255, 0.07)', 'rgba(255, 255, 255, 0.01)']
    : ['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.2)'];

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.btn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: glassBorderColor,
          backgroundColor: glassBgColor,
          opacity: pressed ? 0.6 : 1,
        },
        ...(Array.isArray(style) ? style : [style]),
      ]}
    >
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={75}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons name={icon as any} size={iconSize} color={c.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
});
