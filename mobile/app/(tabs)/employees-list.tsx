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
import { employeeService } from '../../services/dataServices';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassDropdown from '../../components/ui/GlassDropdown';
import GlassIconButton from '../../components/ui/GlassIconButton';

export default function EmployeesListScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCompanyId } = useAuthStore();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const params = useLocalSearchParams();
  const queryClient = useQueryClient();

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [tcNo, setTcNo] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [salary, setSalary] = useState('');
  const [iban, setIban] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    if (params.openAdd === 'true') {
      setIsModalVisible(true);
      router.setParams({ openAdd: undefined });
    }
  }, [params.openAdd]);

  const createMutation = useMutation({
    mutationFn: (newEmp: any) => employeeService.create(newEmp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsModalVisible(false);
      // Reset form
      setFirstName('');
      setLastName('');
      setTcNo('');
      setPhone('');
      setEmail('');
      setPosition('');
      setDepartment('');
      setSalary('');
      setIban('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setStatus('active');
    },
  });

  const handleCreate = () => {
    if (!firstName || !lastName) return;
    createMutation.mutate({
      companyId: selectedCompanyId,
      firstName,
      lastName,
      tcNo,
      phone,
      email,
      position,
      department,
      salary: salary ? parseFloat(salary) : undefined,
      iban,
      startDate,
      notes,
      status,
    });
  };

  const query = useQuery({
    queryKey: ['employees', selectedCompanyId],
    queryFn: () => employeeService.getAll(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const employees = query.data?.data || [];

  const departments = [...new Set(employees.map((e: any) => e.department).filter(Boolean))] as string[];

  const filtered = employees.filter((e: any) => {
    const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
    const matchesSearch = !search ||
      fullName.includes(search.toLowerCase()) ||
      e.phone?.toLowerCase().includes(search.toLowerCase()) ||
      e.position?.toLowerCase().includes(search.toLowerCase());
    const matchesDept = !deptFilter || e.department === deptFilter;
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const getInitials = (first: string, last: string) => {
    return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
  };

  const avatarColors = [c.primary, c.secondary, c.tertiary, c.info, c.warning];

  const renderEmployee = useCallback(({ item, index }: { item: any; index: number }) => {
    const avatarColor = avatarColors[index % avatarColors.length];
    return (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(300)} style={styles.cardContainer}>
        <Pressable
          onPress={() => router.push({ pathname: '/employee-detail', params: { id: item.id } })}
        >
          <GlassCard intensity={30} style={styles.employeeCardGlass}>
            <View style={styles.employeeCardInner}>
              <View style={[styles.avatar, { backgroundColor: avatarColor + '18' }]}>
                <Text style={[styles.avatarText, { color: avatarColor }]}>
                  {getInitials(item.first_name, item.last_name)}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: c.text }]}>
                  {item.first_name} {item.last_name}
                </Text>
                <Text style={[styles.position, { color: c.textSecondary }]}>
                  {item.position || 'Pozisyon belirtilmemiş'}
                </Text>
                {item.department && (
                  <View style={[styles.deptBadge, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }]}>
                    <Text style={[styles.deptText, { color: c.textSecondary }]}>{item.department}</Text>
                  </View>
                )}
              </View>
              <View style={styles.right}>
                {item.pending_salaries > 0 && (
                  <View style={[styles.pendingBadge, { backgroundColor: c.warningContainer + '30', borderColor: c.warning, borderWidth: 0.5 }]}>
                    <Ionicons name="cash-outline" size={12} color={c.warning} />
                    <Text style={[styles.pendingText, { color: c.warning }]}>{item.pending_salaries}</Text>
                  </View>
                )}
                {item.phone && (
                  <Text style={[styles.phone, { color: c.textTertiary }]}>{item.phone}</Text>
                )}
              </View>
            </View>
          </GlassCard>
        </Pressable>
      </Animated.View>
    );
  }, [c, router, colorScheme]);

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
            <Text style={[styles.title, { color: c.text }]}>Personel Listesi</Text>
            <Text style={[styles.count, { color: c.textSecondary }]}>{filtered.length} kişi</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <GlassIconButton
              icon="funnel-outline"
              onPress={() => setIsFilterModalVisible(true)}
            />
            <GlassIconButton
              icon="add"
              onPress={() => setIsModalVisible(true)}
            />
          </View>
        </View>

        <View style={styles.searchRow}>
          <Searchbar
            placeholder="Ad, pozisyon veya telefon ara..."
            value={search}
            onChangeText={setSearch}
            style={[styles.searchBar, { backgroundColor: glassBgColor, borderColor: glassBorderColor }]}
            inputStyle={[styles.searchInput, { color: c.text }]}
            placeholderTextColor={c.textTertiary}
            iconColor={c.textSecondary}
          />
        </View>
      </View>

      {/* Employee List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEmployee}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} tintColor={c.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={c.textTertiary} />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              {search ? 'Personel bulunamadı' : 'Henüz personel eklenmemiş'}
            </Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <GlassModal visible={isFilterModalVisible} onDismiss={() => setIsFilterModalVisible(false)}>
        <Text style={[styles.modalTitle, { color: c.text }]}>Filtrele</Text>
        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>

          {/* Department Filter */}
          {departments.length > 0 && (
            <>
              <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 16 }]}>Departman</Text>
              <View style={[styles.filterRow, { flexWrap: 'wrap', gap: 8 }]}>
                <Pressable
                  onPress={() => setDeptFilter(null)}
                  style={{
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 1,
                    paddingHorizontal: 16,
                    backgroundColor: !deptFilter 
                      ? (colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)')
                      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)'),
                    borderColor: !deptFilter 
                      ? c.primary 
                      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ 
                    color: !deptFilter ? c.primary : c.textSecondary, 
                    fontSize: 13,
                    fontWeight: !deptFilter ? '600' : '400'
                  }}>
                    Tümü
                  </Text>
                </Pressable>
                {departments.map((dept) => {
                  const isSelected = deptFilter === dept;
                  return (
                    <Pressable
                      key={dept}
                      onPress={() => setDeptFilter(isSelected ? null : dept)}
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
                        {dept}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Status Filter */}
          <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 16 }]}>Durum</Text>
          <View style={[styles.filterRow, { flexWrap: 'wrap', gap: 8, marginTop: 8 }]}>
            {([
              { label: 'Tümü', value: 'all' },
              { label: 'Aktif', value: 'active' },
              { label: 'Pasif', value: 'inactive' },
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

        </ScrollView>
        <View style={styles.modalButtons}>
          <Button 
            mode="text" 
            onPress={() => {
              setDeptFilter(null);
              setStatusFilter('active');
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

      {/* Add Employee Modal */}
      <GlassModal visible={isModalVisible} onDismiss={() => setIsModalVisible(false)}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni Personel Ekle</Text>
            
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <GlassInput
                label="Ad"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="örn: Ahmet"
              />

              <GlassInput
                label="Soyad"
                value={lastName}
                onChangeText={setLastName}
                placeholder="örn: Yılmaz"
              />

              <GlassInput
                label="T.C. Kimlik No"
                value={tcNo}
                onChangeText={setTcNo}
                keyboardType="numeric"
                maxLength={11}
                placeholder="11 haneli T.C. No"
              />

              <GlassInput
                label="Telefon"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="örn: 05551234567"
              />

              <GlassInput
                label="E-posta"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                placeholder="örn: ahmet@sirket.com"
                autoCapitalize="none"
              />

              <GlassInput
                label="Pozisyon"
                value={position}
                onChangeText={setPosition}
                placeholder="örn: Şoför, Muhasebeci"
              />

              <GlassDropdown
                label="Departman"
                value={department}
                options={[
                  { label: 'Lojistik', value: 'Lojistik' },
                  { label: 'Muhasebe', value: 'Muhasebe' },
                  { label: 'İdari İşler', value: 'İdari İşler' },
                  { label: 'Satış', value: 'Satış' },
                  { label: 'Teknik Servis', value: 'Teknik Servis' },
                  { label: 'Bilgi İşlem', value: 'Bilgi İşlem' },
                  { label: 'Diğer', value: 'Diğer' },
                ]}
                onSelect={setDepartment}
                placeholder="Departman Seçiniz"
              />

              <GlassInput
                label="Maaş (₺)"
                value={salary}
                onChangeText={setSalary}
                keyboardType="numeric"
                placeholder="örn: 30000"
              />

              <GlassInput
                label="IBAN"
                value={iban}
                onChangeText={setIban}
                placeholder="TR00..."
                autoCapitalize="characters"
              />

              <GlassInput
                label="İşe Başlama Tarihi"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
              />

              <GlassDropdown
                label="Durum"
                value={status}
                options={[
                  { label: 'Aktif', value: 'active' },
                  { label: 'Pasif', value: 'passive' },
                ]}
                onSelect={setStatus}
                placeholder="Durum Seçiniz"
              />

              <GlassInput
                label="Notlar"
                value={notes}
                onChangeText={setNotes}
                placeholder="Personel ile ilgili notlar..."
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
                disabled={createMutation.isPending || !firstName || !lastName}
                buttonColor={c.primary}
                textColor="#ffffff"
              >
                Kaydet
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
  chip: { borderRadius: 10 },
  chipText: { fontSize: 12, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 100 },
  cardContainer: {
    marginBottom: 10,
  },

  employeeCardGlass: {
    padding: 0,
  },
  employeeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    gap: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700' },
  position: { fontSize: 13, marginTop: 2 },
  deptBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  deptText: { fontSize: 11, fontWeight: '500' },
  right: { alignItems: 'flex-end', gap: 6 },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pendingText: { fontSize: 11, fontWeight: '600' },
  phone: { fontSize: 11 },
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
