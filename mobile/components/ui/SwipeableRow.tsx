import React, { useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  Pressable,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function SwipeableRow({ children, onEdit, onDelete, onPress, style }: SwipeableRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = isDark ? Colors.dark : Colors.light;

  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  // Total button container width is 120 (60px per button)
  const buttonWidth = 60;
  const totalButtonWidth = buttonWidth * 2;

  const openRow = () => {
    isOpen.current = true;
    Animated.spring(translateX, {
      toValue: -totalButtonWidth,
      useNativeDriver: Platform.OS !== 'web',
      bounciness: 4,
    }).start();
  };

  const closeRow = () => {
    isOpen.current = false;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: Platform.OS !== 'web',
      bounciness: 4,
    }).start();
  };

  const showActionsMenu = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Ignore if haptics fail or on unsupported platforms
    }
    openRow();
  };

  const handlePress = () => {
    if (isOpen.current) {
      closeRow();
    } else {
      if (onPress) {
        onPress();
      }
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Trigger only on horizontal movements exceeding a minimum threshold
        // We only care about swiping left (dx < 0) when row is closed, or moving it back when open
        const isSwipingLeft = gestureState.dx < -10;
        const isSwipingRight = gestureState.dx > 10;
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        
        if (isOpen.current) {
          return Math.abs(gestureState.dx) > 10 && isHorizontal;
        }
        return isSwipingLeft && isHorizontal;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gestureState) => {
        let newX = isOpen.current ? -totalButtonWidth + gestureState.dx : gestureState.dx;
        
        // Disable swiping right past 0
        if (newX > 0) {
          newX = 0;
        }
        // Apply friction past thresholds
        if (newX < -totalButtonWidth - 20) {
          newX = -totalButtonWidth - 20 + (newX + totalButtonWidth + 20) * 0.2;
        }
        translateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        const dragDistance = gestureState.dx;
        const dragVelocity = gestureState.vx;
        const currentX = isOpen.current ? -totalButtonWidth + dragDistance : dragDistance;
        
        if (isOpen.current) {
          // If swiping back (right) by distance or flicking it right, close it
          if (currentX > -totalButtonWidth / 2 || dragVelocity > 0.3) {
            closeRow();
          } else {
            openRow();
          }
        } else {
          // If swiping left by distance or flicking it left, open it
          if (currentX < -totalButtonWidth / 2 || dragVelocity < -0.3) {
            openRow();
          } else {
            closeRow();
          }
        }
      },
      onPanResponderTerminate: () => {
        closeRow();
      },
    })
  ).current;

  // Interpolate translateX to fade background buttons in/out
  const buttonsOpacity = translateX.interpolate({
    inputRange: [-totalButtonWidth, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const renderBackgroundButtons = () => {
    return (
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.backgroundContainer, { opacity: buttonsOpacity }]}>
        {/* Right Actions (revealed when swiping left) */}
        <Animated.View
          style={[
            styles.buttonsRow,
            {
              right: 0,
              opacity: translateX.interpolate({
                inputRange: [-totalButtonWidth, 0],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <Pressable
            onPress={() => {
              onEdit();
              closeRow();
            }}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: pressed ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.15)', borderRightWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
            ]}
          >
            <Ionicons name="create-outline" size={20} color={c.primary} />
          </Pressable>
          <Pressable
            onPress={() => {
              onDelete();
              closeRow();
            }}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: pressed ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.15)' },
            ]}
          >
            <Ionicons name="trash-outline" size={20} color={c.error} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {renderBackgroundButtons()}
      <Animated.View
        style={{
          transform: [{ translateX }],
          width: '100%',
        }}
        {...panResponder.panHandlers}
      >
        <Pressable 
          onPress={handlePress}
          onLongPress={showActionsMenu}
          delayLongPress={500}
          style={styles.childContainer}
        >
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'stretch',
    marginVertical: 0,
    justifyContent: 'center',
  },
  backgroundContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    borderRadius: 14,
    overflow: 'hidden',
  },
  buttonsRow: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    width: 120,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childContainer: {
    width: '100%',
  },
});
