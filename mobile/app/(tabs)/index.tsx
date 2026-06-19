import { useCallback, useState } from 'react';
import GlassModal from '../../components/ui/GlassModal';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useColorScheme,
  Pressable,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../stores/authStore';
import { dashboardService } from '../../services/dataServices';
import { formatCurrency, formatDate, formatRelativeDate } from '../../utils/format';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';

function StatCard({ icon, label, value, color, delay, c }: any) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.statCard}>
      <GlassCard intensity={45} style={styles.statCardGlass}>
        <View style={[styles.statIconBox, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: c.textSecondary }]}>{label}</Text>
      </GlassCard>
    </Animated.View>
  );
}

function EventCard({ event, c }: any) {
  const iconMap: Record<string, string> = {
    inspection: 'shield-checkmark-outline',
    insurance: 'document-text-outline',
    maintenance: 'build-outline',
    employee_document: 'person-outline',
    finance_check: 'card-outline',
  };
  const colorMap: Record<string, string> = {
    inspection: c.warning,
    insurance: c.info,
    maintenance: c.error,
    employee_document: c.tertiary || '#f472b6',
    finance_check: c.secondary,
  };

  const daysLeft = Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysLeft < 0;

  return (
    <GlassCard intensity={35} style={styles.eventCard}>
      <View style={styles.eventContainer}>
        <View style={[styles.eventIcon, { backgroundColor: (colorMap[event.eventType] || c.primary) + '18' }]}>
          <Ionicons
            name={(iconMap[event.eventType] as any) || 'calendar-outline'}
            size={20}
            color={colorMap[event.eventType] || c.primary}
          />
        </View>
        <View style={styles.eventContent}>
          <Text style={[styles.eventType, { color: c.text }]} numberOfLines={1}>{event.type}</Text>
          <Text style={[styles.eventDetail, { color: c.textSecondary }]} numberOfLines={1}>
            {event.plate || event.employeeName || event.description || ''}
          </Text>
        </View>
        <View style={styles.eventDateBox}>
          <Text style={[styles.eventDate, { color: c.textSecondary }]}>{formatDate(event.date)}</Text>
          <Text style={[styles.eventDays, { color: isOverdue ? c.error : c.warning }]}>
            {formatRelativeDate(event.date)}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

export default function DashboardScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { selectedCompanyId, companies, setSelectedCompany, user } = useAuthStore();
  const [companyModalVisible, setCompanyModalVisible] = useState(false);

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

  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([statsQuery.refetch(), upcomingQuery.refetch()]);
    setIsRefreshing(false);
  }, []);

  const stats = statsQuery.data?.data;
  const events = upcomingQuery.data?.data || [];
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  return (
    <View style={styles.container}>
      <MovingBackground />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={[styles.greeting, { color: c.textSecondary }]}>
            Hoş geldin 👋
          </Text>
          <Text style={[styles.userName, { color: c.text }]}>
            {user?.full_name || user?.username || 'Kullanıcı'}
          </Text>
        </View>

        {/* Glass Company Selector Pill */}
        <Pressable
          onPress={() => setCompanyModalVisible(true)}
          style={[
            styles.companySelectorPill,
            {
              borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)',
              backgroundColor: Platform.OS === 'web'
                ? (colorScheme === 'dark' ? 'rgba(26,26,46,0.7)' : 'rgba(255,255,255,0.7)')
                : (colorScheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.30)'),
            }
          ]}
        >
          {Platform.OS !== 'web' && (
            <BlurView
              intensity={Platform.OS === 'ios' ? 70 : 80}
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={styles.companySelectorInner}>
            <View style={[styles.companyIconDot, { backgroundColor: c.primary + '25' }]}>
              <Ionicons name="business" size={13} color={c.primary} />
            </View>
            <Text style={[styles.companySelectorText, { color: c.text }]} numberOfLines={1}>
              {selectedCompany?.name || 'Şirket Seç'}
            </Text>
            <Ionicons name="chevron-down" size={13} color={c.textSecondary} />
          </View>
        </Pressable>
      </View>

      {/* Company Selector Bottom Sheet */}
      <GlassModal visible={companyModalVisible} onDismiss={() => setCompanyModalVisible(false)}>
            {/* Drag handle */}
            <View style={styles.dragHandle} />

            {/* Modal Header */}
            <View style={styles.companyModalHeader}>
              <View style={[styles.companyModalIconWrap, { backgroundColor: c.primary + '20' }]}>
                <Ionicons name="business" size={22} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.companyModalTitle, { color: c.text }]}>Şirket Seçin</Text>
                <Text style={[styles.companyModalSub, { color: c.textSecondary }]}>
                  {companies.length} şirket mevcut
                </Text>
              </View>
              <Pressable
                onPress={() => setCompanyModalVisible(false)}
                style={[styles.companyModalClose, { backgroundColor: c.surfaceVariant + '40' }]}
              >
                <Ionicons name="close" size={18} color={c.textSecondary} />
              </Pressable>
            </View>

            {/* Divider */}
            <View style={[styles.companyModalDivider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]} />

            {/* Company List */}
            <ScrollView style={styles.companyList} showsVerticalScrollIndicator={false}>
              {companies.map((company, index) => {
                const isSelected = company.id === selectedCompanyId;
                return (
                  <Pressable
                    key={company.id}
                    onPress={() => {
                      setSelectedCompany(company.id);
                      setCompanyModalVisible(false);
                    }}
                    android_ripple={{ color: c.primary + '18' }}
                    style={[
                      styles.companyListItem,
                      isSelected && { backgroundColor: c.primary + '15' },
                      index !== companies.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      },
                    ]}
                  >
                    <View style={[styles.companyListAvatar, { backgroundColor: isSelected ? c.primary + '25' : c.surfaceVariant + '30' }]}>
                      <Ionicons name={isSelected ? 'business' : 'business-outline'} size={18} color={isSelected ? c.primary : c.textSecondary} />
                    </View>
                    <Text style={[
                      styles.companyListName,
                      { color: isSelected ? c.primary : c.text, fontWeight: isSelected ? '700' : '500' }
                    ]}>
                      {company.name}
                    </Text>
                    {isSelected && (
                      <View style={[styles.companyCheckBadge, { backgroundColor: c.primary }]}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      </View>
                    )}
                  </Pressable>
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
        {/* Stat Cards */}
        <View style={styles.statsGrid}>
          <StatCard icon="car" label="Araçlar" value={stats?.totalVehicles ?? '-'} color={c.primary} delay={100} c={c} />
          <StatCard icon="people" label="Personel" value={stats?.totalEmployees ?? '-'} color={c.secondary} delay={200} c={c} />
          <StatCard icon="checkmark-circle" label="Aktif Araç" value={stats?.activeVehicles ?? '-'} color={c.success} delay={300} c={c} />
          <StatCard icon="cash" label="Aylık Gider" value={formatCurrency(stats?.monthlyCost)} color={c.warning} delay={400} c={c} />
        </View>

        {/* Upcoming Events */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            Yaklaşan Etkinlikler
          </Text>
          {events.length === 0 ? (
            <GlassCard intensity={35} style={styles.emptyCard}>
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color={c.textTertiary} />
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                  Yaklaşan etkinlik yok
                </Text>
              </View>
            </GlassCard>
          ) : (
            events.slice(0, 10).map((event: any, index: number) => (
              <EventCard key={`${event.eventType}-${event.id}-${index}`} event={event} c={c} />
            ))
          )}
        </Animated.View>

        {/* Cost Distribution */}
        {stats?.costDistribution && (
          <Animated.View entering={FadeInDown.delay(600).duration(400)} style={{ marginTop: 24 }}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>
              Bu Ay Maliyet Dağılımı
            </Text>
            <GlassCard intensity={35} style={styles.costCard}>
              {[
                { label: 'Servis', value: stats.costDistribution.service, color: c.primary },
                { label: 'Bakım', value: stats.costDistribution.maintenance, color: c.warning },
                { label: 'Muayene', value: stats.costDistribution.inspection, color: c.info },
                { label: 'Sigorta', value: stats.costDistribution.insurance, color: c.secondary },
              ].map((item) => (
                <View key={item.label} style={styles.costRow}>
                  <View style={styles.costLabelRow}>
                    <View style={[styles.costDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.costLabel, { color: c.textSecondary }]}>{item.label}</Text>
                  </View>
                  <Text style={[styles.costValue, { color: c.text }]}>{formatCurrency(item.value)}</Text>
                </View>
              ))}
            </GlassCard>
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: { fontSize: 14 },
  userName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  companySelectorPill: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    maxWidth: 190,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  companySelectorInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  companyIconDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companySelectorText: { fontSize: 13, fontWeight: '700', maxWidth: 110, letterSpacing: -0.1 },
  companyModalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    margin: 0,
    padding: 0,
  },
  companyModalCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: 48,
    padding: 0,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150,150,150,0.35)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  companyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  companyModalIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyModalTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  companyModalSub: { fontSize: 13, marginTop: 1 },
  companyModalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyModalDivider: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 6,
  },
  companyList: {
    maxHeight: 340,
    paddingHorizontal: 12,
  },
  companyListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginVertical: 2,
  },
  companyListAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyListName: { flex: 1, fontSize: 15 },
  companyCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
  },
  statCardGlass: {
    padding: 0, // padding handles inside Content View
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  eventCard: {
    marginBottom: 8,
  },
  eventContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventContent: { flex: 1 },
  eventType: { fontSize: 14, fontWeight: '600' },
  eventDetail: { fontSize: 12, marginTop: 2 },
  eventDateBox: { alignItems: 'flex-end' },
  eventDate: { fontSize: 12 },
  eventDays: { fontSize: 11, fontWeight: '600', marginTop: 2 },
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
  costCard: {
    gap: 12,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  costDot: { width: 10, height: 10, borderRadius: 5 },
  costLabel: { fontSize: 14 },
  costValue: { fontSize: 14, fontWeight: '700' },
});
