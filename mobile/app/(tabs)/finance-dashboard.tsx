import {
  View,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Pressable,
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
import GlassIconButton from '../../components/ui/GlassIconButton';
import SwipeBackView from '../../components/ui/SwipeBackView';

export default function FinanceDashboardScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCompanyId } = useAuthStore();

  const query = useQuery({
    queryKey: ['finance', selectedCompanyId],
    queryFn: () => financeService.getAll(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const transactions = query.data?.data || [];

  // Filter transactions for current month
  const now = new Date();
  const currentMonthStr = now.toISOString().slice(0, 7); // "YYYY-MM"
  const currentMonthTx = transactions.filter((t: any) => t.date?.startsWith(currentMonthStr));

  // Compute category totals
  const categoryTotals: { [key: string]: { amount: number; type: 'IN' | 'OUT' } } = {};
  let totalIn = 0;
  let totalOut = 0;

  currentMonthTx.forEach((t: any) => {
    const amount = t.amount || 0;
    const cat = t.category || 'Diğer';
    if (t.type === 'IN') {
      totalIn += amount;
      if (!categoryTotals[cat]) categoryTotals[cat] = { amount: 0, type: 'IN' };
      categoryTotals[cat].amount += amount;
    } else {
      totalOut += amount;
      if (!categoryTotals[cat]) categoryTotals[cat] = { amount: 0, type: 'OUT' };
      categoryTotals[cat].amount += amount;
    }
  });

  const expenseCategories = Object.keys(categoryTotals)
    .filter(cat => categoryTotals[cat].type === 'OUT')
    .map(cat => ({
      name: cat,
      amount: categoryTotals[cat].amount,
      percentage: totalOut > 0 ? (categoryTotals[cat].amount / totalOut) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  const incomeCategories = Object.keys(categoryTotals)
    .filter(cat => categoryTotals[cat].type === 'IN')
    .map(cat => ({
      name: cat,
      amount: categoryTotals[cat].amount,
      percentage: totalIn > 0 ? (categoryTotals[cat].amount / totalIn) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <SwipeBackView onSwipeBack={() => router.push('/finance')} style={styles.container}>
      <MovingBackground />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <GlassIconButton
          icon="chevron-back"
          onPress={() => router.push('/finance')}
          style={{ marginRight: 12 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>Finansal Analiz</Text>
          <Text style={[styles.count, { color: c.textSecondary }]}>Bu Ayın Gelir ve Gider Dağılımları</Text>
        </View>
      </View>

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Gelir / Gider Özeti */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.cardContainer}>
            <GlassCard intensity={30} style={styles.dashboardCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="pie-chart-outline" size={20} color={c.primary} />
                <Text style={[styles.cardTitle, { color: c.text }]}>Genel Nakit Durumu</Text>
              </View>

              <View style={styles.inoutOverview}>
                <View style={styles.overviewItem}>
                  <Text style={[styles.overviewLabel, { color: c.textSecondary }]}>Bu Ay Toplam Gelir</Text>
                  <Text style={[styles.overviewValue, { color: c.success }]}>{formatCurrency(totalIn)}</Text>
                </View>
                <View style={styles.overviewItem}>
                  <Text style={[styles.overviewLabel, { color: c.textSecondary }]}>Bu Ay Toplam Gider</Text>
                  <Text style={[styles.overviewValue, { color: c.error }]}>{formatCurrency(totalOut)}</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Gider Dağılımı */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.cardContainer}>
            <GlassCard intensity={30} style={styles.dashboardCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="arrow-up-circle-outline" size={20} color={c.error} />
                <Text style={[styles.cardTitle, { color: c.text }]}>Gider Kategori Dağılımı</Text>
              </View>

              {expenseCategories.length === 0 ? (
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>Bu ay henüz gider işlemi yok.</Text>
              ) : (
                expenseCategories.map((item, i) => (
                  <View key={i} style={styles.progressRow}>
                    <View style={styles.progressLabels}>
                      <Text style={[styles.progressName, { color: c.text }]}>{item.name}</Text>
                      <Text style={[styles.progressCount, { color: c.textSecondary }]}>
                        {formatCurrency(item.amount)} ({Math.round(item.percentage)}%)
                      </Text>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                      <View style={[styles.progressBarFill, { width: `${item.percentage}%`, backgroundColor: c.error }]} />
                    </View>
                  </View>
                ))
              )}
            </GlassCard>
          </Animated.View>

          {/* Gelir Dağılımı */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.cardContainer}>
            <GlassCard intensity={30} style={styles.dashboardCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="arrow-down-circle-outline" size={20} color={c.success} />
                <Text style={[styles.cardTitle, { color: c.text }]}>Gelir Kategori Dağılımı</Text>
              </View>

              {incomeCategories.length === 0 ? (
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>Bu ay henüz gelir işlemi yok.</Text>
              ) : (
                incomeCategories.map((item, i) => (
                  <View key={i} style={styles.progressRow}>
                    <View style={styles.progressLabels}>
                      <Text style={[styles.progressName, { color: c.text }]}>{item.name}</Text>
                      <Text style={[styles.progressCount, { color: c.textSecondary }]}>
                        {formatCurrency(item.amount)} ({Math.round(item.percentage)}%)
                      </Text>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                      <View style={[styles.progressBarFill, { width: `${item.percentage}%`, backgroundColor: c.success }]} />
                    </View>
                  </View>
                ))
              )}
            </GlassCard>
          </Animated.View>
        </ScrollView>
      )}
    </SwipeBackView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  backBtn: { marginRight: 12 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  count: { fontSize: 13, marginTop: 2 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100, gap: 12 },
  cardContainer: { width: '100%' },
  dashboardCard: { padding: 16, borderRadius: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  inoutOverview: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  overviewItem: { flex: 1 },
  overviewLabel: { fontSize: 12, fontWeight: '500' },
  overviewValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  progressRow: { marginBottom: 12 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressName: { fontSize: 13, fontWeight: '600' },
  progressCount: { fontSize: 11 },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  emptyText: { fontSize: 13, fontStyle: 'italic', paddingVertical: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
