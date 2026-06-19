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
import { financeService } from '../../services/dataServices';
import { formatCurrency } from '../../utils/format';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';

export default function FinanceMenuScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCompanyId } = useAuthStore();

  const statsQuery = useQuery({
    queryKey: ['finance-stats', selectedCompanyId],
    queryFn: () => financeService.getStats(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const stats = statsQuery.data?.data || { totalBalance: 0, currentMonthIn: 0, currentMonthOut: 0 };

  const menuItems = [
    {
      title: 'Kasa Defteri',
      icon: 'journal-outline',
      color: c.primary,
      route: '/finance-list',
    },
    {
      title: 'Finansal Analiz',
      icon: 'trending-up-outline',
      color: '#10b981',
      route: '/finance-dashboard',
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
          <Text style={[styles.title, { color: c.text }]}>Finans Yönetimi</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>Kasa ve Nakit Akışı Takibi</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          <GlassCard intensity={45} style={styles.balanceCardGlass}>
            <View style={styles.balanceContent}>
              <Text style={[styles.label, { color: c.textSecondary }]}>Toplam Net Bakiye</Text>
              <Text style={[styles.balanceVal, { color: stats.totalBalance >= 0 ? c.success : c.error }]}>
                {formatCurrency(stats.totalBalance)}
              </Text>
              
              <View style={[styles.inoutRow, { borderTopColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                <View style={styles.inoutBox}>
                  <Ionicons name="arrow-down-circle-outline" size={18} color={c.success} />
                  <View>
                    <Text style={[styles.inoutLabel, { color: c.textSecondary }]}>Bu Ay Gelir</Text>
                    <Text style={[styles.inoutVal, { color: c.success }]}>{formatCurrency(stats.currentMonthIn)}</Text>
                  </View>
                </View>
                <View style={styles.inoutBox}>
                  <Ionicons name="arrow-up-circle-outline" size={18} color={c.error} />
                  <View>
                    <Text style={[styles.inoutLabel, { color: c.textSecondary }]}>Bu Ay Gider</Text>
                    <Text style={[styles.inoutVal, { color: c.error }]}>{formatCurrency(stats.currentMonthOut)}</Text>
                  </View>
                </View>
              </View>
            </View>
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
  statsContainer: { marginBottom: 24 },
  balanceCardGlass: { padding: 0 },
  balanceContent: { padding: 18 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceVal: { fontSize: 32, fontWeight: '800', marginVertical: 10 },
  inoutRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, borderTopWidth: 0.5, paddingTop: 14 },
  inoutBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inoutLabel: { fontSize: 11 },
  inoutVal: { fontSize: 14, fontWeight: '700' },
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
