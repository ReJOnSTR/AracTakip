import { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  useColorScheme,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { Text, ActivityIndicator, Searchbar, Chip, Button } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../stores/authStore';
import { employeeService } from '../../services/dataServices';
import { formatCurrency } from '../../utils/format';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';
import GlassMonthPicker from '../../components/ui/GlassMonthPicker';
import GlassIconButton from '../../components/ui/GlassIconButton';
import GlassModal from '../../components/ui/GlassModal';
import SwipeBackView from '../../components/ui/SwipeBackView';
import { BlurView } from 'expo-blur';

export default function PayrollListScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCompanyId } = useAuthStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

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

  let touchStartX = 0;
  const handleTouchStart = (e: any) => {
    touchStartX = e.nativeEvent.pageX;
  };
  const handleTouchEnd = (e: any) => {
    const touchEndX = e.nativeEvent.pageX;
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 80) {
      if (diff > 0) {
        onPrevMonth();
      } else {
        onNextMonth();
      }
    }
  };

  const records = query.data?.data || [];

  const totalPayroll = records.reduce((sum: number, emp: any) => sum + (emp.salary || 0), 0);

  const filtered = records.filter((item: any) => {
    const fullName = `${item.first_name || ''} ${item.last_name || ''}`.toLowerCase();
    const matchesSearch = !search || fullName.includes(search.toLowerCase()) || (item.position && item.position.toLowerCase().includes(search.toLowerCase()));

    const monthSalaries = item.salaries || [];
    const paidAmount = monthSalaries
      .filter((s: any) => s.status === 'paid')
      .reduce((sum: number, s: any) => sum + (s.net_salary || 0), 0);
    const monthOvertimes = item.overtimes || [];
    const overtimeTotal = monthOvertimes.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
    const isFullyPaid = paidAmount >= (item.salary + overtimeTotal) && paidAmount > 0;
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'paid' && isFullyPaid) ||
      (statusFilter === 'pending' && !isFullyPaid);

    return matchesSearch && matchesStatus;
  });

  const getInitials = (first: string, last: string) => {
    return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
  };

  const avatarColors = [c.primary, c.secondary, c.tertiary, c.info, c.warning];
  const glassBgColor = Platform.OS === 'web'
    ? (colorScheme === 'dark' ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.75)')
    : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.2)');
  const glassBorderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.5)';

  return (
    <SwipeBackView 
      onSwipeBack={() => router.push('/employees')}
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <MovingBackground />
      
      {/* Floating Header with Blur background */}
      <View style={[
        styles.floatingHeaderContainer,
        {
          paddingTop: insets.top,
          backgroundColor: colorScheme === 'dark' ? 'rgba(26, 26, 46, 0.45)' : 'rgba(255, 255, 255, 0.45)',
          borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
        }
      ]}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 45 : 95}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Header */}
        <View style={[styles.header, { paddingTop: 8, paddingBottom: 8, paddingHorizontal: 16 }]}>
          <GlassIconButton
            icon="chevron-back"
            onPress={() => router.push('/employees')}
          />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.title, { color: c.text }]}>Maaş & Ödemeler</Text>
            <Text style={[styles.count, { color: c.textSecondary }]}>
              {filtered.length} çalışan • Toplam Net: {formatCurrency(totalPayroll)}
            </Text>
          </View>
          <GlassIconButton
            icon="funnel-outline"
            onPress={() => setIsFilterModalVisible(true)}
          />
        </View>

        {/* Month Navigator */}
        <View style={styles.monthNavRow}>
          <GlassMonthPicker
            value={currentDate}
            onChange={setCurrentDate}
          />
        </View>

        {/* Searchbar */}
        <View style={styles.searchRow}>
          <Searchbar
            placeholder="Personel adı veya pozisyon ara..."
            value={search}
            onChangeText={setSearch}
            style={[styles.searchBar, { backgroundColor: glassBgColor, borderColor: glassBorderColor }]}
            inputStyle={[styles.searchInput, { color: c.text }]}
            placeholderTextColor={c.textTertiary}
            iconColor={c.textSecondary}
          />
        </View>
      </View>

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 172 }]}
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
                <Pressable
                  onPress={() => router.push({
                    pathname: '/employee-detail',
                    params: { id: item.id.toString(), month: selectedMonth }
                  })}
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, width: '100%' }]}
                >
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
                </Pressable>
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

      {/* Filter Modal */}
      <GlassModal visible={isFilterModalVisible} onDismiss={() => setIsFilterModalVisible(false)}>
        <Text style={[styles.modalTitle, { color: c.text }]}>Filtrele</Text>
        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
          
          <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 8 }]}>Ödeme Durumu</Text>
          <View style={[styles.filterRow, { gap: 8 }]}>
            {([
              { label: 'Tümü', value: 'all' },
              { label: 'Ödenenler', value: 'paid' },
              { label: 'Ödeme Bekleyenler', value: 'pending' },
            ] as const).map((opt) => {
              const isSelected = statusFilter === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setStatusFilter(opt.value)}
                  style={{
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 1,
                    paddingHorizontal: 16,
                    backgroundColor: isSelected 
                      ? (colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)')
                      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)'),
                    borderColor: isSelected 
                      ? c.primary 
                      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ 
                    color: isSelected ? c.primary : c.textSecondary, 
                    fontSize: 13,
                    fontWeight: isSelected ? '600' : '400'
                  }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

        </ScrollView>
        <View style={styles.modalButtons}>
          <Button 
            mode="text" 
            onPress={() => {
              setStatusFilter('all');
            }} 
            textColor={c.textSecondary}
          >
            Temizle
          </Button>
          <Button mode="contained" onPress={() => setIsFilterModalVisible(false)} buttonColor={c.primary} textColor="#fff">
            Uygula
          </Button>
        </View>
      </GlassModal>
    </SwipeBackView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  floatingHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
    borderBottomWidth: 1.2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  backBtn: { marginRight: 12 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  count: { fontSize: 11, marginTop: 2 },
  searchRow: { paddingHorizontal: 20, paddingVertical: 8 },
  searchBar: { borderRadius: 23, elevation: 0, height: 46, borderWidth: 1.2 },
  searchInput: { fontSize: 14, minHeight: 0 },
  filterSectionTitle: { fontSize: 14, fontWeight: '700', marginVertical: 8 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 4 },
  filterChip: { borderRadius: 10, marginVertical: 2 },
  chipText: { fontSize: 12, fontWeight: '600' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
  monthNavRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  monthNavCard: {
    width: '100%',
    padding: 0,
  },
  monthNavInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 100 },
  cardContainer: {
    marginBottom: 10,
  },

  cardGlass: { padding: 0 },
  cardInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 10 },
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
