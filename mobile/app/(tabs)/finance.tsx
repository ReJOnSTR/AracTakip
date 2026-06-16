import { useCallback, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  useColorScheme,
  Pressable,
} from 'react-native';
import { Text, Searchbar, Chip, Portal, Modal, Button } from 'react-native-paper';
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
import GlassInput from '../../components/ui/GlassInput';
import GlassDropdown from '../../components/ui/GlassDropdown';

export default function FinanceScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { selectedCompanyId } = useAuthStore();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'income' | 'expense' | null>(null);
  
  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
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
  const stats = statsQuery.data || { totalIncome: 0, totalExpense: 0, balance: 0 };

  const filtered = transactions.filter((t: any) => {
    const matchesSearch = !search ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || t.type === typeFilter;
    return matchesSearch && matchesType;
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

  const onRefresh = useCallback(() => {
    listQuery.refetch();
    statsQuery.refetch();
  }, [listQuery, statsQuery]);

  const renderTransaction = useCallback(({ item, index }: { item: any; index: number }) => {
    const isIncome = item.type === 'income';
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

  const searchBg = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
  const searchBorder = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={styles.container}>
      <MovingBackground />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: c.text }]}>Finans</Text>
        <Text style={[styles.count, { color: c.textSecondary }]}>İşlemler</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <GlassCard intensity={40} style={styles.balanceCardGlass}>
          <View style={styles.balanceContent}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Net Bakiye</Text>
            <Text style={[styles.balanceVal, { color: stats.balance >= 0 ? c.success : c.error }]}>
              {formatCurrency(stats.balance)}
            </Text>
            <View style={[styles.inoutRow, { borderTopColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
              <View style={styles.inoutBox}>
                <Ionicons name="arrow-down-circle-outline" size={16} color={c.success} />
                <View>
                  <Text style={[styles.inoutLabel, { color: c.textSecondary }]}>Gelir</Text>
                  <Text style={[styles.inoutVal, { color: c.success }]}>{formatCurrency(stats.totalIncome)}</Text>
                </View>
              </View>
              <View style={styles.inoutBox}>
                <Ionicons name="arrow-up-circle-outline" size={16} color={c.error} />
                <View>
                  <Text style={[styles.inoutLabel, { color: c.textSecondary }]}>Gider</Text>
                  <Text style={[styles.inoutVal, { color: c.error }]}>{formatCurrency(stats.totalExpense)}</Text>
                </View>
              </View>
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
          style={[styles.searchBar, { backgroundColor: searchBg, borderColor: searchBorder }]}
          inputStyle={[styles.searchInput, { color: c.text }]}
          placeholderTextColor={c.textTertiary}
          iconColor={c.textSecondary}
        />
      </View>

      <View style={styles.chipRow}>
        <Chip
          mode="flat"
          selected={!typeFilter}
          onPress={() => setTypeFilter(null)}
          style={[
            styles.chip,
            {
              backgroundColor: !typeFilter ? c.primaryContainer + '30' : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'),
              borderColor: !typeFilter ? c.primary : 'transparent',
              borderWidth: 1,
            }
          ]}
          textStyle={[styles.chipText, { color: !typeFilter ? c.primary : c.textSecondary }]}
        >
          Tümü
        </Chip>
        <Chip
          mode="flat"
          selected={typeFilter === 'income'}
          onPress={() => setTypeFilter('income')}
          style={[
            styles.chip,
            {
              backgroundColor: typeFilter === 'income' ? c.success + '20' : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'),
              borderColor: typeFilter === 'income' ? c.success : 'transparent',
              borderWidth: 1,
            }
          ]}
          textStyle={[styles.chipText, { color: typeFilter === 'income' ? c.success : c.textSecondary }]}
        >
          Gelirler
        </Chip>
        <Chip
          mode="flat"
          selected={typeFilter === 'expense'}
          onPress={() => setTypeFilter('expense')}
          style={[
            styles.chip,
            {
              backgroundColor: typeFilter === 'expense' ? c.error + '20' : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'),
              borderColor: typeFilter === 'expense' ? c.error : 'transparent',
              borderWidth: 1,
            }
          ]}
          textStyle={[styles.chipText, { color: typeFilter === 'expense' ? c.error : c.textSecondary }]}
        >
          Giderler
        </Chip>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={listQuery.isFetching || statsQuery.isFetching} onRefresh={onRefresh} tintColor={c.primary} />
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
      {/* Add Transaction Modal */}
      <Portal>
        <Modal
          visible={isModalVisible}
          onDismiss={() => setIsModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <GlassCard intensity={85} style={styles.modalGlassCard}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni İşlem Ekle</Text>
            
            <View style={styles.typeSelector}>
              <Button
                mode={txType === 'expense' ? 'contained' : 'outlined'}
                onPress={() => { setTxType('expense'); setCategory(''); }}
                style={styles.typeButton}
                buttonColor={txType === 'expense' ? c.error : undefined}
                textColor={txType === 'expense' ? '#ffffff' : c.error}
              >
                Gider
              </Button>
              <Button
                mode={txType === 'income' ? 'contained' : 'outlined'}
                onPress={() => { setTxType('income'); setCategory(''); }}
                style={styles.typeButton}
                buttonColor={txType === 'income' ? c.success : undefined}
                textColor={txType === 'income' ? '#ffffff' : c.success}
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
              options={txType === 'expense' ? [
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
          </GlassCard>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  count: { fontSize: 14 },
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
  searchBar: { borderRadius: 14, elevation: 0, height: 46, borderWidth: 1 },
  searchInput: { fontSize: 14, minHeight: 0 },
  chipRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip: { borderRadius: 10 },
  chipText: { fontSize: 12, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  cardContainer: {
    marginBottom: 8,
  },
  txCardGlass: { padding: 0 },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
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
    marginTop: 'auto',
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
});

