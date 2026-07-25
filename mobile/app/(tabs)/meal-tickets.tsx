import { useState, useEffect } from 'react';
import GlassModal from '../../components/ui/GlassModal';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  useColorScheme,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Text, ActivityIndicator, IconButton, Searchbar, Button } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { mealTicketService } from '../../services/dataServices';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';
import GlassMonthPicker from '../../components/ui/GlassMonthPicker';
import GlassInput from '../../components/ui/GlassInput';
import GlassIconButton from '../../components/ui/GlassIconButton';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function MealTicketsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { themeMode } = useThemeStore();
  const colorScheme = themeMode;
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
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

  useEffect(() => {
    if (params.openAdd === 'true') {
      setIsModalVisible(true);
      router.setParams({ openAdd: undefined });
    }
  }, [params.openAdd]);

  // Form State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [personCount, setPersonCount] = useState('');
  const [notes, setNotes] = useState('');

  const { selectedCompanyId } = useAuthStore();

  const listQuery = useQuery({
    queryKey: ['meal-tickets', selectedCompanyId],
    queryFn: () => mealTicketService.getAll(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5000,
  });

  const statsQuery = useQuery({
    queryKey: ['meal-tickets-stats', selectedCompanyId],
    queryFn: () => mealTicketService.getStats(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5000,
  });

  const tickets = listQuery.data?.data || [];
  const stats = statsQuery.data?.data || { totalThisMonth: 0, totalCostThisMonth: 0 };
  const selectedMonth = getMonthStr(currentDate);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([listQuery.refetch(), statsQuery.refetch()]);
    setIsRefreshing(false);
  };

  const createMutation = useMutation({
    mutationFn: (newTicket: any) => mealTicketService.create(newTicket),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-tickets', selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['meal-tickets-stats', selectedCompanyId] });
      setIsModalVisible(false);
      // Reset form
      setDate(new Date().toISOString().split('T')[0]);
      setPersonCount('');
      setNotes('');
    },
  });

  const handleCreate = () => {
    const count = parseInt(personCount);
    if (!date || !count || count < 1) return;
    createMutation.mutate({
      companyId: selectedCompanyId,
      date,
      personCount: count,
      notes,
    });
  };

  const filtered = tickets.filter((item: any) => {
    const matchesSearch = !search ||
      item.notes?.toLowerCase().includes(search.toLowerCase()) ||
      item.date?.toLowerCase().includes(search.toLowerCase());
      
    let matchesDate = true;
    if (startDateFilter || endDateFilter) {
      const itemDate = item.date ? (typeof item.date === 'string' ? item.date : new Date(item.date).toISOString().split('T')[0]) : '';
      if (startDateFilter && itemDate < startDateFilter) matchesDate = false;
      if (endDateFilter && itemDate > endDateFilter) matchesDate = false;
    } else {
      matchesDate = item.date && item.date.slice(0, 7) === selectedMonth;
    }
    
    return matchesSearch && matchesDate;
  });

  const totalTicketsCount = filtered.reduce((sum: number, item: any) => sum + (item.person_count || 1), 0);
  const totalTicketsCost = filtered.reduce((sum: number, item: any) => sum + (item.person_count || 1) * (item.price_per_person || 0), 0);

  return (
    <View 
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
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
          onPress={() => router.back()}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <GlassIconButton
            icon="funnel-outline"
            onPress={() => setIsFilterModalVisible(true)}
          />
          <GlassIconButton
            icon="add"
            onPress={() => setIsModalVisible(true)}
          />
        </View>
      </View>

      {listQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={c.primary} />
          }
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 60, paddingBottom: 12 }}>
              <View style={{ alignItems: 'center', marginBottom: 16, marginTop: 8 }}>
                <Text style={[styles.title, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text, textAlign: 'center' }]}>Yemek Fişleri & Kuponlar</Text>
                <Text style={[styles.count, { color: colorScheme === 'dark' ? '#E2E8F0' : c.textSecondary, textAlign: 'center', marginTop: 2 }]}>{filtered.length} kayıt</Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <GlassMonthPicker
                  value={currentDate}
                  onChange={setCurrentDate}
                />
              </View>

              <GlassCard intensity={45} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6 }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary, fontWeight: '600' }}>Toplam Fiş</Text>
                    <Text style={{ fontSize: 16, color: colorScheme === 'dark' ? '#FFFFFF' : c.text, fontWeight: '800', marginTop: 2 }}>{totalTicketsCount} Adet</Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary, fontWeight: '600' }}>Toplam Tutar</Text>
                    <Text style={{ fontSize: 16, color: colorScheme === 'dark' ? '#34D399' : c.success, fontWeight: '800', marginTop: 2 }}>{formatCurrency(totalTicketsCost)}</Text>
                  </View>
                </View>
              </GlassCard>
            </View>
          }
          renderItem={({ item, index }) => {
            const isDark = colorScheme === 'dark';
            const textColor = isDark ? '#FFFFFF' : c.text;
            const subTextColor = isDark ? '#E2E8F0' : c.textSecondary;
            const itemTotalCost = (item.person_count || 1) * (item.price_per_person || 0);

            return (
              <Animated.View entering={FadeInDown.delay(index * 30).duration(300)} style={styles.cardContainer}>
                <GlassCard intensity={45} style={styles.cardGlass}>
                  <View style={styles.cardInner}>
                    <View style={styles.info}>
                      <Text style={[styles.cardTitle, { color: textColor }]}>{formatDate(item.date)}</Text>
                      <Text style={[styles.cardSubtitle, { color: subTextColor }]}>
                        {item.person_count || 1} Kişi • {item.notes || 'Açıklama yok'}
                      </Text>
                    </View>
                    <View style={styles.right}>
                      <Text style={[styles.priceText, { color: isDark ? '#34D399' : c.success, fontWeight: '800' }]}>
                        {formatCurrency(itemTotalCost)}
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={c.textTertiary} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                {search ? 'Sonuç bulunamadı.' : 'Yemek fişi bulunamadı.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Add Meal Ticket Modal */}
      <GlassModal visible={isModalVisible} onDismiss={() => setIsModalVisible(false)}>
        <View style={styles.modalHeaderRow}>
          <View>
            <Text style={[styles.modalTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>Yeni Yemek Fişi</Text>
            <Text style={{ fontSize: 13, color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary, marginTop: 2 }}>Yemek kuponu ve kişi sayısı bilgilerini girin</Text>
          </View>
          <GlassIconButton
            icon="close"
            size={36}
            iconSize={18}
            onPress={() => setIsModalVisible(false)}
          />
        </View>

        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          <GlassInput
            label="Tarih"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
          />
          <GlassInput
            label="Kişi Sayısı"
            value={personCount}
            onChangeText={setPersonCount}
            keyboardType="numeric"
            placeholder="Kaç kişi yemeğe gitti?"
          />
          <GlassInput
            label="Notlar"
            value={notes}
            onChangeText={setNotes}
            placeholder="Ekstra bilgi (opsiyonel)"
            multiline
          />
        </ScrollView>

        <View style={styles.modalFooterRow}>
          <Button
            mode="text"
            onPress={() => setIsModalVisible(false)}
            textColor={colorScheme === 'dark' ? '#94A3B8' : c.textSecondary}
          >
            İptal
          </Button>
          <Button
            mode="contained"
            onPress={handleCreate}
            loading={createMutation.isPending}
            disabled={createMutation.isPending || !date || !personCount}
            buttonColor={colorScheme === 'dark' ? '#FFFFFF' : c.primary}
            textColor={colorScheme === 'dark' ? '#000000' : '#FFFFFF'}
            style={{ borderRadius: 14, minWidth: 100 }}
          >
            Kaydet
          </Button>
        </View>
      </GlassModal>

      {/* Filter Modal */}
      <GlassModal visible={isFilterModalVisible} onDismiss={() => setIsFilterModalVisible(false)}>
        <View style={styles.modalHeaderRow}>
          <View>
            <Text style={[styles.modalTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>Filtrele</Text>
            <Text style={{ fontSize: 13, color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary, marginTop: 2 }}>Yemek fişleri filtreleme seçenekleri</Text>
          </View>
          <GlassIconButton
            icon="close"
            size={36}
            iconSize={18}
            onPress={() => setIsFilterModalVisible(false)}
          />
        </View>

        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 8 }]}>Tarih Aralığı</Text>
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

        <View style={styles.modalFooterRow}>
          <Button 
            mode="text" 
            onPress={() => {
              setStartDateFilter('');
              setEndDateFilter('');
            }} 
            textColor={colorScheme === 'dark' ? '#94A3B8' : c.textSecondary}
          >
            Temizle
          </Button>
          <Button
            mode="contained"
            onPress={() => setIsFilterModalVisible(false)}
            buttonColor={colorScheme === 'dark' ? '#FFFFFF' : c.primary}
            textColor={colorScheme === 'dark' ? '#000000' : '#FFFFFF'}
            style={{ borderRadius: 14, minWidth: 100 }}
          >
            Uygula
          </Button>
        </View>
      </GlassModal>

    </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  count: { fontSize: 11, marginTop: 2 },
  filterSectionTitle: { fontSize: 14, fontWeight: '700', marginVertical: 8 },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 10,
  },
  summaryRow: { paddingHorizontal: 20, marginVertical: 8 },
  summaryCardGlass: { padding: 0 },
  summaryContent: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 12 },
  summaryBox: { alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryVal: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  divider: { width: 1, height: '80%' },
  searchRow: { paddingHorizontal: 20, paddingVertical: 10 },
  searchBar: { borderRadius: 14, elevation: 0, height: 46, borderWidth: 1 },
  searchInput: { fontSize: 14, minHeight: 0 },
  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 100 },
  cardContainer: {
    marginBottom: 10,
  },

  cardGlass: { padding: 0 },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    gap: 10,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSubtitle: { fontSize: 13, marginTop: 2 },
  cardMeta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11 },
  right: { alignItems: 'flex-end', gap: 4 },
  priceText: { fontSize: 15, fontWeight: '700' },
  unitText: { fontSize: 11 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
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
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
  monthNavRow: {
    paddingHorizontal: 20,
    paddingVertical: 8,
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
});
