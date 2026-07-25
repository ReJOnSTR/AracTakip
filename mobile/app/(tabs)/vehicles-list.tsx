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
  ScrollView,
  Platform,
} from 'react-native';
import { Text, Searchbar, Chip, Button } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { vehicleService } from '../../services/dataServices';
import { getStatusLabel, getStatusColor } from '../../utils/format';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassDropdown from '../../components/ui/GlassDropdown';
import GlassIconButton from '../../components/ui/GlassIconButton';
import GlassSearchBar from '../../components/ui/GlassSearchBar';
import GlassButtonGroup from '../../components/ui/GlassButtonGroup';

export default function VehiclesScreen() {
  const { themeMode } = useThemeStore();
  const colorScheme = themeMode;
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCompanyId } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('active');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

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

  const vehicleTypes = Array.from(new Set(vehicles.map((v: any) => v.type).filter(Boolean))) as string[];

  const filtered = vehicles.filter((v: any) => {
    const matchesSearch = !search ||
      v.plate?.toLowerCase().includes(search.toLowerCase()) ||
      v.brand?.toLowerCase().includes(search.toLowerCase()) ||
      v.model?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || v.status === statusFilter;
    const matchesType = !typeFilter || v.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
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

  const renderVehicle = useCallback(({ item, index }: { item: any; index: number }) => {
    const isDark = themeMode === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#0F172A';
    const subTextColor = isDark ? '#E2E8F0' : '#475569';
    const metaTextColor = isDark ? '#94A3B8' : '#64748B';

    return (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(300)} style={styles.cardContainer}>
        <Pressable
          onPress={() => router.push({ pathname: '/vehicle-detail', params: { id: item.id } })}
        >
          <GlassCard intensity={50} style={styles.vehicleCardGlass}>
            <View style={styles.vehicleCardInner}>
              <View style={styles.vehicleInfo}>
                <Text style={[styles.plate, { color: textColor }]}>{item.plate}</Text>
                <Text style={[styles.vehicleDetail, { color: subTextColor }]}>
                  {[item.brand, item.model, item.year].filter(Boolean).join(' ')}
                </Text>
                <View style={styles.vehicleMeta}>
                  <Text style={[styles.metaText, { color: metaTextColor }]}>
                    {item.maintenances_count || 0} bakım • {item.inspections_count || 0} muayene • {item.services_count || 0} servis
                  </Text>
                </View>
              </View>
              <View style={styles.vehicleRight}>
                <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.06)' }]}>
                  <View style={[styles.statusDot, { backgroundColor: item.status === 'active' ? '#34D399' : (item.status === 'maintenance' ? '#FBBF24' : '#F87171') }]} />
                  <Text style={[styles.statusText, { color: textColor }]}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
                {item.type && (
                  <Text style={[styles.typeText, { color: metaTextColor }]}>{item.type}</Text>
                )}
              </View>
            </View>
          </GlassCard>
        </Pressable>
      </Animated.View>
    );
  }, [themeMode, router]);

  const glassBgColor = Platform.OS === 'web'
    ? (colorScheme === 'dark' ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.75)')
    : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.2)');
  const glassBorderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.5)';

  return (
    <SwipeBackView onSwipeBack={() => router.push('/vehicles')} style={styles.container}>
      <MovingBackground />
      
      {/* Floating Action Buttons ONLY (No wall, no canvas, no header container) */}
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
        {/* Left Back Button */}
        <GlassIconButton
          icon="chevron-back"
          onPress={() => router.push('/vehicles')}
        />

        {/* Right Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <GlassIconButton
            icon="funnel-outline"
            active={!!(statusFilter || typeFilter)}
            onPress={() => setIsFilterModalVisible(true)}
          />
          <GlassIconButton
            icon="add"
            onPress={() => setIsModalVisible(true)}
          />
        </View>
      </View>

      {/* Vehicle List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderVehicle}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 60, paddingBottom: 12 }}>
            {/* Scrollable Title (Scrolls away with list) */}
            <View style={{ alignItems: 'center', marginBottom: 16, marginTop: 8 }}>
              <Text style={[styles.title, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text, textAlign: 'center' }]}>Araçlar</Text>
              <Text style={[styles.count, { color: colorScheme === 'dark' ? '#E2E8F0' : c.textSecondary, textAlign: 'center', marginTop: 2 }]}>{filtered.length} araç</Text>
            </View>

            {/* GlassSearchBar */}
            <GlassSearchBar
              placeholder="Plaka, marka veya model ara..."
              value={search}
              onChangeText={setSearch}
            />
          </View>
        }
        contentContainerStyle={[styles.listContent, { paddingTop: 0 }]}
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
      <GlassModal visible={isModalVisible} onDismiss={() => setIsModalVisible(false)}>
        <View style={styles.modalHeaderRow}>
          <View>
            <Text style={[styles.modalTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>Yeni Araç Ekle</Text>
            <Text style={{ fontSize: 13, color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary, marginTop: 2 }}>Araç bilgilerini ve plakasını girin</Text>
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
            disabled={createMutation.isPending || !plate || !type}
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
            <Text style={{ fontSize: 13, color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary, marginTop: 2 }}>Araç listesi filtreleme seçenekleri</Text>
          </View>
          <GlassIconButton
            icon="close"
            size={36}
            iconSize={18}
            onPress={() => setIsFilterModalVisible(false)}
          />
        </View>
        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
          
          <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 8 }]}>Araç Türü</Text>
          <View style={[styles.filterRow, { flexWrap: 'wrap', gap: 8 }]}>
            <Pressable
              onPress={() => setTypeFilter(null)}
              style={{
                height: 36,
                borderRadius: 18,
                borderWidth: 1,
                paddingHorizontal: 16,
                backgroundColor: !typeFilter 
                  ? (colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)')
                  : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)'),
                borderColor: !typeFilter 
                  ? c.primary 
                  : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ 
                color: !typeFilter ? c.primary : c.textSecondary, 
                fontSize: 13,
                fontWeight: !typeFilter ? '600' : '400'
              }}>
                Tümü
              </Text>
            </Pressable>
            {vehicleTypes.map((vType) => {
              const isSelected = typeFilter === vType;
              return (
                <Pressable
                  key={vType}
                  onPress={() => setTypeFilter(isSelected ? null : vType)}
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
                    {vType}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Status Filter */}
          <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 16 }]}>Durum</Text>
          <View style={[styles.filterRow, { flexWrap: 'wrap', gap: 8, marginTop: 8 }]}>
            <Pressable
              onPress={() => setStatusFilter(null)}
              style={{
                height: 36,
                borderRadius: 18,
                borderWidth: 1,
                paddingHorizontal: 16,
                backgroundColor: !statusFilter 
                  ? (colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)')
                  : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)'),
                borderColor: !statusFilter 
                  ? c.primary 
                  : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ 
                color: !statusFilter ? c.primary : c.textSecondary, 
                fontSize: 13,
                fontWeight: !statusFilter ? '600' : '400'
              }}>
                Tümü
              </Text>
            </Pressable>
            {Object.keys(statusCounts).map((status) => {
              const isSelected = statusFilter === status;
              const statusColor = statusColorMap[status] || c.primary;
              return (
                <Pressable
                  key={status}
                  onPress={() => setStatusFilter(isSelected ? null : status)}
                  style={{
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 1,
                    paddingHorizontal: 16,
                    backgroundColor: isSelected 
                      ? (statusColor === c.primary 
                         ? (colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)') 
                         : statusColor + '25')
                      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)'),
                    borderColor: isSelected 
                      ? statusColor 
                      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ 
                    color: isSelected ? statusColor : c.textSecondary, 
                    fontSize: 13,
                    fontWeight: isSelected ? '600' : '400'
                  }}>
                    {getStatusLabel(status)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

        </ScrollView>
        <View style={styles.modalFooterRow}>
          <Button 
            mode="text" 
            onPress={() => {
              setTypeFilter(null);
              setStatusFilter('active');
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
  filterSectionTitle: { fontSize: 14, fontWeight: '700', marginVertical: 8 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 4 },
  filterChip: { borderRadius: 10, marginVertical: 2 },
  chip: { borderRadius: 10 },
  chipText: { fontSize: 12, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 100 },
  cardContainer: {
    marginBottom: 10,
  },

  vehicleCardGlass: {
    padding: 0,
  },
  vehicleCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    gap: 10,
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
});
