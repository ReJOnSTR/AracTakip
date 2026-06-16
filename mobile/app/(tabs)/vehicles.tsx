import { useCallback, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  useColorScheme,
  Pressable,
  ScrollView,
} from 'react-native';
import { Text, Searchbar, Chip, Portal, Modal, Button } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../stores/authStore';
import { vehicleService } from '../../services/dataServices';
import { getStatusLabel, getStatusColor } from '../../utils/format';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassDropdown from '../../components/ui/GlassDropdown';

export default function VehiclesScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCompanyId } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const params = useLocalSearchParams();
  const queryClient = useQueryClient();

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [plate, setPlate] = useState('');
  const [type, setType] = useState('Otomobil');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [km, setKm] = useState('');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (params.openAdd === 'true') {
      setIsModalVisible(true);
      router.setParams({ openAdd: undefined });
    }
  }, [params.openAdd]);

  const createMutation = useMutation({
    mutationFn: (newVehicle: any) => vehicleService.create(newVehicle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsModalVisible(false);
      // Reset form
      setPlate('');
      setType('Otomobil');
      setBrand('');
      setModel('');
      setYear('');
      setColor('');
      setKm('');
      setStatus('active');
      setNotes('');
    },
  });

  const handleCreate = () => {
    if (!plate || !type) return;
    createMutation.mutate({
      companyId: selectedCompanyId,
      plate,
      type,
      brand,
      model,
      year: year ? parseInt(year) : undefined,
      color,
      km: km ? parseInt(km) : undefined,
      status,
      notes,
    });
  };

  const query = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: () => vehicleService.getAll(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const vehicles = query.data?.data || [];

  const filtered = vehicles.filter((v: any) => {
    const matchesSearch = !search ||
      v.plate?.toLowerCase().includes(search.toLowerCase()) ||
      v.brand?.toLowerCase().includes(search.toLowerCase()) ||
      v.model?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = vehicles.reduce((acc: any, v: any) => {
    acc[v.status || 'active'] = (acc[v.status || 'active'] || 0) + 1;
    return acc;
  }, {});

  const statusColorMap: Record<string, string> = {
    active: c.success,
    passive: c.textSecondary,
    maintenance: c.warning,
    sold: c.error,
  };

  const renderVehicle = useCallback(({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)} style={styles.cardContainer}>
      <Pressable
        onPress={() => router.push({ pathname: '/vehicle-detail', params: { id: item.id } })}
      >
        <GlassCard intensity={30} style={styles.vehicleCardGlass}>
          <View style={styles.vehicleCardInner}>
            <View style={[styles.plateBox, { backgroundColor: c.primaryContainer + '20' }]}>
              <Ionicons name="car" size={22} color={c.primary} />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={[styles.plate, { color: c.text }]}>{item.plate}</Text>
              <Text style={[styles.vehicleDetail, { color: c.textSecondary }]}>
                {[item.brand, item.model, item.year].filter(Boolean).join(' ')}
              </Text>
              <View style={styles.vehicleMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="build-outline" size={11} color={c.textTertiary} />
                  <Text style={[styles.metaText, { color: c.textTertiary }]}>{item.maintenances_count || 0}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="shield-checkmark-outline" size={11} color={c.textTertiary} />
                  <Text style={[styles.metaText, { color: c.textTertiary }]}>{item.inspections_count || 0}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="construct-outline" size={11} color={c.textTertiary} />
                  <Text style={[styles.metaText, { color: c.textTertiary }]}>{item.services_count || 0}</Text>
                </View>
              </View>
            </View>
            <View style={styles.vehicleRight}>
              <View style={[styles.statusBadge, { backgroundColor: (statusColorMap[item.status] || c.textSecondary) + '15' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColorMap[item.status] || c.textSecondary }]} />
                <Text style={[styles.statusText, { color: statusColorMap[item.status] || c.textSecondary }]}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
              {item.type && (
                <Text style={[styles.typeText, { color: c.textTertiary }]}>{item.type}</Text>
              )}
            </View>
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  ), [c, router]);

  const searchBg = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
  const searchBorder = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={styles.container}>
      <MovingBackground />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: c.text }]}>Araçlar</Text>
        <Text style={[styles.count, { color: c.textSecondary }]}>{vehicles.length} araç</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Plaka, marka veya model ara..."
          value={search}
          onChangeText={setSearch}
          style={[styles.searchBar, { backgroundColor: searchBg, borderColor: searchBorder }]}
          inputStyle={[styles.searchInput, { color: c.text }]}
          placeholderTextColor={c.textTertiary}
          iconColor={c.textSecondary}
        />
      </View>

      {/* Status Filter Chips */}
      <View style={styles.chipRow}>
        <Chip
          mode="flat"
          selected={!statusFilter}
          onPress={() => setStatusFilter(null)}
          style={[
            styles.chip,
            {
              backgroundColor: !statusFilter ? c.primaryContainer + '30' : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'),
              borderColor: !statusFilter ? c.primary : 'transparent',
              borderWidth: 1,
            }
          ]}
          textStyle={[styles.chipText, { color: !statusFilter ? c.primary : c.textSecondary }]}
        >
          Tümü ({vehicles.length})
        </Chip>
        {Object.entries(statusCounts).map(([status, count]) => {
          const isSelected = statusFilter === status;
          const statusColor = statusColorMap[status] || c.primary;
          return (
            <Chip
              key={status}
              mode="flat"
              selected={isSelected}
              onPress={() => setStatusFilter(isSelected ? null : status)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? statusColor + '20' : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'),
                  borderColor: isSelected ? statusColor : 'transparent',
                  borderWidth: 1,
                }
              ]}
              textStyle={[styles.chipText, { color: isSelected ? statusColor : c.textSecondary }]}
            >
              {getStatusLabel(status)} ({count as number})
            </Chip>
          );
        })}
      </View>

      {/* Vehicle List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderVehicle}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching}
            onRefresh={() => query.refetch()}
            tintColor={c.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={48} color={c.textTertiary} />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              {search ? 'Araç bulunamadı' : 'Henüz araç eklenmemiş'}
            </Text>
          </View>
        }
      />

      {/* Add Vehicle Modal */}
      <Portal>
        <Modal
          visible={isModalVisible}
          onDismiss={() => setIsModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <GlassCard intensity={85} style={styles.modalGlassCard}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni Araç Ekle</Text>
            
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <GlassInput
                label="Plaka"
                value={plate}
                onChangeText={setPlate}
                placeholder="örn: 34ABC123"
                autoCapitalize="characters"
              />

              <GlassDropdown
                label="Araç Türü"
                value={type}
                options={[
                  { label: 'Otomobil', value: 'Otomobil' },
                  { label: 'Çekici', value: 'Çekici' },
                  { label: 'Dorse', value: 'Dorse' },
                  { label: 'Kamyon', value: 'Kamyon' },
                  { label: 'İş Makinesi', value: 'İş Makinesi' },
                  { label: 'Diğer', value: 'Diğer' },
                ]}
                onSelect={setType}
                placeholder="Araç Türü Seçiniz"
              />

              <GlassInput
                label="Marka"
                value={brand}
                onChangeText={setBrand}
                placeholder="örn: Ford, Renault"
              />

              <GlassInput
                label="Model"
                value={model}
                onChangeText={setModel}
                placeholder="örn: Focus, Megane"
              />

              <GlassInput
                label="Yıl"
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
                placeholder="örn: 2022"
              />

              <GlassInput
                label="Kilometre (KM)"
                value={km}
                onChangeText={setKm}
                keyboardType="numeric"
                placeholder="örn: 45000"
              />

              <GlassInput
                label="Renk"
                value={color}
                onChangeText={setColor}
                placeholder="örn: Beyaz, Siyah"
              />

              <GlassDropdown
                label="Durum"
                value={status}
                options={[
                  { label: 'Aktif', value: 'active' },
                  { label: 'Bakımda', value: 'maintenance' },
                  { label: 'Pasif', value: 'passive' },
                  { label: 'Satıldı', value: 'sold' },
                ]}
                onSelect={setStatus}
                placeholder="Durum Seçiniz"
              />

              <GlassInput
                label="Notlar"
                value={notes}
                onChangeText={setNotes}
                placeholder="Araç ile ilgili notlar..."
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
                disabled={createMutation.isPending || !plate || !type}
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
  searchRow: { paddingHorizontal: 20, paddingVertical: 8 },
  searchBar: { borderRadius: 14, elevation: 0, height: 46, borderWidth: 1 },
  searchInput: { fontSize: 14, minHeight: 0 },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: { borderRadius: 10 },
  chipText: { fontSize: 12, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  cardContainer: {
    marginBottom: 8,
  },
  vehicleCardGlass: {
    padding: 0,
  },
  vehicleCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  plateBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: { flex: 1 },
  plate: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  vehicleDetail: { fontSize: 13, marginTop: 2 },
  vehicleMeta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11 },
  vehicleRight: { alignItems: 'flex-end', gap: 6 },
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
  typeText: { fontSize: 11 },
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
