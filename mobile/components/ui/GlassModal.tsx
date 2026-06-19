import React, { useEffect, useRef, useState } from 'react';
import { Modal as RNModal, StyleSheet, View, Pressable, Platform, useColorScheme, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/Colors';

interface GlassModalProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GlassModal({ visible, onDismiss, children }: GlassModalProps) {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
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

        {/* Animated sliding bottom card */}
        <Animated.View style={[
          styles.modalCard,
          {
            transform: [{ translateY: cardTranslateY }],
            borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.45)',
            backgroundColor: Platform.OS === 'web'
              ? (colorScheme === 'dark' ? 'rgba(26, 26, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)')
              : (colorScheme === 'dark' ? 'rgba(30, 30, 30, 0.75)' : 'rgba(255, 255, 255, 0.75)'),
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150, 150, 150, 0.35)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
});
