import { requireNativeView } from 'expo';
import * as React from 'react';
import { ViewProps, Platform } from 'react-native';

export interface NativeUiTabBarProps extends ViewProps {
  activeTab: string;
  showPlusButton: boolean;
  colorScheme: 'light' | 'dark';
  onTabPress?: (event: { nativeEvent: { tabName: string } }) => void;
  onPlusPress?: (event: { nativeEvent: {} }) => void;
}

const NativeView = Platform.OS === 'ios'
  ? requireNativeView<NativeUiTabBarProps>('NativeUi')
  : null;

export default function NativeUiTabBar(props: NativeUiTabBarProps) {
  if (NativeView) {
    return <NativeView {...props} />;
  }
  return null;
}

