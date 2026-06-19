import { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
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
import { formatCurrency } from '../utils/format';
import MovingBackground from '../components/ui/MovingBackground';
import GlassCard from '../components/ui/GlassCard';

export default function PayrollListScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCompanyId } = useAuthStore();

  const [currentDate, setCurrentDate] = useState(new Date());

  const getMonthStr = (date: Date) => {
    return date.toISOString().slice(0, 7); // e.g. "2026-06"
  };

  const getMonthLabel = (date: Date) => {
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const selectedMonth = getMonthStr(currentDate);

  const query = useQuery({
    queryKey: ['payroll-summary', selectedCompanyId, selectedMonth],
    queryFn: () => employeeService.getPayrollSummary(selectedCompanyId!, selectedMonth),
    enabled: !!selectedCompanyId,
  });

  const onPrevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const onNextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const records = query.data?.data || [];

  const totalPayroll = records.reduce((sum: number, emp: any) => sum + (emp.salary || 0), 0);

  const getInitials = (first: string, last: string) => {
    return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
  };

  const avatarColors = [c.primary, c.secondary, c.tertiary, c.info, c.warning];

  return (
    <View style={styles.container}>
      <MovingBackground />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>Maaş & Ödemeler</Text>
          <Text style={[styles.count, { color: c.textSecondary }]}>
            {records.length} çalışan • Toplam Net: {formatCurrency(totalPayroll)}
          </Text>
        </View>
      </View>

      {/* Month Navigator */}
      <View style={styles.monthNavRow}>
        <Pressable onPress={onPrevMonth} style={[styles.navBtn, { borderColor: c.textTertiary }]}>
          <Ionicons name="chevron-back" size={18} color={c.text} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: c.text }]}>{getMonthLabel(currentDate)}</Text>
        <Pressable onPress={onNextMonth} style={[styles.navBtn, { borderColor: c.textTertiary }]}>
          <Ionicons name="chevron-forward" size={18} color={c.text} />
        </Pressable>
      </View>

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} tintColor={c.primary} />
          }
          renderItem={({ item, index }) => {
            const avatarColor = avatarColors[index % avatarColors.length];
            
            // Calculate sums from salaries relation for selectedMonth
            const monthSalaries = item.salaries || [];
            const paidAmount = monthSalaries
              .filter((s: any) => s.status === 'paid')
              .reduce((sum: number, s: any) => sum + (s.net_salary || 0), 0);
            
            const pendingAmount = monthSalaries
              .filter((s: any) => s.status === 'pending')
              .reduce((sum: number, s: any) => sum + (s.net_salary || 0), 0);
              
            const monthOvertimes = item.overtimes || [];
            const overtimeTotal = monthOvertimes.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);

            const isFullyPaid = paidAmount >= (item.salary + overtimeTotal) && paidAmount > 0;
            const hasPending = pendingAmount > 0 || (paidAmount < (item.salary + overtimeTotal));

            return (
              <Animated.View entering={FadeInDown.delay(index * 20).duration(300)} style={styles.cardContainer}>
                <GlassCard intensity={30} style={styles.cardGlass}>
                  <View style={styles.cardInner}>
                    <View style={[styles.avatar, { backgroundColor: avatarColor + '18' }]}>
                      <Text style={[styles.avatarText, { color: avatarColor }]}>
                        {getInitials(item.first_name, item.last_name)}
                      </Text>
                    </View>
                    <View style={styles.infoBox}>
                      <Text style={[styles.empName, { color: c.text }]}>
                        {item.first_name} {item.last_name}
                      </Text>
                      <Text style={[styles.empPos, { color: c.textSecondary }]}>
                        {item.position || 'Personel'}
                      </Text>
                      
                      <View style={styles.payrollDetailRow}>
                        <View style={styles.payrollItem}>
                          <Text style={[styles.payrollLabel, { color: c.textTertiary }]}>Maaş</Text>
                          <Text style={[styles.payrollValue, { color: c.text }]}>{formatCurrency(item.salary || 0)}</Text>
                        </View>
                        {overtimeTotal > 0 && (
                          <View style={styles.payrollItem}>
                            <Text style={[styles.payrollLabel, { color: c.textTertiary }]}>Mesai</Text>
                            <Text style={[styles.payrollValue, { color: c.success }]}>+{formatCurrency(overtimeTotal)}</Text>
                          </View>
                        )}
                        <View style={styles.payrollItem}>
                          <Text style={[styles.payrollLabel, { color: c.textTertiary }]}>Ödenen</Text>
                          <Text style={[styles.payrollValue, { color: isFullyPaid ? c.success : c.text }]}>
                            {formatCurrency(paidAmount)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.rightBox}>
                      {isFullyPaid ? (
                        <View style={[styles.statusBadge, { backgroundColor: c.successContainer + '20', borderColor: c.success }]}>
                          <Text style={[styles.statusText, { color: c.success }]}>Ödendi</Text>
                        </View>
                      ) : hasPending ? (
                        <View style={[styles.statusBadge, { backgroundColor: c.warningContainer + '20', borderColor: c.warning }]}>
                          <Text style={[styles.statusText, { color: c.warning }]}>Bekliyor</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusBadge, { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.2)' }]}>
                          <Text style={[styles.statusText, { color: c.textSecondary }]}>Ödeme Yok</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cash-outline" size={48} color={c.textTertiary} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                Bu ay için personel kaydı bulunamadı.
              </Text>
            </View>
          }
        />
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
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { fontSize: 16, fontWeight: '700' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  cardContainer: { marginBottom: 8 },
  cardGlass: { padding: 0 },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '800' },
  infoBox: { flex: 1 },
  empName: { fontSize: 14, fontWeight: '700' },
  empPos: { fontSize: 11, marginTop: 1 },
  payrollDetailRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  payrollItem: { flexDirection: 'column' },
  payrollLabel: { fontSize: 10, fontWeight: '600' },
  payrollValue: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  rightBox: { alignItems: 'flex-end', justifyContent: 'center' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
