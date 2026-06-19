import { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useColorScheme,
  Pressable,
} from 'react-native';
import { Text, Menu } from 'react-native-paper';
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
  const [menuVisible, setMenuVisible] = useState(false);

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
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Pressable
              onPress={() => setMenuVisible(true)}
              style={[styles.companySelector, { backgroundColor: c.surfaceVariant + '35', borderColor: c.border }]}
            >
              <Ionicons name="business-outline" size={16} color={c.primary} />
              <Text style={[styles.companySelectorText, { color: c.text }]} numberOfLines={1}>
                {selectedCompany?.name || 'Şirket Seç'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={c.textSecondary} />
            </Pressable>
          }
          contentStyle={{ backgroundColor: c.surface }}
        >
          {companies.map((company) => (
            <Menu.Item
              key={company.id}
              onPress={() => {
                setSelectedCompany(company.id);
                setMenuVisible(false);
              }}
              title={company.name}
              titleStyle={{ color: company.id === selectedCompanyId ? c.primary : c.text }}
              leadingIcon={company.id === selectedCompanyId ? 'check' : undefined}
            />
          ))}
        </Menu>
      </View>

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
  companySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 180,
  },
  companySelectorText: { fontSize: 13, fontWeight: '600', maxWidth: 120 },
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
