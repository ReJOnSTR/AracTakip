import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  useColorScheme,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/Colors';

interface GlassSearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  style?: StyleProp<ViewStyle>;
}

export default function GlassSearchBar({
  placeholder = 'Ara...',
  value,
  onChangeText,
  style,
}: GlassSearchBarProps) {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const isDark = colorScheme === 'dark';
  const c = Colors[colorScheme];

  const strokeColor = isDark
    ? 'rgba(255, 255, 255, 0.40)'
    : 'rgba(255, 255, 255, 0.75)';

  const glassBgColor = isDark
    ? 'rgba(255, 255, 255, 0.10)'
    : 'rgba(255, 255, 255, 0.35)';

  return (
    <View
      style={[
        styles.container,
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
      <Ionicons
        name="search"
        size={20}
        color={isDark ? '#FFFFFF' : '#000000'}
        style={styles.icon}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.55)' : 'rgba(0, 0, 0, 0.45)'}
        style={[
          styles.input,
          {
            color: isDark ? '#FFFFFF' : '#000000',
          },
        ]}
        selectionColor={c.primary}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Ionicons
          name="close-circle"
          size={18}
          color={isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)'}
          onPress={() => onChangeText('')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    paddingVertical: 0,
  },
});
