import React from 'react';
import { Modal as RNModal, StyleSheet, View, Pressable, Platform, useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';
import GlassCard from './GlassCard';

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
        <GlassCard intensity={95} style={styles.modalCard}>
          <View style={styles.dragHandle} />
          {children}
        </GlassCard>
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingHorizontal: 0,
    paddingTop: 0,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150, 150, 150, 0.35)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
});
