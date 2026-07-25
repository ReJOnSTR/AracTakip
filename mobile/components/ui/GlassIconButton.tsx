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
import { NativeUiGlassButton } from '../../modules/native-ui';

interface GlassIconButtonProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  size?: number;
  iconSize?: number;
  prominent?: boolean;
  active?: boolean;
  style?: ViewStyle | ViewStyle[];
}

// Map Ionicons icons to iOS native SF Symbols
const getSfSymbolName = (icon: string) => {
  switch (icon) {
    case 'chevron-back': return 'chevron.backward';
    case 'chevron-forward': return 'chevron.forward';
    case 'funnel-outline':
    case 'funnel': return 'slider.horizontal.3';
    case 'add':
    case 'add-outline': return 'plus';
    case 'options-outline':
    case 'options':
    case 'ellipsis-vertical':
    case 'ellipsis-horizontal': return 'ellipsis';
    case 'search-outline':
    case 'search': return 'magnifyingglass';
    case 'close':
    case 'close-outline': return 'xmark';
    case 'settings-outline':
    case 'settings': return 'gearshape';
    case 'person-outline': return 'person';
    case 'car-outline': return 'car';
    case 'trash-outline': return 'trash';
    case 'pencil-outline': return 'pencil';
    case 'filter-outline': return 'line.3.horizontal.decrease.circle';
    default: return icon.replace('-outline', '').replace('-', '.');
  }
};

import { useThemeStore } from '../../stores/themeStore';

export default function GlassIconButton({
  icon,
  onPress,
  size = 38,
  iconSize = 20,
  prominent,
  active = false,
  style,
}: GlassIconButtonProps) {
  const { themeMode } = useThemeStore();
  const colorScheme = themeMode;
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

  const isProminent = prominent ?? (icon === 'add' || active);

  // If running on iOS, render Apple's native GlassButtonStyle button!
  if (Platform.OS === 'ios') {
    return (
      <NativeUiGlassButton
        icon={getSfSymbolName(icon)}
        size={size}
        prominent={isProminent}
        colorScheme={colorScheme}
        onPress={handlePress}
        style={[{ width: size, height: size }, ...(Array.isArray(style) ? style : [style])]}
      />
    );
  }

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
      <Ionicons name={icon as any} size={iconSize} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
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
