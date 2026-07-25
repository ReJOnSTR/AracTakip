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
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { vehicleService } from '../../services/dataServices';
import { formatDate } from '../../utils/format';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';
import GlassIconButton from '../../components/ui/GlassIconButton';
import GlassModal from '../../components/ui/GlassModal';
import SwipeBackView from '../../components/ui/SwipeBackView';
import GlassInput from '../../components/ui/GlassInput';
import GlassSearchBar from '../../components/ui/GlassSearchBar';

export default function InspectionListScreen() {
  const { themeMode } = useThemeStore();
  const colorScheme = themeMode;
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCompanyId } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'warning' | 'passed'>('all');
  const [resultFilter, setResultFilter] = useState<'all' | 'passed' | 'failed' | 'conditional'>('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const query = useQuery({
    queryKey: ['all-inspections', selectedCompanyId],
    queryFn: () => vehicleService.getAllInspections(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const isRefreshing = query.isRefetching;
  const onRefresh = () => query.refetch();

  const rawData = query.data;
  const records = Array.isArray(rawData) ? rawData : (rawData?.data || []);

  const getRemainingDays = (dateStr: string) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const filtered = records.filter((ins: any) => {
    const term = search.toLowerCase();
    const matchesSearch =
      ins.vehicles?.plate?.toLowerCase().includes(term) ||
      ins.result?.toLowerCase().includes(term) ||
      ins.notes?.toLowerCase().includes(term);

    const daysLeft = getRemainingDays(ins.next_inspection);
    let matchesStatus = true;
    if (statusFilter === 'overdue') {
      matchesStatus = daysLeft !== null && daysLeft < 0;
    } else if (statusFilter === 'warning') {
      matchesStatus = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
    } else if (statusFilter === 'passed') {
      matchesStatus = daysLeft !== null && daysLeft > 30;
    }

    const matchesResult = resultFilter === 'all' || 
      (ins.result && ins.result.toLowerCase() === resultFilter.toLowerCase()) ||
      (resultFilter === 'passed' && ins.result && ins.result.toLowerCase() === 'geçti') ||
      (resultFilter === 'failed' && ins.result && ins.result.toLowerCase() === 'kaldı') ||
      (resultFilter === 'conditional' && ins.result && ins.result.toLowerCase() === 'şartlı geçti');

    let matchesDate = true;
    if (startDateFilter || endDateFilter) {
      const itemDate = ins.inspection_date ? (typeof ins.inspection_date === 'string' ? ins.inspection_date : new Date(ins.inspection_date).toISOString().split('T')[0]) : '';
      if (startDateFilter && itemDate < startDateFilter) matchesDate = false;
      if (endDateFilter && itemDate > endDateFilter) matchesDate = false;
    }

    return matchesSearch && matchesStatus && matchesResult && matchesDate;
  });

  return (
    <SwipeBackView onSwipeBack={() => router.push('/vehicles')} style={styles.container}>
      <MovingBackground />
      
      <View style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 16,
        right: 16,
        zIndex: 100,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        pointerEvents: 'box-none',
      }}>
        <GlassIconButton
          icon="chevron-back"
          onPress={() => router.push('/vehicles')}
        />
        <GlassIconButton
          icon="funnel-outline"
          active={!!(statusFilter !== 'all' || resultFilter !== 'all' || startDateFilter || endDateFilter)}
          onPress={() => setIsFilterModalVisible(true)}
        />
      </View>

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={c.primary} />
          }
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 60, paddingBottom: 12 }}>
              <View style={{ alignItems: 'center', marginBottom: 16, marginTop: 8 }}>
                <Text style={[styles.title, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text, textAlign: 'center' }]}>TÜV Muayeneleri</Text>
                <Text style={[styles.count, { color: colorScheme === 'dark' ? '#E2E8F0' : c.textSecondary, textAlign: 'center', marginTop: 2 }]}>{filtered.length} kayıt</Text>
              </View>

              <GlassSearchBar
                placeholder="Plaka veya muayene sonucunda ara..."
                value={search}
                onChangeText={setSearch}
              />
            </View>
          }
          renderItem={({ item, index }) => {
            const isDark = colorScheme === 'dark';
            const textColor = isDark ? '#FFFFFF' : c.text;
            const subTextColor = isDark ? '#E2E8F0' : c.textSecondary;
            const daysLeft = getRemainingDays(item.next_inspection);

            return (
              <Animated.View entering={FadeInDown.delay(index * 20).duration(300)} style={styles.cardContainer}>
                <GlassCard intensity={45} style={styles.cardGlass}>
                  <View style={styles.cardInner}>
                    <View style={styles.infoBox}>
                      <Text style={[styles.plateText, { color: isDark ? '#38BDF8' : c.primary, fontWeight: '800', fontSize: 16 }]}>
                        {item.vehicles?.plate || 'Plakasız'}
                      </Text>
                      <Text style={[styles.typeName, { color: textColor, marginTop: 2 }]}>
                        Muayene Tarihi: {formatDate(item.inspection_date)}
                      </Text>
                      <Text style={[styles.desc, { color: subTextColor, marginTop: 2 }]}>
                        Sonraki Muayene: {formatDate(item.next_inspection)} {daysLeft !== null ? `(${daysLeft > 0 ? `${daysLeft} gün kaldı` : 'Günü geçti'})` : ''}
                      </Text>
                    </View>
                    <View style={styles.rightBox}>
                      <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)' }]}>
                        <View style={[styles.statusDot, { backgroundColor: daysLeft !== null && daysLeft < 0 ? '#F87171' : (daysLeft !== null && daysLeft <= 30 ? '#FBBF24' : '#34D399'), width: 6, height: 6, borderRadius: 3, marginRight: 6 }]} />
                        <Text style={[styles.statusText, { color: textColor }]}>
                          {item.result || 'Geçti'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={48} color={c.textTertiary} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                {search ? 'Muayene kaydı bulunamadı' : 'Henüz muayene kaydı girilmemiş'}
              </Text>
            </View>
          }
        />
      )}

      {/* Filter Modal */}
      <GlassModal visible={isFilterModalVisible} onDismiss={() => setIsFilterModalVisible(false)}>
        <Text style={[styles.modalTitle, { color: c.text }]}>Filtrele</Text>
        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          
          <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 8 }]}>Muayene Durumu</Text>
          <View style={[styles.filterRow, { gap: 8 }]}>
            {([
              { label: 'Tümü', value: 'all' },
              { label: 'Süresi Geçenler', value: 'overdue' },
              { label: 'Kalan Süre < 30 Gün', value: 'warning' },
              { label: 'Süresi Uygun Olanlar', value: 'passed' },
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

          <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 16 }]}>Muayene Sonucu</Text>
          <View style={[styles.filterRow, { gap: 8 }]}>
            {([
              { label: 'Tümü', value: 'all' },
              { label: 'Geçti', value: 'passed' },
              { label: 'Kaldı', value: 'failed' },
              { label: 'Şartlı Geçti', value: 'conditional' },
            ] as const).map((opt) => {
              const isSelected = resultFilter === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setResultFilter(opt.value)}
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
              setStatusFilter('all');
              setResultFilter('all');
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
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  count: { fontSize: 11, marginTop: 2 },
  searchRow: { paddingHorizontal: 20, paddingVertical: 8 },
  searchBar: { borderRadius: 23, elevation: 0, height: 46, borderWidth: 1.2 },
  searchInput: { fontSize: 14, minHeight: 0 },
  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 100 },
  cardContainer: {
    marginBottom: 10,
  },

  cardGlass: { padding: 0 },
  cardInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 10 },
  plateBox: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 75,
  },
  plateText: { fontSize: 11, fontWeight: '800' },
  infoBox: { flex: 1 },
  typeName: { fontSize: 14, fontWeight: '700' },
  desc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11 },
  rightBox: { alignItems: 'flex-end', justifyContent: 'center' },
  price: { fontSize: 12, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
  filterSectionTitle: { fontSize: 14, fontWeight: '700', marginVertical: 8 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 4 },
  filterChip: { borderRadius: 10, marginVertical: 2 },
  chipText: { fontSize: 12, fontWeight: '600' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
});
