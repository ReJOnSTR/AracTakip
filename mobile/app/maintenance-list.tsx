import { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  useColorScheme,
  Pressable,
} from 'react-native';
import { Text, Searchbar, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { useAuthStore } from '../stores/authStore';
import { vehicleService } from '../services/dataServices';
import { formatCurrency, formatDate } from '../utils/format';
import MovingBackground from '../components/ui/MovingBackground';
import GlassCard from '../components/ui/GlassCard';

export default function MaintenanceListScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCompanyId } = useAuthStore();
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const query = useQuery({
    queryKey: ['all-maintenances', selectedCompanyId],
    queryFn: () => vehicleService.getAllMaintenances(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const onRefresh = async () => {
    setIsRefreshing(true);
    await query.refetch();
    setIsRefreshing(false);
  };

  const records = query.data?.data || [];

  const filtered = records.filter((m: any) => {
    const term = search.toLowerCase();
    return (
      m.vehicles?.plate?.toLowerCase().includes(term) ||
      m.type?.toLowerCase().includes(term) ||
      m.description?.toLowerCase().includes(term)
    );
  });

  const totalCost = records.reduce((sum: number, item: any) => sum + (item.cost || 0), 0);

  const searchBg = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
  const searchBorder = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={styles.container}>
      <MovingBackground />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>Bakım Bilgileri</Text>
          <Text style={[styles.count, { color: c.textSecondary }]}>{records.length} kayıt • Toplam: {formatCurrency(totalCost)}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Plaka veya bakım detaylarında ara..."
          value={search}
          onChangeText={setSearch}
          style={[styles.searchBar, { backgroundColor: searchBg, borderColor: searchBorder }]}
          inputStyle={[styles.searchInput, { color: c.text }]}
          placeholderTextColor={c.textTertiary}
          iconColor={c.textSecondary}
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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={c.primary} />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 20).duration(300)} style={styles.cardContainer}>
              <GlassCard intensity={30} style={styles.cardGlass}>
                <View style={styles.cardInner}>
                  <View style={[styles.plateBox, { backgroundColor: c.primaryContainer + '20' }]}>
                    <Text style={[styles.plateText, { color: c.primary }]}>
                      {item.vehicles?.plate || 'Plakasız'}
                    </Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={[styles.typeName, { color: c.text }]}>{item.type || 'Genel Bakım'}</Text>
                    <Text style={[styles.desc, { color: c.textSecondary }]} numberOfLines={2}>
                      {item.description || 'Açıklama belirtilmemiş'}
                    </Text>
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={12} color={c.textTertiary} />
                        <Text style={[styles.metaText, { color: c.textTertiary }]}>{formatDate(item.date)}</Text>
                      </View>
                      {item.next_km && (
                        <View style={styles.metaItem}>
                          <Ionicons name="speedometer-outline" size={12} color={c.textTertiary} />
                          <Text style={[styles.metaText, { color: c.textTertiary }]}>Sonraki: {item.next_km.toLocaleString('tr-TR')} km</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.rightBox}>
                    <Text style={[styles.price, { color: c.error }]}>{formatCurrency(item.cost || 0)}</Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="construct-outline" size={48} color={c.textTertiary} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                {search ? 'Bakım kaydı bulunamadı' : 'Henüz bakım kaydı girilmemiş'}
              </Text>
            </View>
          }
        />
      )}
    </View>
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
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  count: { fontSize: 13, marginTop: 2 },
  searchRow: { paddingHorizontal: 20, paddingVertical: 8 },
  searchBar: { borderRadius: 14, elevation: 0, height: 46, borderWidth: 1 },
  searchInput: { fontSize: 14, minHeight: 0 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  cardContainer: { marginBottom: 8 },
  cardGlass: { padding: 0 },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
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
  rightBox: { alignItems: 'flex-end' },
  price: { fontSize: 14, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
