import React, { useState } from 'react';
import { StyleSheet, View, TextInput, ViewStyle, TextInputProps, Platform, useColorScheme } from 'react-native';
import { Text } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/Colors';

interface GlassInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export default function GlassInput({ label, error, containerStyle, ...props }: GlassInputProps) {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];

  const [isFocused, setIsFocused] = useState(false);

  const inputContainerStyle = [
    styles.inputContainer,
    {
      backgroundColor: Platform.OS === 'web'
        ? (colorScheme === 'dark' ? 'rgba(35, 35, 64, 0.6)' : 'rgba(241, 245, 249, 0.6)')
        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.35)'),
      borderColor: error
        ? c.error
        : isFocused
        ? c.primary
        : colorScheme === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.12)',
    },
  ];

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>}
      <View style={inputContainerStyle}>
        {Platform.OS !== 'web' && (
          <BlurView
            intensity={50}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}
        <TextInput
          style={[styles.input, { color: c.text }]}
          placeholderTextColor={c.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>
      {error && <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
