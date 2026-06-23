import React from 'react';
import { View, ViewProps } from 'react-native';

interface SwipeBackViewProps extends ViewProps {
  onSwipeBack?: () => void;
  children: React.ReactNode;
}

export default function SwipeBackView({ onSwipeBack, children, style, ...props }: SwipeBackViewProps) {
  return (
    <View style={style} {...props}>
      {children}
    </View>
  );
}
