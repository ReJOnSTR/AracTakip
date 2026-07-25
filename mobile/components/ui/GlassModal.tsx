import React, { useEffect, useRef, useState } from 'react';
import { Modal as RNModal, StyleSheet, View, Pressable, Platform, useColorScheme, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/Colors';

import { useThemeStore } from '../../stores/themeStore';

interface GlassModalProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GlassModal({ visible, onDismiss, children }: GlassModalProps) {
  const { themeMode } = useThemeStore();
  const colorScheme = themeMode;
  const [showModal, setShowModal] = useState(visible);
  
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      
      // Reset starting animation values
      backdropOpacity.setValue(0);
      cardTranslateY.setValue(SCREEN_HEIGHT);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          bounciness: 3,
          speed: 13,
          useNativeDriver: Platform.OS !== 'web',
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(cardTranslateY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        })
      ]).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  return (
    <RNModal
      visible={showModal}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        {/* Animated dimming backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable 
            style={StyleSheet.absoluteFill} 
            onPress={onDismiss}
          />
        </Animated.View>

        <Animated.View style={[
          styles.modalCard,
          {
            transform: [{ translateY: cardTranslateY }],
            borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.65)',
            backgroundColor: Platform.OS === 'web'
              ? (colorScheme === 'dark' ? 'rgba(20, 20, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)')
              : (colorScheme === 'dark' ? 'rgba(22, 22, 28, 0.85)' : 'rgba(255, 255, 255, 0.85)'),
          }
        ]}>
          {Platform.OS !== 'web' && (
            <BlurView
              intensity={95}
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={styles.dragHandle} />
          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalCard: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.88,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1.2,
    borderBottomWidth: 0,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    shadowColor: '#000',
    shadowOpacity: 0.20,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  dragHandle: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(150, 150, 150, 0.40)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
});
