import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  useColorScheme,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Text, ActivityIndicator, IconButton, Searchbar, Portal, Modal, Button } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { mealTicketService } from '../../services/dataServices';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuthStore } from '../../stores/authStore';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function MealTicketsScreen() {
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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [personCount, setPersonCount] = useState('');
  const [notes, setNotes] = useState('');

  const { selectedCompanyId } = useAuthStore();

  const listQuery = useQuery({
    queryKey: ['meal-tickets', selectedCompanyId],
    queryFn: () => mealTicketService.getAll(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5000,
  });

  const statsQuery = useQuery({
    queryKey: ['meal-tickets-stats', selectedCompanyId],
    queryFn: () => mealTicketService.getStats(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5000,
  });

  const tickets = listQuery.data?.data || [];
  const stats = statsQuery.data?.data || { totalThisMonth: 0, totalCostThisMonth: 0 };
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([listQuery.refetch(), statsQuery.refetch()]);
    setIsRefreshing(false);
  };

  const createMutation = useMutation({
    mutationFn: (newTicket: any) => mealTicketService.create(newTicket),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-tickets', selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['meal-tickets-stats', selectedCompanyId] });
      setIsModalVisible(false);
      // Reset form
      setDate(new Date().toISOString().split('T')[0]);
      setPersonCount('');
      setNotes('');
    },
  });

  const handleCreate = () => {
    const count = parseInt(personCount);
    if (!date || !count || count < 1) return;
    createMutation.mutate({
      companyId: selectedCompanyId,
      date,
      personCount: count,
      notes,
    });
  };

  const filtered = tickets.filter((item: any) => {
    return !search ||
      item.notes?.toLowerCase().includes(search.toLowerCase()) ||
      item.date?.toLowerCase().includes(search.toLowerCase());
  });

  const searchBg = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
  const searchBorder = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={styles.container}>
      <MovingBackground />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: c.text }]}>Yemek Fişleri</Text>
        <Text style={[styles.count, { color: c.textSecondary }]}>{tickets.length} fiş</Text>
      </View>

      {/* Summary Header */}
      <View style={styles.summaryRow}>
        <GlassCard intensity={40} style={styles.summaryCardGlass}>
          <View style={styles.summaryContent}>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>Toplam Adet</Text>
              <Text style={[styles.summaryVal, { color: c.primary }]}>{stats.totalThisMonth || 0}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]} />
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>Toplam Tutar</Text>
              <Text style={[styles.summaryVal, { color: c.success }]}>{formatCurrency(stats.totalCostThisMonth)}</Text>
            </View>
          </View>
        </GlassCard>
      </View>

      {/* Searchbar */}
      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Personel ismi veya tarih ara..."
          value={search}
          onChangeText={setSearch}
          style={[styles.searchBar, { backgroundColor: searchBg, borderColor: searchBorder }]}
          inputStyle={[styles.searchInput, { color: c.text }]}
          placeholderTextColor={c.textSecondary}
          iconColor={c.textSecondary}
        />
      </View>

      {/* List */}
      {listQuery.isLoading ? (
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
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={c.primary}
            />
          }
          renderItem={({ item, index }) => {
            const totalAmount = (item.person_count || 1) * (item.price_per_person || 0);
            return (
              <Animated.View entering={FadeInDown.delay(index * 30).duration(300)} style={styles.cardContainer}>
                <GlassCard intensity={30} style={styles.cardGlass}>
                  <View style={styles.cardInner}>
                    <View style={[styles.iconBox, { backgroundColor: c.primary + '15' }]}>
                      <Ionicons name="restaurant-outline" size={22} color={c.primary} />
                    </View>
                    <View style={styles.info}>
                      <Text style={[styles.cardTitle, { color: c.text }]}>Yemek Fişi</Text>
                      <Text style={[styles.cardSubtitle, { color: c.textSecondary }]} numberOfLines={1}>
                        {item.notes || 'Açıklama girilmemiş'}
                      </Text>
                      <View style={styles.cardMeta}>
                        <View style={styles.metaItem}>
                          <Ionicons name="calendar-outline" size={11} color={c.textTertiary} />
                          <Text style={[styles.metaText, { color: c.textTertiary }]}>{formatDate(item.date)}</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons name="people-outline" size={11} color={c.textTertiary} />
                          <Text style={[styles.metaText, { color: c.textTertiary }]}>{item.person_count || 1} Kişi</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.right}>
                      <Text style={[styles.priceText, { color: c.success }]}>
                        {formatCurrency(totalAmount)}
                      </Text>
                      <Text style={[styles.unitText, { color: c.textSecondary }]}>
                        Birim: {formatCurrency(item.price_per_person)}
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={c.textTertiary} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                {search ? 'Sonuç bulunamadı.' : 'Yemek fişi bulunamadı.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Add Meal Ticket Modal */}
      <Portal>
        <Modal
          visible={isModalVisible}
          onDismiss={() => setIsModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <GlassCard intensity={85} style={styles.modalGlassCard}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni Yemek Fişi</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <GlassInput
                label="Tarih"
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />
              <GlassInput
                label="Kişi Sayısı"
                value={personCount}
                onChangeText={setPersonCount}
                keyboardType="numeric"
                placeholder="Kaç kişi yemeğe gitti?"
              />
              <GlassInput
                label="Notlar"
                value={notes}
                onChangeText={setNotes}
                placeholder="Ekstra bilgi (opsiyonel)"
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
                disabled={createMutation.isPending || !date || !personCount}
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
  summaryRow: { paddingHorizontal: 20, marginVertical: 8 },
  summaryCardGlass: { padding: 0 },
  summaryContent: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 12 },
  summaryBox: { alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryVal: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  divider: { width: 1, height: '80%' },
  searchRow: { paddingHorizontal: 20, paddingVertical: 10 },
  searchBar: { borderRadius: 14, elevation: 0, height: 46, borderWidth: 1 },
  searchInput: { fontSize: 14, minHeight: 0 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  cardContainer: { marginBottom: 8 },
  cardGlass: { padding: 0 },
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
  unitText: { fontSize: 11 },
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
