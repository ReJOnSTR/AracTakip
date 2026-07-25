import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { employeeService } from '../../services/dataServices';
import { formatCurrency } from '../../utils/format';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';

export default function EmployeesMenuScreen() {
  const { themeMode } = useThemeStore();
  const colorScheme = themeMode;
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCompanyId } = useAuthStore();

  const query = useQuery({
    queryKey: ['employees', selectedCompanyId],
    queryFn: () => employeeService.getAll(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const employees = query.data?.data || [];
  const totalCount = employees.length;
  const activeCount = employees.filter((e: any) => e.status === 'active').length;
  const totalPayroll = employees
    .filter((e: any) => e.status === 'active')
    .reduce((sum: number, e: any) => sum + (e.salary || 0), 0);

  const menuItems = [
    {
      title: 'Personel Listesi',
      icon: 'people-outline',
      color: c.primary,
      route: '/employees-list',
    },
    {
      title: 'İzin Takibi',
      icon: 'calendar-outline',
      color: '#10b981',
      route: '/leaves-list',
    },
    {
      title: 'Fazla Mesailer',
      icon: 'time-outline',
      color: '#f59e0b',
      route: '/overtimes-list',
    },
    {
      title: 'Maaş & Ödemeler',
      icon: 'cash-outline',
      color: '#3b82f6',
      route: '/payroll-list',
    },
    {
      title: 'Departman Analizi',
      icon: 'pie-chart-outline',
      color: '#8b5cf6',
      route: '/personel-dashboard',
    },
  ];

  return (
    <View style={styles.container}>
      <MovingBackground />
      
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>Personel</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>İnsan Kaynakları Paneli</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsRow}>
          <GlassCard intensity={30} style={styles.statCard}>
            <Text style={[styles.statNum, { color: c.primary }]}>{totalCount}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>Toplam Kadro</Text>
          </GlassCard>

          <GlassCard intensity={30} style={styles.statCard}>
            <Text style={[styles.statNum, { color: c.success }]}>{activeCount}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>Aktif Çalışan</Text>
          </GlassCard>

          <GlassCard intensity={30} style={styles.statCard}>
            <Text style={[styles.statNum, { color: '#3b82f6', fontSize: 15 }]}>{formatCurrency(totalPayroll)}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>Aylık Net Maaş</Text>
          </GlassCard>
        </View>

        {/* Menu Cards */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(index * 50).duration(300)}
              style={styles.cardWrapper}
            >
              <Pressable
                onPress={() => router.push(item.route as any)}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.08)' }}
                style={{ width: '100%' }}
              >
                <GlassCard intensity={20} style={{ width: '100%' }}>
                  <View style={styles.menuCardInner}>
                    <View style={styles.menuLeft}>
                      <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                        <Ionicons name={item.icon as any} size={20} color={item.color} />
                      </View>
                      <Text style={[styles.menuTitle, { color: c.text }]}>{item.title}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
                  </View>
                </GlassCard>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    width: '100%',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    minHeight: 80,
  },
  statNum: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  menuContainer: { gap: 8 },
  cardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  menuCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
});
