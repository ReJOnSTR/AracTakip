import { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  useColorScheme,
  Pressable,
} from 'react-native';
import { Text, ActivityIndicator, IconButton, Searchbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { workService } from '../services/dataServices';
import MovingBackground from '../components/ui/MovingBackground';
import GlassCard from '../components/ui/GlassCard';

export default function WorksScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');

  // We can import useAuthStore here
  const { selectedCompanyId: storeCompanyId } = require('../stores/authStore').useAuthStore();

  const query = useQuery({
    queryKey: ['works', storeCompanyId],
    queryFn: () => workService.getAll(storeCompanyId!),
    enabled: !!storeCompanyId,
  });

  const works = query.data?.data || [];

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
      
      {/* Navbar */}
      <View style={[styles.nav, { paddingTop: insets.top }]}>
        <IconButton icon="arrow-left" size={24} iconColor={c.text} onPress={() => router.back()} />
        <Text style={[styles.navTitle, { color: c.text }]}>İşler (Works)</Text>
        <View style={{ width: 48 }} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  navTitle: { fontSize: 18, fontWeight: '700' },
  searchRow: { paddingHorizontal: 20, paddingVertical: 10 },
  searchBar: { borderRadius: 14, elevation: 0, height: 46, borderWidth: 1 },
  searchInput: { fontSize: 14, minHeight: 0 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 8 },
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
});

