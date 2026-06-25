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
import { Text, Searchbar, ActivityIndicator, Chip, Button } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../stores/authStore';
import { employeeService } from '../../services/dataServices';
import { formatDate, formatCurrency } from '../../utils/format';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';
import GlassIconButton from '../../components/ui/GlassIconButton';
import GlassModal from '../../components/ui/GlassModal';
import SwipeBackView from '../../components/ui/SwipeBackView';
import GlassInput from '../../components/ui/GlassInput';

export default function OvertimesListScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCompanyId } = useAuthStore();
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [deptFilter, setDeptFilter] = useState<string | null>(null);
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const query = useQuery({
    queryKey: ['all-overtimes', selectedCompanyId],
    queryFn: () => employeeService.getAllOvertimes(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const onRefresh = async () => {
    setIsRefreshing(true);
    await query.refetch();
    setIsRefreshing(false);
  };

  const records = query.data?.data || [];

  const departments = [...new Set(records.map((r: any) => r.employees?.department).filter(Boolean))] as string[];

  const filtered = records.filter((m: any) => {
    const term = search.toLowerCase();
    const fullName = `${m.employees?.first_name || ''} ${m.employees?.last_name || ''}`.toLowerCase();
    const matchesSearch =
      fullName.includes(term) ||
      (m.notes && m.notes.toLowerCase().includes(term));
      
    const matchesDept = !deptFilter || m.employees?.department === deptFilter;
    
    let matchesDate = true;
    if (startDateFilter || endDateFilter) {
      const itemDate = m.date ? (typeof m.date === 'string' ? m.date : new Date(m.date).toISOString().split('T')[0]) : '';
      if (startDateFilter && itemDate < startDateFilter) matchesDate = false;
      if (endDateFilter && itemDate > endDateFilter) matchesDate = false;
    }

    return matchesSearch && matchesDept && matchesDate;
  }).sort((a: any, b: any) => {
    if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'amount_desc') return (b.amount || 0) - (a.amount || 0);
    if (sortBy === 'amount_asc') return (a.amount || 0) - (b.amount || 0);
    return 0;
  });

  const getInitials = (first: string, last: string) => {
    return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
  };

  const avatarColors = [c.primary, c.secondary, c.tertiary, c.info, c.warning];
  const glassBgColor = Platform.OS === 'web'
    ? (colorScheme === 'dark' ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.75)')
    : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.2)');
  const glassBorderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.5)';

  const totalAmount = records.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

  return (
    <SwipeBackView onSwipeBack={() => router.push('/employees')} style={styles.container}>
      <MovingBackground />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, paddingBottom: 8, paddingHorizontal: 16 }]}>
        <GlassIconButton
          icon="chevron-back"
          onPress={() => router.push('/employees')}
        />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.title, { color: c.text }]}>Fazla Mesailer</Text>
          <Text style={[styles.count, { color: c.textSecondary }]}>
            {filtered.length} kayıt • Toplam: {formatCurrency(totalAmount)}
          </Text>
        </View>
        <GlassIconButton
          icon="funnel-outline"
          onPress={() => setIsFilterModalVisible(true)}
        />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Personel adı veya mesai detayı ara..."
          value={search}
          onChangeText={setSearch}
          style={[styles.searchBar, { backgroundColor: glassBgColor, borderColor: glassBorderColor }]}
          inputStyle={[styles.searchInput, { color: c.text }]}
          placeholderTextColor={c.textTertiary}
          iconColor={c.textSecondary}
        />
      </View>
      <View style={{ height: 1, backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)' }} />

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={c.primary} />
          }
          renderItem={({ item, index }) => {
            const avatarColor = avatarColors[index % avatarColors.length];
            return (
              <Animated.View entering={FadeInDown.delay(index * 20).duration(300)} style={styles.cardContainer}>
                <GlassCard intensity={30} style={styles.cardGlass} isListRow={true}>
                  <View style={styles.cardInner}>
                    <View style={[styles.avatar, { backgroundColor: avatarColor + '18' }]}>
                      <Text style={[styles.avatarText, { color: avatarColor }]}>
                        {getInitials(item.employees?.first_name || '', item.employees?.last_name || '')}
                      </Text>
                    </View>
                    <View style={styles.infoBox}>
                      <Text style={[styles.empName, { color: c.text }]}>
                        {item.employees ? `${item.employees.first_name} ${item.employees.last_name}` : 'Bilinmeyen Personel'}
                      </Text>
                      <Text style={[styles.overtimeDetails, { color: c.textSecondary }]}>
                        Süre: {item.hours || 0} Saat • Oran: {item.rate || 1.5}x
                      </Text>
                      <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                          <Ionicons name="calendar-outline" size={12} color={c.textTertiary} />
                          <Text style={[styles.metaText, { color: c.textTertiary }]}>Tarih: {formatDate(item.date)}</Text>
                        </View>
                      </View>
                      {item.notes ? (
                        <Text style={[styles.notes, { color: c.textTertiary }]} numberOfLines={1}>
                          Not: {item.notes}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.rightBox}>
                      <Text style={[styles.amount, { color: c.success }]}>+{formatCurrency(item.amount || 0)}</Text>
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color={c.textTertiary} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                {search ? 'Mesai kaydı bulunamadı' : 'Henüz mesai kaydı girilmemiş'}
              </Text>
            </View>
          }
        />
      )}

      {/* Filter Modal */}
      <GlassModal visible={isFilterModalVisible} onDismiss={() => setIsFilterModalVisible(false)}>
        <Text style={[styles.modalTitle, { color: c.text }]}>Filtrele & Sırala</Text>
        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          
          <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 8 }]}>Sıralama Ölçütü</Text>
          <View style={[styles.filterRow, { gap: 8 }]}>
            {([
              { label: 'Tarih (Yeniye Doğru)', value: 'date_desc' },
              { label: 'Tarih (Eskiye Doğru)', value: 'date_asc' },
              { label: 'Tutar (Azalan)', value: 'amount_desc' },
              { label: 'Tutar (Artan)', value: 'amount_asc' },
            ] as const).map((opt) => {
              const isSelected = sortBy === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setSortBy(opt.value)}
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

          {departments.length > 0 && (
            <>
              <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 16 }]}>Departman</Text>
              <View style={[styles.filterRow, { gap: 8 }]}>
                <Pressable
                  onPress={() => setDeptFilter(null)}
                  style={{
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 1,
                    paddingHorizontal: 16,
                    backgroundColor: !deptFilter 
                      ? (colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)')
                      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)'),
                    borderColor: !deptFilter 
                      ? c.primary 
                      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ 
                    color: !deptFilter ? c.primary : c.textSecondary, 
                    fontSize: 13,
                    fontWeight: !deptFilter ? '600' : '400'
                  }}>
                    Tümü
                  </Text>
                </Pressable>
                {departments.map((dept) => {
                  const isSelected = deptFilter === dept;
                  return (
                    <Pressable
                      key={dept}
                      onPress={() => setDeptFilter(dept)}
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
                        {dept}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 16 }]}>Tarih Aralığı</Text>
          <GlassInput
            label="Başlangıç Tarihi"
            value={startDateFilter}
            onChangeText={setStartDateFilter}
            placeholder="YYYY-MM-DD"
          />
          <GlassInput
            label="Bitiş Tarihi"
            value={endDateFilter}
            onChangeText={setEndDateFilter}
            placeholder="YYYY-MM-DD"
          />

        </ScrollView>
        <View style={styles.modalButtons}>
          <Button 
            mode="text" 
            onPress={() => {
              setStartDateFilter('');
              setEndDateFilter('');
              setDeptFilter(null);
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
  listContent: { paddingHorizontal: 0, paddingBottom: 100 },
  cardContainer: {
    marginBottom: 0,
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
  overtimeDetails: { fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11 },
  notes: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  rightBox: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
