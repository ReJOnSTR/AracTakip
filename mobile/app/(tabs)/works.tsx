import { useState, useEffect } from 'react';
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
import { Text, ActivityIndicator, IconButton, Searchbar, Portal, Modal, Button } from 'react-native-paper';
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

export default function WorksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');

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
  });

  const customersQuery = useQuery({
    queryKey: ['customers', storeCompanyId],
    queryFn: () => customerService.getAll(storeCompanyId!),
    enabled: !!storeCompanyId,
  });

  const works = query.data?.data || [];
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
    return !search ||
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.status?.toLowerCase().includes(search.toLowerCase());
  });

  const searchBg = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
  const searchBorder = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={styles.container}>
      <MovingBackground />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: c.text }]}>İş Takibi</Text>
        <Text style={[styles.count, { color: c.textSecondary }]}>{works.length} iş</Text>
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

      {/* List */}
      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} tintColor={c.primary} />
          }
          renderItem={({ item }) => (
            <GlassCard intensity={30} style={styles.cardGlass}>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: c.text }]}>{item.title || 'İş Tanımsız'}</Text>
                  <View style={[styles.statusBadge, { borderColor: c.primary, backgroundColor: c.primary + '15' }]}>
                    <Text style={[styles.statusBadgeText, { color: c.primary }]}>
                      {item.status || 'Beklemede'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cardDesc, { color: c.textSecondary }]}>{item.description || 'Açıklama girilmemiş.'}</Text>
                {item.start_date && (
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={12} color={c.textTertiary} />
                    <Text style={[styles.cardDate, { color: c.textTertiary }]}>
                      Başlangıç: {item.start_date}
                    </Text>
                  </View>
                )}
              </View>
            </GlassCard>
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
      <Portal>
        <Modal
          visible={isModalVisible}
          onDismiss={() => setIsModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <GlassCard intensity={85} style={styles.modalGlassCard}>
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
          </GlassCard>
        </Modal>
      </Portal>

      {/* Portal for Add Modal */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  listContent: { paddingHorizontal: 20, paddingBottom: 100, gap: 8 },
  cardGlass: { padding: 0 },
  cardContent: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  statusBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  cardDate: { fontSize: 11 },
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
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
});
