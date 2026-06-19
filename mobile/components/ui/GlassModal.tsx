import React from 'react';
import { Modal as RNModal, StyleSheet, View, Pressable, Platform, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/Colors';

interface GlassModalProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
}

export default function GlassModal({ visible, onDismiss, children }: GlassModalProps) {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];

  return (
    <RNModal
      visible={visible}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable 
          style={styles.backdrop} 
          onPress={onDismiss}
        />
        <View style={[
          styles.modalCard,
          {
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
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
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
