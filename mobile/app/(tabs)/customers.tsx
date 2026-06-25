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
import { customerService } from '../../services/dataServices';
import { useAuthStore } from '../../stores/authStore';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatCurrency } from '../../utils/format';

export default function CustomersScreen() {
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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [notes, setNotes] = useState('');

  const { selectedCompanyId } = useAuthStore();

  const query = useQuery({
    queryKey: ['customers', selectedCompanyId],
    queryFn: () => customerService.getAll(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5000,
  });

  const customers = query.data?.data || [];
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefresh = async () => {
    setIsRefreshing(true);
    await query.refetch();
    setIsRefreshing(false);
  };

  const createMutation = useMutation({
    mutationFn: (newCustomer: any) => customerService.create(newCustomer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', selectedCompanyId] });
      setIsModalVisible(false);
      // Reset form
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setTaxNumber('');
      setTaxOffice('');
      setNotes('');
    },
  });

  const handleCreate = () => {
    if (!name.trim()) return;
    createMutation.mutate({
      companyId: selectedCompanyId,
      name,
      phone,
      email,
      address,
      tax_number: taxNumber,
      tax_office: taxOffice,
      notes,
    });
  };

  const filtered = customers.filter((item: any) => {
    return !search ||
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.email?.toLowerCase().includes(search.toLowerCase()) ||
      item.phone?.toLowerCase().includes(search.toLowerCase());
  });

  const searchBg = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
  const searchBorder = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={styles.container}>
      <MovingBackground />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: c.text }]}>Müşteriler</Text>
        <Text style={[styles.count, { color: c.textSecondary }]}>{customers.length} müşteri</Text>
      </View>

      {/* Searchbar */}
      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Müşteri, şirket veya e-posta ara..."
          value={search}
          onChangeText={setSearch}
          style={[styles.searchBar, { backgroundColor: searchBg, borderColor: searchBorder }]}
          inputStyle={[styles.searchInput, { color: c.text }]}
          placeholderTextColor={c.textSecondary}
          iconColor={c.textSecondary}
        />
      </View>
      <View style={{ height: 1, backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)' }} />

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
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={c.primary} />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 30).duration(300)} style={styles.cardContainer}>
              <GlassCard intensity={30} style={styles.cardGlass} isListRow={true}>
                <View style={styles.cardInner}>
                  <View style={[styles.iconBox, { backgroundColor: c.primary + '15' }]}>
                    <Ionicons name="business-outline" size={22} color={c.primary} />
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.cardTitle, { color: c.text }]}>{item.name || 'Müşteri Ünvanı Belirtilmemiş'}</Text>
                    
                    <View style={styles.contactRow}>
                      {item.phone ? (
                        <View style={styles.contactItem}>
                          <Ionicons name="call-outline" size={13} color={c.textSecondary} />
                          <Text style={[styles.contactText, { color: c.textSecondary }]}>{item.phone}</Text>
                        </View>
                      ) : null}
                      {item.email ? (
                        <View style={styles.contactItem}>
                          <Ionicons name="mail-outline" size={13} color={c.textSecondary} />
                          <Text style={[styles.contactText, { color: c.textSecondary }]}>{item.email}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="stats-chart-outline" size={11} color={c.textTertiary} />
                        <Text style={[styles.metaText, { color: c.textTertiary }]}>Hacim: {formatCurrency(item.total_volume)}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="briefcase-outline" size={11} color={c.textTertiary} />
                        <Text style={[styles.metaText, { color: c.textTertiary }]}>{item.work_count || 0} iş</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.right}>
                    <View style={[styles.statusBadge, { backgroundColor: (item.total_receivable > 0 ? c.warning : c.success) + '15' }]}>
                      <View style={[styles.statusDot, { backgroundColor: item.total_receivable > 0 ? c.warning : c.success }]} />
                      <Text style={[styles.statusText, { color: item.total_receivable > 0 ? c.warning : c.success }]}>
                        {item.total_receivable > 0 ? formatCurrency(item.total_receivable) : 'Borçsuz'}
                      </Text>
                    </View>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={c.textTertiary} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                {search ? 'Sonuç bulunamadı.' : 'Müşteri bulunamadı.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Add Customer Modal */}
      <GlassModal visible={isModalVisible} onDismiss={() => setIsModalVisible(false)}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni Müşteri Ekle</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <GlassInput
                label="Müşteri Adı / Ünvanı"
                value={name}
                onChangeText={setName}
                placeholder="örn: Ahmet Yılmaz veya Kontrol A.Ş."
              />
              <GlassInput
                label="Telefon"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="(5XX) XXX XX XX"
              />
              <GlassInput
                label="E-Posta"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                placeholder="ornek@firma.com"
                autoCapitalize="none"
              />
              <GlassInput
                label="Vergi Numarası / T.C. Kimlik"
                value={taxNumber}
                onChangeText={setTaxNumber}
                keyboardType="numeric"
                placeholder="Vergi No veya TCKN"
              />
              <GlassInput
                label="Vergi Dairesi"
                value={taxOffice}
                onChangeText={setTaxOffice}
                placeholder="Vergi Dairesi"
              />
              <GlassInput
                label="Açık Adres"
                value={address}
                onChangeText={setAddress}
                placeholder="Müşteri açık adresi..."
                multiline
              />
              <GlassInput
                label="Notlar"
                value={notes}
                onChangeText={setNotes}
                placeholder="Özel notlar..."
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
                disabled={createMutation.isPending || !name.trim()}
                buttonColor={c.primary}
                textColor="#ffffff"
              >
                Kaydet
              </Button>
            </View>
          </GlassModal>

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
  listContent: { paddingHorizontal: 0, paddingBottom: 100 },
  cardContainer: {
    marginBottom: 0,
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
  contactRow: { flexDirection: 'row', gap: 12, marginTop: 4, flexWrap: 'wrap' },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactText: { fontSize: 12 },
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
});
