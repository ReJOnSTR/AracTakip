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
import { formatDate } from '../../utils/format';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';
import GlassIconButton from '../../components/ui/GlassIconButton';
import GlassModal from '../../components/ui/GlassModal';
import SwipeBackView from '../../components/ui/SwipeBackView';
import { BlurView } from 'expo-blur';
import GlassInput from '../../components/ui/GlassInput';

export default function LeavesListScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCompanyId } = useAuthStore();
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const query = useQuery({
    queryKey: ['all-leaves', selectedCompanyId],
    queryFn: () => employeeService.getAllLeaves(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const onRefresh = async () => {
    setIsRefreshing(true);
    await query.refetch();
    setIsRefreshing(false);
  };

  const records = query.data?.data || [];

  const leaveTypes = Array.from(new Set(records.map((r: any) => r.type).filter(Boolean))) as string[];

  const filtered = records.filter((m: any) => {
    const term = search.toLowerCase();
    const fullName = `${m.employees?.first_name || ''} ${m.employees?.last_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(term) ||
      m.type?.toLowerCase().includes(term) ||
      (m.notes && m.notes.toLowerCase().includes(term));
    const mStatus = m.status?.toLowerCase();
    const matchesStatus = statusFilter === 'all' ||
      mStatus === statusFilter ||
      (statusFilter === 'approved' && mStatus === 'onaylandı') ||
      (statusFilter === 'pending' && mStatus === 'bekliyor') ||
      (statusFilter === 'rejected' && mStatus === 'reddedildi');
      
    const matchesType = !typeFilter || m.type === typeFilter;
    
    let matchesDate = true;
    if (startDateFilter || endDateFilter) {
      const itemDate = m.start_date ? (typeof m.start_date === 'string' ? m.start_date : new Date(m.start_date).toISOString().split('T')[0]) : '';
      if (startDateFilter && itemDate < startDateFilter) matchesDate = false;
      if (endDateFilter && itemDate > endDateFilter) matchesDate = false;
    }
    
    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'onaylandı':
        return { bg: c.successContainer + '20', text: c.success, label: 'Onaylandı' };
      case 'pending':
      case 'bekliyor':
        return { bg: c.warningContainer + '20', text: c.warning, label: 'Bekliyor' };
      case 'rejected':
      case 'reddedildi':
        return { bg: c.errorContainer + '20', text: c.error, label: 'Reddedildi' };
      default:
        return { bg: 'rgba(0,0,0,0.05)', text: c.textSecondary, label: status || 'Bilinmiyor' };
    }
  };

  const getInitials = (first: string, last: string) => {
    return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
  };

  const avatarColors = [c.primary, c.secondary, c.tertiary, c.info, c.warning];
  const glassBgColor = Platform.OS === 'web'
    ? (colorScheme === 'dark' ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.75)')
    : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.2)');
  const glassBorderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.5)';

  return (
    <SwipeBackView onSwipeBack={() => router.push('/employees')} style={styles.container}>
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
            <Text style={[styles.title, { color: c.text }]}>İzin Takibi</Text>
            <Text style={[styles.count, { color: c.textSecondary }]}>{filtered.length} kayıt</Text>
          </View>
          <GlassIconButton
            icon="funnel-outline"
            onPress={() => setIsFilterModalVisible(true)}
          />
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Searchbar
            placeholder="Personel adı veya izin türü ara..."
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
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 120 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={c.primary} />
          }
          renderItem={({ item, index }) => {
            const statusConf = getStatusStyle(item.status);
            const avatarColor = avatarColors[index % avatarColors.length];
            return (
              <Animated.View entering={FadeInDown.delay(index * 20).duration(300)} style={styles.cardContainer}>
                <GlassCard intensity={30} style={styles.cardGlass}>
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
                      <Text style={[styles.leaveType, { color: c.textSecondary }]}>
                        {item.type || 'İzin'} • {(() => {
                          const d = parseFloat(item.days);
                          if (item.hours) return `${item.hours} Saat`;
                          if (d && d % 1 !== 0) {
                            return `${Math.round(d * 8 * 10) / 10} Saat`;
                          }
                          return `${d || 1} Gün`;
                        })()}
                      </Text>
                      <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                          <Ionicons name="calendar-outline" size={12} color={c.textTertiary} />
                          <Text style={[styles.metaText, { color: c.textTertiary }]}>
                            {formatDate(item.start_date)} - {formatDate(item.end_date)}
                          </Text>
                        </View>
                      </View>
                      {item.notes ? (
                        <Text style={[styles.notes, { color: c.textTertiary }]} numberOfLines={1}>
                          Not: {item.notes}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.rightBox}>
                      <View style={[styles.statusBadge, { backgroundColor: statusConf.bg, borderColor: statusConf.text }]}>
                        <Text style={[styles.statusText, { color: statusConf.text }]}>{statusConf.label}</Text>
                      </View>
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={c.textTertiary} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                {search ? 'İzin kaydı bulunamadı' : 'Henüz izin kaydı girilmemiş'}
              </Text>
            </View>
          }
        />
      )}

      {/* Filter Modal */}
      <GlassModal visible={isFilterModalVisible} onDismiss={() => setIsFilterModalVisible(false)}>
        <Text style={[styles.modalTitle, { color: c.text }]}>Filtrele</Text>
        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          
          <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 8 }]}>İzin Durumu</Text>
          <View style={[styles.filterRow, { gap: 8 }]}>
            {([
              { label: 'Tümü', value: 'all' },
              { label: 'Bekleyenler', value: 'pending' },
              { label: 'Onaylananlar', value: 'approved' },
              { label: 'Reddedilenler', value: 'rejected' },
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

          {leaveTypes.length > 0 && (
            <>
              <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 16 }]}>İzin Türü</Text>
              <View style={[styles.filterRow, { gap: 8 }]}>
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
                {leaveTypes.map((type) => {
                  const isSelected = typeFilter === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setTypeFilter(type)}
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
                        {type}
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
              setTypeFilter(null);
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
  leaveType: { fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11 },
  notes: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  rightBox: { alignItems: 'flex-end' },
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
