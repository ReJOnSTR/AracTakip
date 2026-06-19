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
import { Colors } from '../constants/Colors';
import { useAuthStore } from '../stores/authStore';
import { employeeService } from '../services/dataServices';
import MovingBackground from '../components/ui/MovingBackground';
import GlassCard from '../components/ui/GlassCard';

export default function PersonelDashboardScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
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

  // 1. Department distribution
  const deptCounts: { [key: string]: number } = {};
  employees.forEach((e: any) => {
    if (e.status === 'active') {
      const dept = e.department || 'Belirtilmemiş';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    }
  });
  const activeCount = employees.filter((e: any) => e.status === 'active').length;
  const deptsList = Object.keys(deptCounts).map(dept => ({
    name: dept,
    count: deptCounts[dept],
    percentage: activeCount > 0 ? (deptCounts[dept] / activeCount) * 100 : 0
  })).sort((a, b) => b.count - a.count);

  // 2. Seniority (Tenure)
  let lessThanYear = 0;
  let oneToThreeYears = 0;
  let threePlusYears = 0;
  const now = new Date();

  employees.forEach((e: any) => {
    if (e.status === 'active' && e.start_date) {
      const start = new Date(e.start_date);
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffYears = diffDays / 365.25;

      if (diffYears < 1) lessThanYear++;
      else if (diffYears < 3) oneToThreeYears++;
      else threePlusYears++;
    }
  });

  // 3. Birthdays this month
  const currentMonth = now.getMonth(); // 0-indexed
  const birthdayPeople = employees.filter((e: any) => {
    if (!e.birth_date) return false;
    const bDate = new Date(e.birth_date);
    return bDate.getMonth() === currentMonth;
  });

  return (
    <View style={styles.container}>
      <MovingBackground />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>Personel Paneli</Text>
          <Text style={[styles.count, { color: c.textSecondary }]}>Kadro ve Dağılım Analizleri</Text>
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
          {/* Departmanlar Card */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.cardContainer}>
            <GlassCard intensity={30} style={styles.dashboardCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="business" size={20} color={c.primary} />
                <Text style={[styles.cardTitle, { color: c.text }]}>Departman Dağılımı</Text>
              </View>
              
              {deptsList.length === 0 ? (
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>Departman bilgisi bulunamadı.</Text>
              ) : (
                deptsList.map((dept, i) => (
                  <View key={i} style={styles.progressRow}>
                    <View style={styles.progressLabels}>
                      <Text style={[styles.progressName, { color: c.text }]}>{dept.name}</Text>
                      <Text style={[styles.progressCount, { color: c.textSecondary }]}>{dept.count} Kişi ({Math.round(dept.percentage)}%)</Text>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                      <View style={[styles.progressBarFill, { width: `${dept.percentage}%`, backgroundColor: c.primary }]} />
                    </View>
                  </View>
                ))
              )}
            </GlassCard>
          </Animated.View>

          {/* Kıdem İstatistikleri Card */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.cardContainer}>
            <GlassCard intensity={30} style={styles.dashboardCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="ribbon-outline" size={20} color="#f59e0b" />
                <Text style={[styles.cardTitle, { color: c.text }]}>Şirket İçi Kıdem Analizi</Text>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.gridItem}>
                  <Text style={[styles.gridNum, { color: c.text }]}>{lessThanYear}</Text>
                  <Text style={[styles.gridLabel, { color: c.textSecondary }]}>&lt; 1 Yıl</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={[styles.gridNum, { color: c.text }]}>{oneToThreeYears}</Text>
                  <Text style={[styles.gridLabel, { color: c.textSecondary }]}>1 - 3 Yıl</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={[styles.gridNum, { color: c.text }]}>{threePlusYears}</Text>
                  <Text style={[styles.gridLabel, { color: c.textSecondary }]}>3+ Yıl</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Bu Ay Doğanlar Card */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.cardContainer}>
            <GlassCard intensity={30} style={styles.dashboardCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="gift-outline" size={20} color="#ec4899" />
                <Text style={[styles.cardTitle, { color: c.text }]}>Bu Ay Doğanlar ({birthdayPeople.length})</Text>
              </View>

              {birthdayPeople.length === 0 ? (
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>Bu ay doğum günü olan personel yok.</Text>
              ) : (
                birthdayPeople.map((p, i) => {
                  const bDate = new Date(p.birth_date);
                  return (
                    <View key={i} style={styles.birthdayRow}>
                      <Ionicons name="happy-outline" size={16} color="#ec4899" />
                      <Text style={[styles.birthdayName, { color: c.text }]}>
                        {p.first_name} {p.last_name}
                      </Text>
                      <Text style={[styles.birthdayDate, { color: c.textSecondary }]}>
                        ({bDate.getDate()} {new Date(2000, bDate.getMonth(), 1).toLocaleDateString('tr-TR', { month: 'long' })})
                      </Text>
                    </View>
                  );
                })
              )}
            </GlassCard>
          </Animated.View>
        </ScrollView>
      )}
    </View>
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
  progressRow: { marginBottom: 12 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressName: { fontSize: 13, fontWeight: '600' },
  progressCount: { fontSize: 11 },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 },
  gridItem: { alignItems: 'center' },
  gridNum: { fontSize: 24, fontWeight: '800' },
  gridLabel: { fontSize: 12, marginTop: 4 },
  birthdayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  birthdayName: { fontSize: 13, fontWeight: '600' },
  birthdayDate: { fontSize: 11 },
  emptyText: { fontSize: 13, fontStyle: 'italic', paddingVertical: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
