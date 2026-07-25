import { useCallback, useState } from 'react';
import GlassModal from '../../components/ui/GlassModal';
import GlassIconButton from '../../components/ui/GlassIconButton';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useColorScheme,
  Pressable,
  Platform,
  TextInput,
} from 'react-native';
import { Text } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { dashboardService, vehicleService, employeeService, customerService, financeService, workService } from '../../services/dataServices';
import { formatCurrency, formatDate, formatRelativeDate } from '../../utils/format';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';

function StatCard({ icon, label, value, color, delay, c, colorScheme }: any) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.statCard}>
      <GlassCard intensity={45} style={styles.statCardGlass}>
        <View style={[styles.statIconBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : color + '18' }]}>
          <Ionicons name={icon} size={22} color={colorScheme === 'dark' ? '#FFFFFF' : color} />
        </View>
        <Text style={[styles.statValue, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>{label}</Text>
      </GlassCard>
    </Animated.View>
  );
}

function EventCard({ event, c, colorScheme }: any) {
  const iconMap: Record<string, string> = {
    inspection: 'shield-checkmark',
    insurance: 'document-text',
    maintenance: 'build',
    employee_document: 'person',
    finance_check: 'card',
  };

  const daysLeft = Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysLeft < 0;

  return (
    <GlassCard intensity={45} style={styles.carouselEventCard}>
      <View style={styles.carouselCardHeader}>
        <View style={[styles.carouselIconBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)' }]}>
          <Ionicons
            name={(iconMap[event.eventType] as any) || 'calendar'}
            size={18}
            color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
          />
        </View>
        <View style={[
          styles.daysBadge,
          { backgroundColor: isOverdue ? 'rgba(255, 69, 58, 0.18)' : 'rgba(255, 159, 10, 0.18)' }
        ]}>
          <Text style={[styles.daysBadgeText, { color: isOverdue ? '#FF453A' : '#FF9F0A' }]}>
            {formatRelativeDate(event.date)}
          </Text>
        </View>
      </View>

      <Text style={[styles.carouselTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]} numberOfLines={1}>
        {event.type}
      </Text>
      <Text style={[styles.carouselSubtitle, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]} numberOfLines={1}>
        {event.plate || event.employeeName || event.description || 'Detay Yok'}
      </Text>

      <View style={styles.carouselFooter}>
        <Ionicons name="calendar-outline" size={13} color={colorScheme === 'dark' ? '#64748B' : c.textTertiary} />
        <Text style={[styles.carouselDateText, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>
          {formatDate(event.date)}
        </Text>
      </View>
    </GlassCard>
  );
}

function normalizeStr(str: any): string {
  if (!str) return '';
  return String(str)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/Ğ/g, 'ğ')
    .replace(/Ü/g, 'ü')
    .replace(/Ş/g, 'ş')
    .replace(/Ö/g, 'ö')
    .replace(/Ç/g, 'ç')
    .toLowerCase();
}

function extractList(queryResult: any): any[] {
  if (!queryResult) return [];
  if (Array.isArray(queryResult)) return queryResult;
  if (Array.isArray(queryResult.data)) return queryResult.data;
  if (Array.isArray(queryResult.vehicles)) return queryResult.vehicles;
  if (Array.isArray(queryResult.employees)) return queryResult.employees;
  if (Array.isArray(queryResult.customers)) return queryResult.customers;
  if (Array.isArray(queryResult.works)) return queryResult.works;
  return [];
}

export default function DashboardScreen() {
  const router = useRouter();
  const { themeMode } = useThemeStore();
  const colorScheme = themeMode;
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { selectedCompanyId, companies, setSelectedCompany, user } = useAuthStore();

  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isAllEventsModalOpen, setIsAllEventsModalOpen] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState('');

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats', selectedCompanyId],
    queryFn: () => dashboardService.getStats(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5000,
  });

  const upcomingQuery = useQuery({
    queryKey: ['dashboard-upcoming', selectedCompanyId],
    queryFn: () => dashboardService.getUpcoming(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5000,
  });

  // Queries for Global Search across all entities
  const vehiclesQuery = useQuery({
    queryKey: ['global-search-vehicles', selectedCompanyId],
    queryFn: () => vehicleService.getAll(selectedCompanyId!),
    enabled: !!selectedCompanyId && isSearchModalOpen,
  });

  const employeesQuery = useQuery({
    queryKey: ['global-search-employees', selectedCompanyId],
    queryFn: () => employeeService.getAll(selectedCompanyId!),
    enabled: !!selectedCompanyId && isSearchModalOpen,
  });

  const customersQuery = useQuery({
    queryKey: ['global-search-customers', selectedCompanyId],
    queryFn: () => customerService.getAll(selectedCompanyId!),
    enabled: !!selectedCompanyId && isSearchModalOpen,
  });

  const worksQuery = useQuery({
    queryKey: ['global-search-works', selectedCompanyId],
    queryFn: () => workService.getAll(selectedCompanyId!),
    enabled: !!selectedCompanyId && isSearchModalOpen,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([statsQuery.refetch(), upcomingQuery.refetch()]);
    setIsRefreshing(false);
  }, []);

  const stats = statsQuery.data?.data;
  const events = upcomingQuery.data?.data || [];
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const totalVehicles = stats?.totalVehicles || 0;
  const activeVehicles = stats?.activeVehicles || 0;

  // Comprehensive Normalized Search Results (Only active when user types a query)
  const nq = normalizeStr(globalSearchQuery.trim());

  const searchVehicles = !nq ? [] : extractList(vehiclesQuery.data).filter((v: any) =>
    normalizeStr(v.plate).includes(nq) ||
    normalizeStr(v.brand).includes(nq) ||
    normalizeStr(v.model).includes(nq) ||
    normalizeStr(v.chassis_no).includes(nq)
  );

  const searchEmployees = !nq ? [] : extractList(employeesQuery.data).filter((e: any) =>
    normalizeStr(e.first_name).includes(nq) ||
    normalizeStr(e.last_name).includes(nq) ||
    normalizeStr(e.position).includes(nq) ||
    normalizeStr(e.department).includes(nq) ||
    normalizeStr(e.phone).includes(nq)
  );

  const searchCustomers = !nq ? [] : extractList(customersQuery.data).filter((cust: any) =>
    normalizeStr(cust.name).includes(nq) ||
    normalizeStr(cust.contact_person).includes(nq) ||
    normalizeStr(cust.phone).includes(nq)
  );

  const searchWorks = !nq ? [] : extractList(worksQuery.data).filter((w: any) =>
    normalizeStr(w.title).includes(nq) ||
    normalizeStr(w.customer_name).includes(nq) ||
    normalizeStr(w.location).includes(nq)
  );

  // Filtered all events
  const eq = normalizeStr(eventSearchQuery.trim());
  const filteredEvents = events.filter((ev: any) =>
    !eq ||
    normalizeStr(ev.type).includes(eq) ||
    normalizeStr(ev.plate).includes(eq) ||
    normalizeStr(ev.employeeName).includes(eq) ||
    normalizeStr(ev.description).includes(eq)
  );

  return (
    <View style={styles.container}>
      <MovingBackground />

      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>
              Hoş geldin 👋
            </Text>
            <Text style={[styles.userName, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]} numberOfLines={1}>
              {user?.full_name || user?.username || 'Kullanıcı'}
            </Text>
          </View>

          {/* Glass Company Selector Pill */}
          <Pressable
            onPress={() => setCompanyModalVisible(true)}
            style={[
              styles.companySelectorPill,
              {
                borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)',
                backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
              }
            ]}
          >
            <View style={styles.companySelectorInner}>
              <View style={[styles.companyIconDot, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)' }]}>
                <Ionicons name="business" size={14} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
              </View>
              <Text style={[styles.companySelectorText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000', fontWeight: '700' }]} numberOfLines={1}>
                {selectedCompany?.name || 'Şirket Seç'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'} />
            </View>
          </Pressable>
        </View>

        {/* Global Search Bar Input */}
        <Pressable
          onPress={() => setIsSearchModalOpen(true)}
          style={[
            styles.globalSearchBar,
            {
              backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
              borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)',
            }
          ]}
        >
          <Ionicons name="search" size={18} color={colorScheme === 'dark' ? '#94A3B8' : c.textSecondary} />
          <Text style={[styles.globalSearchText, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>
            Tüm projede ara (Plaka, Personel, Cari, İş)...
          </Text>
        </Pressable>
      </View>

      {/* Global Search Bottom Sheet Modal */}
      <GlassModal visible={isSearchModalOpen} onDismiss={() => setIsSearchModalOpen(false)}>
        <View style={styles.modalHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.modalTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>Tüm Projede Arama</Text>
            <Text style={{ fontSize: 13, color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary, marginTop: 2 }}>Araç, Personel, Cari ve İşlerde anlık arayın</Text>
          </View>
          <GlassIconButton icon="close" size={36} iconSize={18} onPress={() => setIsSearchModalOpen(false)} />
        </View>

        {/* Search TextInput */}
        <View style={[styles.searchInputContainer, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
          <Ionicons name="search" size={18} color={colorScheme === 'dark' ? '#94A3B8' : c.textSecondary} />
          <TextInput
            value={globalSearchQuery}
            onChangeText={setGlobalSearchQuery}
            placeholder="Arama yapın (örn: 34, Ahmet, ABC Ltd)..."
            placeholderTextColor={colorScheme === 'dark' ? '#64748B' : c.textTertiary}
            style={[styles.modalTextInput, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}
            autoFocus
          />
          {globalSearchQuery.length > 0 && (
            <Pressable onPress={() => setGlobalSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colorScheme === 'dark' ? '#94A3B8' : c.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Search Results List */}
        <ScrollView style={{ maxHeight: 420, marginTop: 12 }} showsVerticalScrollIndicator={false}>
          {!nq ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 45, gap: 10 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="search-outline" size={26} color={colorScheme === 'dark' ? '#94A3B8' : c.textSecondary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colorScheme === 'dark' ? '#FFFFFF' : c.text }}>
                Aramaya Başlayın
              </Text>
              <Text style={{ fontSize: 13, color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary, textAlign: 'center', maxWidth: 260, lineHeight: 18 }}>
                Plaka, Personel adı, Müşteri unvanı veya Saha işi yazarak anında sonuç alın.
              </Text>
            </View>
          ) : (
            <>
              {/* Vehicles Section */}
              {searchVehicles.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={[styles.searchSectionHeader, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>🚗 Araçlar ({searchVehicles.length})</Text>
                  {searchVehicles.slice(0, 5).map((v: any) => (
                    <Pressable
                      key={`v-${v.id}`}
                      style={styles.searchResultRow}
                      onPress={() => {
                        setIsSearchModalOpen(false);
                        router.push('/(tabs)/vehicles-list');
                      }}
                    >
                      <Ionicons name="car-outline" size={18} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                      <Text style={[styles.searchResultText, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>{v.plate} - {v.brand} {v.model}</Text>
                      <Ionicons name="chevron-forward" size={14} color={colorScheme === 'dark' ? '#64748B' : c.textSecondary} />
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Employees Section */}
              {searchEmployees.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={[styles.searchSectionHeader, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>👤 Personeller ({searchEmployees.length})</Text>
                  {searchEmployees.slice(0, 5).map((emp: any) => (
                    <Pressable
                      key={`e-${emp.id}`}
                      style={styles.searchResultRow}
                      onPress={() => {
                        setIsSearchModalOpen(false);
                        router.push('/(tabs)/employees-list');
                      }}
                    >
                      <Ionicons name="person-outline" size={18} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                      <Text style={[styles.searchResultText, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>{emp.first_name} {emp.last_name} ({emp.position || 'Personel'})</Text>
                      <Ionicons name="chevron-forward" size={14} color={colorScheme === 'dark' ? '#64748B' : c.textSecondary} />
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Customers Section */}
              {searchCustomers.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={[styles.searchSectionHeader, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>🏢 Müşteri Carileri ({searchCustomers.length})</Text>
                  {searchCustomers.slice(0, 5).map((cust: any) => (
                    <Pressable
                      key={`c-${cust.id}`}
                      style={styles.searchResultRow}
                      onPress={() => {
                        setIsSearchModalOpen(false);
                        router.push('/(tabs)/customers');
                      }}
                    >
                      <Ionicons name="business-outline" size={18} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                      <Text style={[styles.searchResultText, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>{cust.name}</Text>
                      <Ionicons name="chevron-forward" size={14} color={colorScheme === 'dark' ? '#64748B' : c.textSecondary} />
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Works Section */}
              {searchWorks.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={[styles.searchSectionHeader, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>🔨 Saha İşleri ({searchWorks.length})</Text>
                  {searchWorks.slice(0, 5).map((w: any) => (
                    <Pressable
                      key={`w-${w.id}`}
                      style={styles.searchResultRow}
                      onPress={() => {
                        setIsSearchModalOpen(false);
                        router.push('/(tabs)/works');
                      }}
                    >
                      <Ionicons name="briefcase-outline" size={18} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                      <Text style={[styles.searchResultText, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>{w.title || w.customer_name}</Text>
                      <Ionicons name="chevron-forward" size={14} color={colorScheme === 'dark' ? '#64748B' : c.textSecondary} />
                    </Pressable>
                  ))}
                </View>
              )}

              {searchVehicles.length === 0 && searchEmployees.length === 0 && searchCustomers.length === 0 && searchWorks.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 35 }}>
                  <Ionicons name="alert-circle-outline" size={36} color={colorScheme === 'dark' ? '#64748B' : c.textSecondary} />
                  <Text style={{ fontSize: 14, color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary, marginTop: 8 }}>Eşleşen kayıt bulunamadı</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </GlassModal>

      {/* Company Selector Bottom Sheet */}
      <GlassModal visible={companyModalVisible} onDismiss={() => setCompanyModalVisible(false)}>
        <View style={styles.modalHeaderRow}>
          <View>
            <Text style={[styles.modalTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>Şirket Seçin</Text>
            <Text style={{ fontSize: 13, color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary, marginTop: 2 }}>İşlem yapacağınız aktif şirketi belirleyin</Text>
          </View>
          <GlassIconButton icon="close" size={36} iconSize={18} onPress={() => setCompanyModalVisible(false)} />
        </View>

        {/* Company List */}
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          {companies.map((company) => {
            const isSelected = company.id === selectedCompanyId;
            return (
              <Pressable
                key={company.id}
                onPress={() => {
                  setSelectedCompany(company.id);
                  setCompanyModalVisible(false);
                }}
                style={[
                  styles.companyOption,
                  {
                    backgroundColor: isSelected
                      ? (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)')
                      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)'),
                    borderColor: isSelected
                      ? (colorScheme === 'dark' ? '#FFFFFF' : '#000000')
                      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
                    borderWidth: isSelected ? 1.5 : 1,
                  }
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                  <View style={[
                    styles.compIconBox,
                    {
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: isSelected
                        ? (colorScheme === 'dark' ? '#FFFFFF' : '#000000')
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)')
                    }
                  ]}>
                    <Ionicons
                      name="business"
                      size={18}
                      color={isSelected ? (colorScheme === 'dark' ? '#000000' : '#FFFFFF') : (colorScheme === 'dark' ? '#94A3B8' : c.textSecondary)}
                    />
                  </View>
                  <Text
                    style={[
                      styles.companyOptionText,
                      {
                        color: colorScheme === 'dark' ? '#FFFFFF' : c.text,
                        fontWeight: isSelected ? '700' : '500',
                        fontSize: 15,
                        flex: 1,
                      }
                    ]}
                    numberOfLines={1}
                  >
                    {company.name}
                  </Text>
                </View>
                {isSelected ? (
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark" size={14} color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} />
                  </View>
                ) : (
                  <Ionicons name="ellipse-outline" size={20} color={colorScheme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </GlassModal>

      {/* Tüm Etkinlikler Full Sheet Modal */}
      <GlassModal visible={isAllEventsModalOpen} onDismiss={() => setIsAllEventsModalOpen(false)}>
        <View style={styles.modalHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.modalTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>Tüm Yaklaşan Etkinlikler</Text>
            <Text style={{ fontSize: 13, color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary, marginTop: 2 }}>{events.length} adet muayene, sigorta ve servis takibi</Text>
          </View>
          <GlassIconButton icon="close" size={36} iconSize={18} onPress={() => setIsAllEventsModalOpen(false)} />
        </View>

        {/* Filter Input inside Modal */}
        <View style={[styles.searchInputContainer, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
          <Ionicons name="filter" size={18} color={colorScheme === 'dark' ? '#94A3B8' : c.textSecondary} />
          <TextInput
            value={eventSearchQuery}
            onChangeText={setEventSearchQuery}
            placeholder="Etkinlikler içinde filtreleyin..."
            placeholderTextColor={colorScheme === 'dark' ? '#64748B' : c.textTertiary}
            style={[styles.modalTextInput, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}
          />
        </View>

        <ScrollView style={{ maxHeight: 440, marginTop: 12 }} showsVerticalScrollIndicator={false}>
          {filteredEvents.map((event: any, index: number) => {
            const daysLeft = Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const isOverdue = daysLeft < 0;

            return (
              <View key={`all-ev-${event.eventType}-${event.id}-${index}`} style={[styles.allEventRow, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                <View style={[styles.timelineIconDot, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                  <Ionicons name="calendar" size={16} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.timelineTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>
                    {event.type}
                  </Text>
                  <Text style={[styles.timelineSubText, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>
                    {event.plate || event.employeeName || event.description || 'Detay Yok'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isOverdue ? '#FF453A' : '#FF9F0A' }}>
                    {formatRelativeDate(event.date)}
                  </Text>
                  <Text style={{ fontSize: 11, color: colorScheme === 'dark' ? '#64748B' : c.textTertiary, marginTop: 2 }}>
                    {formatDate(event.date)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </GlassModal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={c.primary} />
        }
      >
        {/* 1. Dengeli 2'li Modül Metrik Kartı (Filo & Personel) */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <GlassCard intensity={45} style={styles.twoColHeroCard}>
            <View style={styles.twoColMetricsRow}>
              {/* Col 1: Filo */}
              <Pressable style={styles.twoColMetricCol} onPress={() => router.push('/(tabs)/vehicles-list')}>
                <View style={[styles.twoColIconBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]}>
                  <Ionicons name="car" size={22} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.twoColLabelText, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>Aktif Filo Gücü</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                    <Text style={[styles.twoColBigValText, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>
                      {activeVehicles}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }}>
                      / {totalVehicles} Araç
                    </Text>
                  </View>
                </View>
              </Pressable>

              <View style={[styles.twoColDivider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />

              {/* Col 2: Personel */}
              <Pressable style={styles.twoColMetricCol} onPress={() => router.push('/(tabs)/employees-list')}>
                <View style={[styles.twoColIconBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]}>
                  <Ionicons name="people" size={22} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.twoColLabelText, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>Toplam Personel</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                    <Text style={[styles.twoColBigValText, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>
                      {stats?.totalEmployees ?? '-'}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }}>
                      Çalışan
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>
          </GlassCard>
        </Animated.View>

        {/* 2. Fluid Quick Actions Bar */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ marginTop: 18, marginHorizontal: -16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
            <Pressable style={styles.actionPill} onPress={() => router.push('/(tabs)/vehicles-list')}>
              <Ionicons name="add-circle-outline" size={18} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
              <Text style={[styles.actionPillText, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>Araç Ekle</Text>
            </Pressable>

            <Pressable style={styles.actionPill} onPress={() => router.push('/(tabs)/works')}>
              <Ionicons name="briefcase-outline" size={18} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
              <Text style={[styles.actionPillText, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>Saha İşleri</Text>
            </Pressable>

            <Pressable style={styles.actionPill} onPress={() => router.push('/(tabs)/customers')}>
              <Ionicons name="business-outline" size={18} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
              <Text style={[styles.actionPillText, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>Müşteri Carileri</Text>
            </Pressable>

            <Pressable style={styles.actionPill} onPress={() => router.push('/(tabs)/leaves-list')}>
              <Ionicons name="calendar-number-outline" size={18} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
              <Text style={[styles.actionPillText, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>İzin Talebi</Text>
            </Pressable>

            <Pressable style={styles.actionPill} onPress={() => router.push('/(tabs)/meal-tickets')}>
              <Ionicons name="receipt-outline" size={18} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
              <Text style={[styles.actionPillText, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>Yemek Fişi</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>

        {/* 3. Open Activity Timeline (Yaklaşan Etkinlikler) & Tümünü Gör */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)} style={{ marginTop: 22 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text, marginBottom: 0 }]}>
              Yaklaşan Etkinlikler
            </Text>
            {events.length > 0 && (
              <Pressable onPress={() => setIsAllEventsModalOpen(true)}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }}>
                  Tümünü Gör ({events.length}) ➔
                </Text>
              </Pressable>
            )}
          </View>

          {events.length === 0 ? (
            <GlassCard intensity={35} style={styles.emptyCard}>
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color={colorScheme === 'dark' ? '#94A3B8' : c.textTertiary} />
                <Text style={[styles.emptyText, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>
                  Yaklaşan etkinlik yok
                </Text>
              </View>
            </GlassCard>
          ) : (
            <GlassCard intensity={45} style={styles.timelineGroupContainer}>
              {events.slice(0, 6).map((event: any, index: number) => {
                const daysLeft = Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysLeft < 0;
                const isLast = index === Math.min(events.length, 6) - 1;

                return (
                  <View key={`${event.eventType}-${event.id}-${index}`}>
                    <View style={styles.timelineRow}>
                      <View style={[styles.timelineIconDot, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                        <Ionicons name="calendar" size={16} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.timelineTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>
                          {event.type}
                        </Text>
                        <Text style={[styles.timelineSubText, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>
                          {event.plate || event.employeeName || event.description || 'Detay Yok'}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isOverdue ? '#FF453A' : '#FF9F0A' }}>
                          {formatRelativeDate(event.date)}
                        </Text>
                        <Text style={{ fontSize: 11, color: colorScheme === 'dark' ? '#64748B' : c.textTertiary, marginTop: 2 }}>
                          {formatDate(event.date)}
                        </Text>
                      </View>
                    </View>
                    {!isLast && (
                      <View style={[styles.timelineDivider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                    )}
                  </View>
                );
              })}
            </GlassCard>
          )}
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  greeting: { fontSize: 13, fontWeight: '600' },
  userName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  companySelectorPill: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    maxWidth: 190,
  },
  companySelectorInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  companyIconDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companySelectorText: { fontSize: 13, fontWeight: '700', maxWidth: 110, letterSpacing: -0.1 },
  globalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  globalSearchText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalTextInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchSectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  searchResultText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  compIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginVertical: 4,
  },
  companyOptionText: { fontSize: 15 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 6 },

  // Balanced 2-Column Hero Card (Filo & Personel)
  twoColHeroCard: {
    padding: 16,
    borderRadius: 22,
  },
  twoColMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  twoColMetricCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
  },
  twoColIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoColLabelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  twoColBigValText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  twoColDivider: {
    width: 1,
    height: 38,
    marginHorizontal: 10,
  },

  // Action Pills
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionPillText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Open Activity Timeline
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  seeAllPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  timelineGroupContainer: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  timelineIconDot: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  timelineSubText: {
    fontSize: 12,
    marginTop: 2,
  },
  dateBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timelineDivider: {
    height: 1,
    marginHorizontal: 4,
  },

  // All Events Row
  allEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  emptyCard: {
    paddingVertical: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: { fontSize: 14 },
});
