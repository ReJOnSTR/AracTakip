import React, { useState } from 'react';
import { StyleSheet, View, Pressable, ViewStyle, Platform, useColorScheme, ScrollView } from 'react-native';
import { Text, Portal, Modal } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import GlassCard from './GlassCard';

interface Option {
  label: string;
  value: string;
}

interface GlassDropdownProps {
  label?: string;
  value: string;
  options: Option[];
  onSelect: (value: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
}

export default function GlassDropdown({ label, value, options, onSelect, placeholder, containerStyle }: GlassDropdownProps) {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(o => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : (placeholder || 'Seçiniz...');

  const containerBorderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>}
      <Pressable
        onPress={() => setIsOpen(true)}
        style={[
          styles.inputContainer,
          {
            backgroundColor: Platform.OS === 'web'
              ? (colorScheme === 'dark' ? 'rgba(35, 35, 64, 0.6)' : 'rgba(241, 245, 249, 0.6)')
              : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.35)'),
            borderColor: containerBorderColor,
          },
        ]}
      >
        {Platform.OS !== 'web' && (
          <BlurView
            intensity={50}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={styles.contentRow}>
          <Text style={[styles.valueText, { color: selectedOption ? c.text : c.textTertiary }]}>
            {displayLabel}
          </Text>
          <Ionicons name="chevron-down" size={18} color={c.textSecondary} />
        </View>
      </Pressable>

      <Portal>
        <Modal
          visible={isOpen}
          onDismiss={() => setIsOpen(false)}
          contentContainerStyle={styles.modalContent}
        >
          <GlassCard intensity={95} style={styles.modalGlassCard}>
            <View style={styles.header}>
              <Text style={[styles.modalTitle, { color: c.text }]}>{label || 'Seçim Yapın'}</Text>
              <Pressable onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={24} color={c.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
              {options.map((option, idx) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onSelect(option.value);
                      setIsOpen(false);
                    }}
                    style={[
                      styles.optionItem,
                      {
                        borderBottomColor: idx === options.length - 1 ? 'transparent' : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'),
                        backgroundColor: isSelected ? c.primaryContainer + '25' : 'transparent',
                      }
                    ]}
                  >
                    <Text style={[styles.optionText, { color: isSelected ? c.primary : c.text, fontWeight: isSelected ? '700' : '400' }]}>
                      {option.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={c.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </GlassCard>
        </Modal>
      </Portal>
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
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  valueText: {
    fontSize: 15,
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    margin: 0,
    padding: 0,
  },
  modalGlassCard: {
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
  },
});
