import { useState, useEffect } from 'react';
import GlassModal from '../../components/ui/GlassModal';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  useColorScheme,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Text, ActivityIndicator, IconButton, Searchbar, Button } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { workService, customerService } from '../../services/dataServices';
import { useAuthStore } from '../../stores/authStore';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassDropdown from '../../components/ui/GlassDropdown';
import GlassIconButton from '../../components/ui/GlassIconButton';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../../utils/format';

export default function WorksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  useEffect(() => {
    if (params.openAdd === 'true') {
      setIsModalVisible(true);
      router.setParams({ openAdd: undefined });
    }
  }, [params.openAdd]);

  // Form State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('pending');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [workStartTime, setWorkStartTime] = useState('08:00');
  const [workEndTime, setWorkEndTime] = useState('17:00');
  const [pazarMultiplier, setPazarMultiplier] = useState('1.5');
  const [mesaiMultiplier, setMesaiMultiplier] = useState('1.5');

  const { selectedCompanyId: storeCompanyId } = useAuthStore();

  const query = useQuery({
    queryKey: ['works', storeCompanyId],
    queryFn: () => workService.getAll(storeCompanyId!),
    enabled: !!storeCompanyId,
    refetchInterval: 5000,
  });

  const customersQuery = useQuery({
    queryKey: ['customers', storeCompanyId],
    queryFn: () => customerService.getAll(storeCompanyId!),
    enabled: !!storeCompanyId,
    refetchInterval: 5000,
  });

  const works = query.data?.data || [];
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([query.refetch(), customersQuery.refetch()]);
    setIsRefreshing(false);
  };
  const customers = customersQuery.data?.data || [];
  const customerOptions = customers.map((cust: any) => ({
    label: cust.name,
    value: cust.id.toString(),
  }));

  const createMutation = useMutation({
    mutationFn: (newWork: any) => workService.create(newWork),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works', storeCompanyId] });
      setIsModalVisible(false);
      // Reset form
      setTitle('');
      setCustomerId('');
      setStatus('pending');
      setLocation('');
      setDescription('');
      setWorkStartTime('08:00');
      setWorkEndTime('17:00');
      setPazarMultiplier('1.5');
      setMesaiMultiplier('1.5');
    },
  });

  const handleCreate = () => {
    if (!title || !customerId) return;
    const selectedCustomer = customers.find((cust: any) => cust.id.toString() === customerId);
    createMutation.mutate({
      companyId: storeCompanyId,
      title,
      customerId: parseInt(customerId),
      customer: selectedCustomer?.name || '',
      status,
      location,
      description,
      work_start_time: workStartTime,
      work_end_time: workEndTime,
      pazar_multiplier: parseFloat(pazarMultiplier) || 1.5,
      mesai_multiplier: parseFloat(mesaiMultiplier) || 1.5,
    });
  };

  const filtered = works.filter((item: any) => {
    const matchesSearch = !search ||
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.customer_name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = !statusFilter || item.status === statusFilter;
    
    let matchesDate = true;
    if (startDateFilter || endDateFilter) {
      const itemDate = item.start_date ? (typeof item.start_date === 'string' ? item.start_date : new Date(item.start_date).toISOString().split('T')[0]) : '';
      if (startDateFilter && itemDate < startDateFilter) matchesDate = false;
      if (endDateFilter && itemDate > endDateFilter) matchesDate = false;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const searchBg = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
  const searchBorder = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={styles.container}>
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
        <View style={[styles.header, { paddingTop: 8, paddingBottom: 8, paddingHorizontal: 20 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.text }]}>İş Takibi</Text>
            <Text style={[styles.count, { color: c.textSecondary }]}>{filtered.length} iş</Text>
          </View>
          <GlassIconButton
            icon="funnel-outline"
            onPress={() => setIsFilterModalVisible(true)}
          />
        </View>

        {/* Searchbar */}
        <View style={styles.searchRow}>
          <Searchbar
            placeholder="İş veya açıklama ara..."
            value={search}
            onChangeText={setSearch}
            style={[styles.searchBar, { backgroundColor: searchBg, borderColor: searchBorder }]}
            inputStyle={[styles.searchInput, { color: c.text }]}
            placeholderTextColor={c.textSecondary}
            iconColor={c.textSecondary}
          />
        </View>
      </View>

      {/* List */}
      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 120 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={c.primary} />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 30).duration(300)} style={styles.cardContainer}>
              <GlassCard intensity={30} style={styles.cardGlass}>
                <View style={styles.cardInner}>
                  <View style={[styles.iconBox, { backgroundColor: c.primary + '15' }]}>
                    <Ionicons name="briefcase-outline" size={22} color={c.primary} />
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.cardTitle, { color: c.text }]}>{item.title || 'İş Tanımsız'}</Text>
                    <Text style={[styles.cardSubtitle, { color: c.textSecondary }]} numberOfLines={1}>
                      {item.customer_name || 'Müşteri Belirtilmemiş'}
                    </Text>
                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={11} color={c.textTertiary} />
                        <Text style={[styles.metaText, { color: c.textTertiary }]}>{item.total_hours || 0} sa</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={11} color={c.textTertiary} />
                        <Text style={[styles.metaText, { color: c.textTertiary }]}>{item.total_days || 0} gün</Text>
                      </View>
                      {item.start_date && (
                        <View style={styles.metaItem}>
                          <Ionicons name="play-outline" size={11} color={c.textTertiary} />
                          <Text style={[styles.metaText, { color: c.textTertiary }]}>{formatDate(item.start_date)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.right}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) === 'success' ? c.success + '15' : getStatusColor(item.status) === 'warning' ? c.warning + '15' : c.textSecondary + '15' }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) === 'success' ? c.success : getStatusColor(item.status) === 'warning' ? c.warning : c.textSecondary }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(item.status) === 'success' ? c.success : getStatusColor(item.status) === 'warning' ? c.warning : c.textSecondary }]}>
                        {getStatusLabel(item.status)}
                      </Text>
                    </View>
                    <Text style={[styles.priceText, { color: c.text }]}>
                      {formatCurrency(item.total_price)}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color={c.textTertiary} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                {search ? 'Sonuç bulunamadı.' : 'Aktif iş bulunamadı.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Add Work Modal */}
      <GlassModal visible={isModalVisible} onDismiss={() => setIsModalVisible(false)}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni İş Ekle</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <GlassInput
                label="İş Başlığı"
                value={title}
                onChangeText={setTitle}
                placeholder="Örn: Vinç Kiralama"
              />
              <GlassDropdown
                label="Müşteri / Cari"
                value={customerId}
                options={customerOptions}
                onSelect={setCustomerId}
                placeholder="Müşteri seçin..."
              />
              <GlassDropdown
                label="Durum"
                value={status}
                options={[
                  { label: 'Bekliyor', value: 'pending' },
                  { label: 'Devam Ediyor', value: 'in_progress' },
                  { label: 'Tamamlandı', value: 'completed' },
                  { label: 'İptal Edildi', value: 'cancelled' },
                ]}
                onSelect={setStatus}
                placeholder="Seçiniz..."
              />
              <GlassInput
                label="Konum / Adres"
                value={location}
                onChangeText={setLocation}
                placeholder="İş adresi..."
              />
              <GlassInput
                label="Standart Mesai Başlangıç"
                value={workStartTime}
                onChangeText={setWorkStartTime}
                placeholder="08:00"
              />
              <GlassInput
                label="Standart Mesai Bitiş"
                value={workEndTime}
                onChangeText={setWorkEndTime}
                placeholder="17:00"
              />
              <GlassInput
                label="Pazar Mesai Katsayısı"
                value={pazarMultiplier}
                onChangeText={setPazarMultiplier}
                keyboardType="numeric"
                placeholder="1.5"
              />
              <GlassInput
                label="Mesai Farkı Katsayısı"
                value={mesaiMultiplier}
                onChangeText={setMesaiMultiplier}
                keyboardType="numeric"
                placeholder="1.5"
              />
              <GlassInput
                label="Açıklama"
                value={description}
                onChangeText={setDescription}
                placeholder="İş detayları..."
                multiline
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button mode="text" onPress={() => setIsModalVisible(false)} textColor={c.textSecondary}>
                İptal
              </Button>
              <Button
                mode="contained"
                onPress={handleCreate}
                loading={createMutation.isPending}
                disabled={createMutation.isPending || !title || !customerId}
                buttonColor={c.primary}
                textColor="#ffffff"
              >
                Kaydet
              </Button>
            </View>
          </GlassModal>

      {/* Filter Modal */}
      <GlassModal visible={isFilterModalVisible} onDismiss={() => setIsFilterModalVisible(false)}>
        <Text style={[styles.modalTitle, { color: c.text }]}>Filtrele</Text>
        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          
          <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 8 }]}>Durum</Text>
          <View style={[styles.filterRow, { flexWrap: 'wrap', gap: 8 }]}>
            {([
              { label: 'Tümü', value: null },
              { label: 'Bekliyor', value: 'pending' },
              { label: 'Devam Ediyor', value: 'in_progress' },
              { label: 'Tamamlandı', value: 'completed' },
              { label: 'İptal Edildi', value: 'cancelled' },
            ] as const).map((opt) => {
              const isSelected = statusFilter === opt.value;
              return (
                <Pressable
                  key={String(opt.value)}
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
              setStatusFilter(null);
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

      {/* Portal for Add Modal */}
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
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
  },
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
  right: { alignItems: 'flex-end', gap: 6 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  priceText: { fontSize: 14, fontWeight: '700' },
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
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
  filterSectionTitle: { fontSize: 14, fontWeight: '700', marginVertical: 8 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 4 },
});
