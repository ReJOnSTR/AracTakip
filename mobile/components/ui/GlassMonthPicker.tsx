import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  useColorScheme,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import GlassModal from './GlassModal';

interface GlassMonthPickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
}

const months = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const monthsShort = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
];

export default function GlassMonthPicker({ value, onChange, minDate }: GlassMonthPickerProps) {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];

  const [modalVisible, setModalVisible] = useState(false);
  const [viewYear, setViewYear] = useState(value.getFullYear());

  useEffect(() => {
    setViewYear(value.getFullYear());
  }, [value, modalVisible]);

  const minYear = minDate ? minDate.getFullYear() : null;
  const minMonth = minDate ? minDate.getMonth() : null;

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const handlePrevMonth = () => {
    triggerHaptic();
    const d = new Date(value);
    d.setMonth(d.getMonth() - 1);
    if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), 1)) {
      return;
    }
    onChange(d);
  };

  const handleNextMonth = () => {
    triggerHaptic();
    const d = new Date(value);
    d.setMonth(d.getMonth() + 1);
    onChange(d);
  };

  const handleYearChange = (delta: number) => {
    triggerHaptic();
    const nextYear = viewYear + delta;
    if (minYear && nextYear < minYear) return;
    setViewYear(nextYear);
  };

  const handleMonthSelect = (monthIndex: number) => {
    triggerHaptic();
    if (minYear && viewYear === minYear && monthIndex < (minMonth || 0)) return;
    const newDate = new Date(viewYear, monthIndex, 1);
    onChange(newDate);
    setModalVisible(false);
  };

  const getMonthLabel = (date: Date) => {
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const isMonthDisabled = (monthIndex: number) => {
    if (!minDate) return false;
    if (viewYear < (minYear || 0)) return true;
    if (viewYear === minYear && monthIndex < (minMonth || 0)) return true;
    return false;
  };

  const glassBgColor = Platform.OS === 'web'
    ? (colorScheme === 'dark' ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.75)')
    : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.2)');
  
  const glassBorderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.5)';

  const gradientColors: readonly [string, string, ...string[]] = colorScheme === 'dark'
    ? ['rgba(255, 255, 255, 0.07)', 'rgba(255, 255, 255, 0.01)']
    : ['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.2)'];


  return (
    <View style={styles.container}>
      {/* 1. Left Chevron (Separate Liquid Glass Button) */}
      <Pressable
        onPress={handlePrevMonth}
        disabled={!!minDate && value.getFullYear() <= (minYear || 0) && value.getMonth() <= (minMonth || 0)}
        style={({ pressed }) => [
          styles.navBtn,
          {
            borderColor: glassBorderColor,
            backgroundColor: glassBgColor,
            opacity: pressed ? 0.6 : (minDate && value.getFullYear() <= (minYear || 0) && value.getMonth() <= (minMonth || 0) ? 0.3 : 1)
          }
        ]}
      >
        {Platform.OS !== 'web' && (
          <BlurView
            intensity={75}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="chevron-back" size={18} color={c.primary} />
      </Pressable>

      {/* 2. Middle Month Display (Separate Liquid Glass Pill) */}
      <Pressable
        onPress={() => { triggerHaptic(); setModalVisible(true); }}
        style={({ pressed }) => [
          styles.triggerBtn,
          {
            borderColor: glassBorderColor,
            backgroundColor: glassBgColor,
            opacity: pressed ? 0.7 : 1
          }
        ]}
      >
        {Platform.OS !== 'web' && (
          <BlurView
            intensity={75}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.triggerInner}>
          <Ionicons name="calendar-outline" size={14} color={c.primary} style={styles.triggerIcon} />
          <Text style={[styles.monthLabel, { color: c.text }]}>
            {getMonthLabel(value)}
          </Text>
          <Ionicons name="chevron-down" size={12} color={c.textSecondary} style={{ marginLeft: 4 }} />
        </View>
      </Pressable>

      {/* 3. Right Chevron (Separate Liquid Glass Button) */}
      <Pressable
        onPress={handleNextMonth}
        style={({ pressed }) => [
          styles.navBtn,
          {
            borderColor: glassBorderColor,
            backgroundColor: glassBgColor,
            opacity: pressed ? 0.6 : 1
          }
        ]}
      >
        {Platform.OS !== 'web' && (
          <BlurView
            intensity={75}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="chevron-forward" size={18} color={c.primary} />
      </Pressable>

      {/* Grid Picker Bottom Sheet */}
      <GlassModal visible={modalVisible} onDismiss={() => setModalVisible(false)}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: c.text }]}>Dönem Seçin</Text>
          <Pressable
            onPress={() => { triggerHaptic(); setModalVisible(false); }}
            style={[styles.closeBtn, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
          >
            <Ionicons name="close" size={18} color={c.textSecondary} />
          </Pressable>
        </View>

        {/* Year Selector */}
        <View style={styles.yearRow}>
          <Pressable
            onPress={() => handleYearChange(-1)}
            disabled={!!minYear && viewYear <= minYear}
            style={({ pressed }) => [
              styles.yearBtn,
              { opacity: (minYear && viewYear <= minYear) ? 0.2 : (pressed ? 0.6 : 1) }
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </Pressable>
          <Text style={[styles.yearLabel, { color: c.text }]}>{viewYear}</Text>
          <Pressable
            onPress={() => handleYearChange(1)}
            style={({ pressed }) => [
              styles.yearBtn,
              { opacity: pressed ? 0.6 : 1 }
            ]}
          >
            <Ionicons name="chevron-forward" size={20} color={c.text} />
          </Pressable>
        </View>

        {/* Months Grid */}
        <View style={styles.monthGrid}>
          {monthsShort.map((m, idx) => {
            const isSelected = value.getFullYear() === viewYear && value.getMonth() === idx;
            const isCurrent = new Date().getFullYear() === viewYear && new Date().getMonth() === idx;
            const isDisabled = isMonthDisabled(idx);

            return (
              <Pressable
                key={m}
                onPress={() => !isDisabled && handleMonthSelect(idx)}
                disabled={isDisabled}
                style={({ pressed }) => [
                  styles.gridItem,
                  {
                    backgroundColor: isSelected
                      ? c.primary
                      : isCurrent
                        ? (colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                        : 'transparent',
                    borderColor: isSelected
                      ? c.primary
                      : isCurrent
                        ? c.primary
                        : colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    opacity: isDisabled ? 0.25 : pressed ? 0.7 : 1,
                  }
                ]}
              >
                <Text
                  style={[
                    styles.gridItemText,
                    {
                      color: isSelected
                        ? '#ffffff'
                        : isDisabled
                          ? c.textTertiary
                          : isCurrent
                            ? c.primary
                            : c.text,
                      fontWeight: isSelected ? '700' : isCurrent ? '700' : '500',
                    }
                  ]}
                >
                  {m}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 6,
  },
  navBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  triggerBtn: {
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingHorizontal: 20,
    minWidth: 180,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  triggerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 10,
  },
  triggerIcon: {
    marginRight: 4,
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 30,
  },
  yearBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearLabel: {
    fontSize: 18,
    fontWeight: '800',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  gridItem: {
    width: '23%',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  gridItemText: {
    fontSize: 13,
  },
});

