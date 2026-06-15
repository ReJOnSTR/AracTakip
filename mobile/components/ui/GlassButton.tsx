import React from 'react';
import { Pressable, StyleSheet, TextStyle, ViewStyle, Platform, useColorScheme } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Text } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/Colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GlassButtonProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'glass' | 'danger';
}

export default function GlassButton({
  onPress,
  title,
  style,
  textStyle,
  disabled = false,
  loading = false,
  variant = 'primary',
}: GlassButtonProps) {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(0.96, { damping: 10, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1.0, { damping: 10, stiffness: 200 });
  };

  // Variant styles
  let backgroundColor = 'transparent';
  let borderColor = 'transparent';
  let textColor = '#ffffff';

  if (variant === 'primary') {
    backgroundColor = c.primary;
    textColor = '#ffffff';
  } else if (variant === 'secondary') {
    backgroundColor = c.surfaceVariant;
    textColor = c.text;
    borderColor = c.border;
  } else if (variant === 'danger') {
    backgroundColor = c.error;
    textColor = '#ffffff';
  } else if (variant === 'glass') {
    backgroundColor = Platform.OS === 'web'
      ? 'rgba(255, 255, 255, 0.15)'
      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.35)');
    borderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.45)';
    textColor = c.text;
  }

  const containerStyle = [
    styles.button,
    {
      backgroundColor,
      borderColor,
      borderWidth: borderColor !== 'transparent' ? 1 : 0,
      opacity: disabled || loading ? 0.6 : 1,
    },
    style,
  ];

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[containerStyle, animatedStyle]}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
    >
      {variant === 'glass' && Platform.OS !== 'web' && (
        <BlurView
          intensity={65}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Text style={[styles.text, { color: textColor }, textStyle]}>
        {loading ? 'Yükleniyor...' : title}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
