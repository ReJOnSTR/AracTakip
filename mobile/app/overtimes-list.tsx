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
import { employeeService } from '../services/dataServices';
import { formatDate, formatCurrency } from '../utils/format';
import MovingBackground from '../components/ui/MovingBackground';
import GlassCard from '../components/ui/GlassCard';

export default function OvertimesListScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCompanyId } = useAuthStore();
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const query = useQuery({
    queryKey: ['all-overtimes', selectedCompanyId],
    queryFn: () => employeeService.getAllOvertimes(selectedCompanyId!),
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
    const fullName = `${m.employees?.first_name || ''} ${m.employees?.last_name || ''}`.toLowerCase();
    return (
      fullName.includes(term) ||
      (m.notes && m.notes.toLowerCase().includes(term))
    );
  });

  const getInitials = (first: string, last: string) => {
    return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
  };

  const avatarColors = [c.primary, c.secondary, c.tertiary, c.info, c.warning];
  const searchBg = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
  const searchBorder = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  const totalAmount = records.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

  return (
    <View style={styles.container}>
      <MovingBackground />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>Fazla Mesailer</Text>
          <Text style={[styles.count, { color: c.textSecondary }]}>
            {records.length} kayıt • Toplam: {formatCurrency(totalAmount)}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Personel adı veya mesai detayı ara..."
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
          renderItem={({ item, index }) => {
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
                      <Text style={[styles.overtimeDetails, { color: c.textSecondary }]}>
                        Süre: {item.hours || 0} Saat • Oran: {item.rate || 1.5}x
                      </Text>
                      <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                          <Ionicons name="calendar-outline" size={12} color={c.textTertiary} />
                          <Text style={[styles.metaText, { color: c.textTertiary }]}>Tarih: {formatDate(item.date)}</Text>
                        </View>
                      </View>
                      {item.notes ? (
                        <Text style={[styles.notes, { color: c.textTertiary }]} numberOfLines={1}>
                          Not: {item.notes}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.rightBox}>
                      <Text style={[styles.amount, { color: c.success }]}>+{formatCurrency(item.amount || 0)}</Text>
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color={c.textTertiary} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                {search ? 'Mesai kaydı bulunamadı' : 'Henüz mesai kaydı girilmemiş'}
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
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
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
  overtimeDetails: { fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11 },
  notes: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  rightBox: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
