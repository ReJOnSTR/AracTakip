import { requireNativeView } from 'expo';
import * as React from 'react';
import { ViewProps, Platform } from 'react-native';

export interface NativeUiGlassButtonProps extends ViewProps {
  icon: string;
  size?: number;
  prominent?: boolean;
  onPress?: () => void;
}

const NativeView = Platform.OS === 'ios'
  ? requireNativeView<any>('NativeUiGlassButton')
  : null;

export default function NativeUiGlassButton({ onPress, ...props }: NativeUiGlassButtonProps) {
  if (NativeView) {
    return <NativeView {...props} onButtonPress={onPress} />;
  }
  return null;
}
