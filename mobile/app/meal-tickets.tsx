import { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { Text, ActivityIndicator, IconButton, Searchbar, Portal, Modal, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { mealTicketService } from '../services/dataServices';
import { formatCurrency } from '../utils/format';
import { useAuthStore } from '../stores/authStore';
import MovingBackground from '../components/ui/MovingBackground';
import GlassCard from '../components/ui/GlassCard';
import GlassInput from '../components/ui/GlassInput';

export default function MealTicketsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');

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
  });

  const statsQuery = useQuery({
    queryKey: ['meal-tickets-stats', selectedCompanyId],
    queryFn: () => mealTicketService.getStats(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const tickets = listQuery.data?.data || [];
  const stats = statsQuery.data || { totalAmount: 0, totalQuantity: 0 };

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
      item.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.date?.toLowerCase().includes(search.toLowerCase());
  });

  const searchBg = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
  const searchBorder = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={styles.container}>
      <MovingBackground />
      
      {/* Navbar */}
      <View style={[styles.nav, { paddingTop: insets.top }]}>
        <IconButton icon="arrow-left" size={24} iconColor={c.text} onPress={() => router.back()} />
        <Text style={[styles.navTitle, { color: c.text }]}>Yemek Fişleri</Text>
        <IconButton icon="plus" size={24} iconColor={c.text} onPress={() => setIsModalVisible(true)} />
      </View>

      {/* Summary Header */}
      <View style={styles.summaryRow}>
        <GlassCard intensity={40} style={styles.summaryCardGlass}>
          <View style={styles.summaryContent}>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>Toplam Adet</Text>
              <Text style={[styles.summaryVal, { color: c.primary }]}>{stats.totalQuantity || 0}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]} />
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>Toplam Tutar</Text>
              <Text style={[styles.summaryVal, { color: c.success }]}>{formatCurrency(stats.totalAmount)}</Text>
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
          refreshControl={
            <RefreshControl
              refreshing={listQuery.isFetching || statsQuery.isFetching}
              onRefresh={() => {
                listQuery.refetch();
                statsQuery.refetch();
              }}
              tintColor={c.primary}
            />
          }
          renderItem={({ item }) => (
            <GlassCard intensity={30} style={styles.cardGlass}>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: c.text }]}>{item.employee_name || 'Personel Belirtilmemiş'}</Text>
                  <Text style={[styles.amountText, { color: c.success }]}>{formatCurrency(item.amount)}</Text>
                </View>
                <View style={styles.footerRow}>
                  <Text style={[styles.cardDate, { color: c.textSecondary }]}>Tarih: {item.date}</Text>
                  <Text style={[styles.cardDate, { color: c.textSecondary }]}>Adet: {item.quantity || 1}</Text>
                </View>
              </View>
            </GlassCard>
          )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  navTitle: { fontSize: 18, fontWeight: '700' },
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
  listContent: { paddingHorizontal: 20, paddingBottom: 100, gap: 8 },
  cardGlass: { padding: 0 },
  cardContent: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  amountText: { fontSize: 15, fontWeight: '700' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardDate: { fontSize: 12 },
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
