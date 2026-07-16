import { useCallback, useState, useEffect } from 'react';
import GlassModal from '../../components/ui/GlassModal';
import SwipeBackView from '../../components/ui/SwipeBackView';
import { BlurView } from 'expo-blur';
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
import { Text, Searchbar, Chip, Button } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../stores/authStore';
import { financeService } from '../../services/dataServices';
import { formatCurrency, formatDate } from '../../utils/format';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';
import GlassMonthPicker from '../../components/ui/GlassMonthPicker';
import GlassInput from '../../components/ui/GlassInput';
import GlassDropdown from '../../components/ui/GlassDropdown';
import GlassIconButton from '../../components/ui/GlassIconButton';

export default function FinanceListScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { selectedCompanyId } = useAuthStore();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'IN' | 'OUT' | null>(null);
  const [methodFilter, setMethodFilter] = useState<string | null>(null);
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
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
  
  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [txType, setTxType] = useState<'IN' | 'OUT'>('OUT');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (params.openAdd === 'true') {
      setIsModalVisible(true);
      router.setParams({ openAdd: undefined });
    }
  }, [params.openAdd]);

  // Fetch Transactions
  const listQuery = useQuery({
    queryKey: ['finance', selectedCompanyId],
    queryFn: () => financeService.getAll(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  // Fetch Stats
  const statsQuery = useQuery({
    queryKey: ['finance-stats', selectedCompanyId],
    queryFn: () => financeService.getStats(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: (newTx: any) => financeService.create(newTx),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['finance-stats'] });
      setIsModalVisible(false);
      // Reset form
      setDescription('');
      setAmount('');
      setCategory('');
      setDate(new Date().toISOString().split('T')[0]);
    },
  });

  const transactions = listQuery.data?.data || [];
  const stats = statsQuery.data?.data || { totalBalance: 0, currentMonthIn: 0, currentMonthOut: 0 };
  const selectedMonth = getMonthStr(currentDate);

  const filtered = transactions.filter((t: any) => {
    const matchesSearch = !search ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || t.type === typeFilter;
    const matchesMethod = !methodFilter || t.method === methodFilter;

    let matchesDate = true;
    if (startDateFilter || endDateFilter) {
      const tDate = t.date ? (typeof t.date === 'string' ? t.date : new Date(t.date).toISOString().split('T')[0]) : '';
      if (startDateFilter && tDate < startDateFilter) matchesDate = false;
      if (endDateFilter && tDate > endDateFilter) matchesDate = false;
    } else {
      matchesDate = !selectedMonth || (t.date && t.date.slice(0, 7) === selectedMonth);
    }

    return matchesSearch && matchesType && matchesMethod && matchesDate;
  });

  const handleCreate = () => {
    if (!amount || isNaN(Number(amount)) || !description) return;
    createMutation.mutate({
      companyId: selectedCompanyId,
      description,
      amount: Number(amount),
      type: txType,
      category,
      date,
    });
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([listQuery.refetch(), statsQuery.refetch()]);
    setIsRefreshing(false);
  }, [listQuery, statsQuery]);

  const renderTransaction = useCallback(({ item, index }: { item: any; index: number }) => {
    const isIncome = item.type === 'IN';
    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)} style={styles.cardContainer}>
        <GlassCard intensity={30} style={styles.txCardGlass}>
          <View style={styles.cardInner}>
            <View style={[styles.iconBox, { backgroundColor: isIncome ? c.success + '15' : c.error + '15' }]}>
              <Ionicons
                name={isIncome ? 'arrow-down-outline' : 'arrow-up-outline'}
                size={20}
                color={isIncome ? c.success : c.error}
              />
            </View>
            <View style={styles.info}>
              <Text style={[styles.cardTitle, { color: c.text }]}>{item.description || 'Açıklama Yok'}</Text>
              <Text style={[styles.cardSubtitle, { color: c.textSecondary }]}>
                {item.category || 'Kategori Yok'}
              </Text>
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={11} color={c.textTertiary} />
                  <Text style={[styles.metaText, { color: c.textTertiary }]}>{formatDate(item.date)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="card-outline" size={11} color={c.textTertiary} />
                  <Text style={[styles.metaText, { color: c.textTertiary }]}>{item.method || 'Nakit'}</Text>
                </View>
              </View>
            </View>
            <View style={styles.right}>
              <Text style={[styles.priceText, { color: isIncome ? c.success : c.error }]}>
                {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
              </Text>
            </View>
          </View>
        </GlassCard>
      </Animated.View>
    );
  }, [c]);

  const glassBgColor = Platform.OS === 'web'
    ? (colorScheme === 'dark' ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.75)')
    : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.2)');
  const glassBorderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.5)';

  return (
    <SwipeBackView onSwipeBack={() => router.push('/finance')} style={styles.container}>
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
            onPress={() => router.push('/finance')}
          />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.title, { color: c.text }]}>Kasa Defteri</Text>
            <Text style={[styles.count, { color: c.textSecondary }]}>İşlemler</Text>
          </View>
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

        {/* Month Navigator */}
        <View style={styles.monthNavRow}>
          <GlassMonthPicker
            value={currentDate}
            onChange={setCurrentDate}
          />
        </View>

        {/* Gelir / Gider Özeti (GlassCard) */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <GlassCard intensity={30} style={{ padding: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: c.textSecondary, fontWeight: '600' }}>Toplam Gelir</Text>
                <Text style={{ fontSize: 15, color: c.success, fontWeight: '800', marginTop: 4 }}>+{formatCurrency(stats.currentMonthIn)}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: c.textSecondary, fontWeight: '600' }}>Toplam Gider</Text>
                <Text style={{ fontSize: 15, color: c.error, fontWeight: '800', marginTop: 4 }}>-{formatCurrency(stats.currentMonthOut)}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: c.textSecondary, fontWeight: '600' }}>Net Bakiye</Text>
                <Text style={{ fontSize: 15, color: stats.totalBalance >= 0 ? c.success : c.error, fontWeight: '800', marginTop: 4 }}>
                  {stats.totalBalance >= 0 ? '+' : ''}{formatCurrency(stats.totalBalance)}
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Search and Filters */}
        <View style={styles.searchRow}>
          <Searchbar
            placeholder="İşlem veya kategori ara..."
            value={search}
            onChangeText={setSearch}
            style={[styles.searchBar, { backgroundColor: glassBgColor, borderColor: glassBorderColor }]}
            inputStyle={[styles.searchInput, { color: c.text }]}
            placeholderTextColor={c.textTertiary}
            iconColor={c.textSecondary}
          />
        </View>
      </View>

      {/* Transactions List */}
      <FlatList
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTransaction}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 235 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={c.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={48} color={c.textTertiary} />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              {search ? 'İşlem bulunamadı' : 'Henüz finansal işlem girilmemiş'}
            </Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <GlassModal visible={isFilterModalVisible} onDismiss={() => setIsFilterModalVisible(false)}>
        <Text style={[styles.modalTitle, { color: c.text }]}>Filtrele</Text>
        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          
          <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 8 }]}>İşlem Türü</Text>
          <View style={[styles.filterRow, { flexWrap: 'wrap', gap: 8 }]}>
            {([
              { label: 'Tümü', value: null },
              { label: 'Gelirler', value: 'IN' },
              { label: 'Giderler', value: 'OUT' },
            ] as const).map((opt) => {
              const isSelected = typeFilter === opt.value;
              return (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => setTypeFilter(opt.value)}
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

          <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 16 }]}>Ödeme Yöntemi</Text>
          <View style={[styles.filterRow, { flexWrap: 'wrap', gap: 8 }]}>
            {([
              { label: 'Tümü', value: null },
              { label: 'Nakit', value: 'CASH' },
              { label: 'Banka', value: 'BANK' },
              { label: 'Çek', value: 'CHECK' },
            ] as const).map((opt) => {
              const isSelected = methodFilter === opt.value;
              return (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => setMethodFilter(opt.value)}
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
              setMethodFilter(null);
              setTypeFilter(null);
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

      {/* Add Transaction Modal */}
      <GlassModal visible={isModalVisible} onDismiss={() => setIsModalVisible(false)}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni İşlem Ekle</Text>
            
            <View style={styles.typeSelector}>
              <Button
                mode={txType === 'OUT' ? 'contained' : 'outlined'}
                onPress={() => { setTxType('OUT'); setCategory(''); }}
                style={styles.typeButton}
                buttonColor={txType === 'OUT' ? c.error : undefined}
                textColor={txType === 'OUT' ? '#ffffff' : c.error}
              >
                Gider
              </Button>
              <Button
                mode={txType === 'IN' ? 'contained' : 'outlined'}
                onPress={() => { setTxType('IN'); setCategory(''); }}
                style={styles.typeButton}
                buttonColor={txType === 'IN' ? c.success : undefined}
                textColor={txType === 'IN' ? '#ffffff' : c.success}
              >
                Gelir
              </Button>
            </View>

            <GlassInput
              label="Açıklama"
              value={description}
              onChangeText={setDescription}
              placeholder="örn: Araç yakıtı, Ofis kirası"
            />

            <GlassInput
              label="Tutar (₺)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0.00"
            />

            <GlassDropdown
              label="Kategori"
              value={category}
              options={txType === 'OUT' ? [
                { label: 'Yakıt', value: 'Yakıt' },
                { label: 'Maaş', value: 'Maaş' },
                { label: 'Kira', value: 'Kira' },
                { label: 'Bakım/Onarım', value: 'Bakım/Onarım' },
                { label: 'Vergi/Harç', value: 'Vergi/Harç' },
                { label: 'Fatura', value: 'Fatura' },
                { label: 'Sigorta', value: 'Sigorta' },
                { label: 'Muayene', value: 'Muayene' },
                { label: 'Diğer', value: 'Diğer' },
              ] : [
                { label: 'Hakediş', value: 'Hakediş' },
                { label: 'Satış', value: 'Satış' },
                { label: 'Faiz', value: 'Faiz' },
                { label: 'Diğer', value: 'Diğer' },
              ]}
              onSelect={setCategory}
              placeholder="Kategori Seçiniz"
            />

            <GlassInput
              label="Tarih"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
            />

            <View style={styles.modalButtons}>
              <Button mode="text" onPress={() => setIsModalVisible(false)} textColor={c.textSecondary}>
                İptal
              </Button>
              <Button
                mode="contained"
                onPress={handleCreate}
                loading={createMutation.isPending}
                disabled={createMutation.isPending || !amount || !description || !category}
                buttonColor={c.primary}
                textColor="#ffffff"
              >
                Kaydet
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
  statsRow: { paddingHorizontal: 20, marginVertical: 8 },
  balanceCardGlass: { padding: 0 },
  balanceContent: { padding: 16 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceVal: { fontSize: 32, fontWeight: '800', marginVertical: 8 },
  inoutRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, borderTopWidth: 0.5, paddingTop: 12 },
  inoutBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inoutLabel: { fontSize: 11 },
  inoutVal: { fontSize: 14, fontWeight: '700' },
  searchRow: { paddingHorizontal: 20, paddingVertical: 8 },
  searchBar: { borderRadius: 23, elevation: 0, height: 46, borderWidth: 1.2 },
  searchInput: { fontSize: 14, minHeight: 0 },
  filterSectionTitle: { fontSize: 14, fontWeight: '700', marginVertical: 8 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 4 },
  filterChip: { borderRadius: 10, marginVertical: 2 },
  chip: { borderRadius: 10 },
  chipText: { fontSize: 12, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 100 },
  cardContainer: {
    marginBottom: 10,
  },

  txCardGlass: { padding: 0 },
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
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  typeSelector: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  typeButton: { flex: 1 },
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
