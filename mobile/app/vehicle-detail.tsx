import { useState } from 'react';
import GlassModal from '../components/ui/GlassModal';
import {
  View,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Pressable,
  RefreshControl,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Text, ActivityIndicator, IconButton, Divider, Button, Searchbar, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { vehicleService } from '../services/dataServices';
import { formatCurrency, getStatusLabel, formatDate } from '../utils/format';
import MovingBackground from '../components/ui/MovingBackground';
import GlassCard from '../components/ui/GlassCard';
import GlassInput from '../components/ui/GlassInput';
import GlassDropdown from '../components/ui/GlassDropdown';

import { getFileUrl } from '../services/api';

const maintenanceTypes = [
  { value: 'oil', label: 'Yağ Değişimi' },
  { value: 'filter', label: 'Filtre Değişimi' },
  { value: 'brake', label: 'Fren Bakımı' },
  { value: 'tire', label: 'Lastik Değişimi' },
  { value: 'battery', label: 'Akü Değişimi' },
  { value: 'general', label: 'Genel Bakım' },
  { value: 'repair', label: 'Onarım' },
  { value: 'other', label: 'Diğer' }
];

const insuranceTypes = [
  { value: 'kasko', label: 'Kasko' },
  { value: 'traffic', label: 'Trafik Sigortası' },
  { value: 'full', label: 'Tam Paket' },
  { value: 'other', label: 'Diğer' }
];

const serviceTypes = [
  { value: 'maintenance', label: 'Periyodik Bakım' },
  { value: 'repair', label: 'Mekanik Tamir' },
  { value: 'tire', label: 'Lastik İşlemleri' },
  { value: 'body', label: 'Kaporta/Boya' },
  { value: 'electrical', label: 'Elektrik/Elektronik' },
  { value: 'glass', label: 'Cam Değişimi' },
  { value: 'ac', label: 'Klima Bakımı' },
  { value: 'other', label: 'Diğer' }
];

const resultOptions = [
  { value: 'passed', label: 'Geçti' },
  { value: 'failed', label: 'Kaldı' },
  { value: 'conditional', label: 'Şartlı Geçti' }
];

type TabValue = 'details' | 'maintenances' | 'inspections' | 'insurances' | 'services' | 'assignments' | 'documents';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const glassBgColor = Platform.OS === 'web'
    ? (colorScheme === 'dark' ? 'rgba(30, 30, 40, 0.65)' : 'rgba(255, 255, 255, 0.65)')
    : (colorScheme === 'dark' ? 'rgba(30, 30, 40, 0.55)' : 'rgba(255, 255, 255, 0.45)');
  const glassBorderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.5)';

  const [activeTab, setActiveTab] = useState<TabValue>('details');

  // Search states for detail page tabs
  const [maintSearch, setMaintSearch] = useState('');
  const [inspSearch, setInspSearch] = useState('');
  const [insSearch, setInsSearch] = useState('');
  const [servSearch, setServSearch] = useState('');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [docSearch, setDocSearch] = useState('');

  // Filter states
  const [maintTypeFilter, setMaintTypeFilter] = useState<string | null>(null);
  const [inspResultFilter, setInspResultFilter] = useState<string | null>(null);
  const [insTypeFilter, setInsTypeFilter] = useState<string | null>(null);
  const [servTypeFilter, setServTypeFilter] = useState<string | null>(null);
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<string | null>(null);

  // Filter modal visibilities
  const [isMaintFilterVisible, setIsMaintFilterVisible] = useState(false);
  const [isInspFilterVisible, setIsInspFilterVisible] = useState(false);
  const [isInsFilterVisible, setIsInsFilterVisible] = useState(false);
  const [isServFilterVisible, setIsServFilterVisible] = useState(false);
  const [isAssignmentFilterVisible, setIsAssignmentFilterVisible] = useState(false);

  const vehicleId = parseInt(id);

  // Queries
  const vehicleQuery = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => vehicleService.getById(vehicleId),
    enabled: !!vehicleId,
  });

  const maintenanceQuery = useQuery({
    queryKey: ['vehicle-maintenances', vehicleId],
    queryFn: () => vehicleService.getMaintenances(vehicleId),
    enabled: !!vehicleId && activeTab === 'maintenances',
  });

  const inspectionQuery = useQuery({
    queryKey: ['vehicle-inspections', vehicleId],
    queryFn: () => vehicleService.getInspections(vehicleId),
    enabled: !!vehicleId && activeTab === 'inspections',
  });

  const insuranceQuery = useQuery({
    queryKey: ['vehicle-insurances', vehicleId],
    queryFn: () => vehicleService.getInsurances(vehicleId),
    enabled: !!vehicleId && activeTab === 'insurances',
  });

  const servicesQuery = useQuery({
    queryKey: ['vehicle-services', vehicleId],
    queryFn: () => vehicleService.getServices(vehicleId),
    enabled: !!vehicleId && activeTab === 'services',
  });

  const assignmentsQuery = useQuery({
    queryKey: ['vehicle-assignments', vehicleId],
    queryFn: () => vehicleService.getAssignments(vehicleId),
    enabled: !!vehicleId && activeTab === 'assignments',
  });

  const documentsQuery = useQuery({
    queryKey: ['vehicle-documents', vehicleId],
    queryFn: () => vehicleService.getDocuments(vehicleId),
    enabled: !!vehicleId && activeTab === 'documents',
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: () => vehicleService.delete(vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      router.back();
    },
  });

  // Modal State
  const [activeModal, setActiveModal] = useState<'maintenance' | 'inspection' | 'insurance' | 'service' | null>(null);

  // Common fields
  const [desc, setDesc] = useState('');
  const [cost, setCost] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Maintenance fields
  const [maintType, setMaintType] = useState('Periyodik Bakım');
  const [maintNextKm, setMaintNextKm] = useState('');
  const [maintNextDate, setMaintNextDate] = useState('');

  // Inspection fields
  const [inspType, setInspType] = useState('Muayene');
  const [inspResult, setInspResult] = useState('Geçti');
  const [inspExpiryDate, setInspExpiryDate] = useState('');

  // Insurance fields
  const [insCompany, setInsCompany] = useState('');
  const [insPolicyNo, setInsPolicyNo] = useState('');
  const [insType, setInsType] = useState('Kasko');
  const [insEndDate, setInsEndDate] = useState('');

  // Service fields
  const [servType, setServType] = useState('Onarım');
  const [servKm, setServKm] = useState('');

  const resetForm = () => {
    setDesc('');
    setCost('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setMaintType('Periyodik Bakım');
    setMaintNextKm('');
    setMaintNextDate('');
    setInspType('Muayene');
    setInspResult('Geçti');
    setInspExpiryDate('');
    setInsCompany('');
    setInsPolicyNo('');
    setInsType('Kasko');
    setInsEndDate('');
    setServType('Onarım');
    setServKm('');
  };

  // Maintenance Mutation
  const createMaintenanceMutation = useMutation({
    mutationFn: (data: any) => vehicleService.createMaintenance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenances', vehicleId] });
      setActiveModal(null);
      resetForm();
    },
  });

  // Inspection Mutation
  const createInspectionMutation = useMutation({
    mutationFn: (data: any) => vehicleService.createInspection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-inspections', vehicleId] });
      setActiveModal(null);
      resetForm();
    },
  });

  // Insurance Mutation
  const createInsuranceMutation = useMutation({
    mutationFn: (data: any) => vehicleService.createInsurance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances', vehicleId] });
      setActiveModal(null);
      resetForm();
    },
  });

  // Service Mutation
  const createServiceMutation = useMutation({
    mutationFn: (data: any) => vehicleService.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-services', vehicleId] });
      setActiveModal(null);
      resetForm();
    },
  });

  const handleCreateMaintenance = () => {
    createMaintenanceMutation.mutate({
      vehicleId,
      type: maintType,
      description: desc,
      date,
      cost: cost ? parseFloat(cost) : 0,
      nextKm: maintNextKm ? parseInt(maintNextKm) : undefined,
      nextDate: maintNextDate || undefined,
      notes,
    });
  };

  const handleCreateInspection = () => {
    createInspectionMutation.mutate({
      vehicleId,
      type: inspType,
      date,
      validUntil: inspExpiryDate || undefined,
      result: inspResult,
      cost: cost ? parseFloat(cost) : 0,
      notes,
    });
  };

  const handleCreateInsurance = () => {
    createInsuranceMutation.mutate({
      vehicleId,
      company: insCompany,
      policyNo: insPolicyNo,
      type: insType,
      startDate: date,
      endDate: insEndDate || undefined,
      premium: cost ? parseFloat(cost) : 0,
      notes,
    });
  };

  const handleCreateService = () => {
    createServiceMutation.mutate({
      vehicleId,
      type: servType,
      description: desc,
      date,
      cost: cost ? parseFloat(cost) : 0,
      km: servKm ? parseInt(servKm) : undefined,
      notes,
    });
  };

  const vehicle = vehicleQuery.data?.data;

  // Filtered lists
  const filteredMaintenances = (maintenanceQuery.data?.data || []).filter((m: any) => {
    const matchesSearch = 
      (m.description || '').toLowerCase().includes(maintSearch.toLowerCase()) ||
      (m.notes || '').toLowerCase().includes(maintSearch.toLowerCase()) ||
      (m.type || '').toLowerCase().includes(maintSearch.toLowerCase());
    const maintLabel = maintenanceTypes.find(t => t.value === maintTypeFilter)?.label;
    const matchesFilter = maintTypeFilter 
      ? (m.type === maintTypeFilter || m.type === maintLabel) 
      : true;
    return matchesSearch && matchesFilter;
  });

  const filteredInspections = (inspectionQuery.data?.data || []).filter((i: any) => {
    const matchesSearch = 
      (i.type || '').toLowerCase().includes(inspSearch.toLowerCase()) ||
      (i.result || '').toLowerCase().includes(inspSearch.toLowerCase()) ||
      (i.notes || '').toLowerCase().includes(inspSearch.toLowerCase());
    const resultLabel = resultOptions.find(t => t.value === inspResultFilter)?.label;
    const matchesFilter = inspResultFilter 
      ? (i.result === inspResultFilter || i.result === resultLabel) 
      : true;
    return matchesSearch && matchesFilter;
  });

  const filteredInsurances = (insuranceQuery.data?.data || []).filter((ins: any) => {
    const matchesSearch = 
      (ins.company || '').toLowerCase().includes(insSearch.toLowerCase()) ||
      (ins.policy_no || '').toLowerCase().includes(insSearch.toLowerCase()) ||
      (ins.type || '').toLowerCase().includes(insSearch.toLowerCase()) ||
      (ins.notes || '').toLowerCase().includes(insSearch.toLowerCase());
    const insLabel = insuranceTypes.find(t => t.value === insTypeFilter)?.label;
    const matchesFilter = insTypeFilter 
      ? (ins.type === insTypeFilter || ins.type === insLabel) 
      : true;
    return matchesSearch && matchesFilter;
  });

  const filteredServices = (servicesQuery.data?.data || []).filter((s: any) => {
    const matchesSearch = 
      (s.description || '').toLowerCase().includes(servSearch.toLowerCase()) ||
      (s.type || '').toLowerCase().includes(servSearch.toLowerCase()) ||
      (s.notes || '').toLowerCase().includes(servSearch.toLowerCase());
    const servLabel = serviceTypes.find(t => t.value === servTypeFilter)?.label;
    const matchesFilter = servTypeFilter 
      ? (s.type === servTypeFilter || s.type === servLabel) 
      : true;
    return matchesSearch && matchesFilter;
  });

  const filteredAssignments = (assignmentsQuery.data?.data || []).filter((a: any) => {
    const matchesSearch = 
      (a.item_name || '').toLowerCase().includes(assignmentSearch.toLowerCase()) ||
      (a.assigned_to || '').toLowerCase().includes(assignmentSearch.toLowerCase()) ||
      (a.notes || '').toLowerCase().includes(assignmentSearch.toLowerCase()) ||
      (a.department || '').toLowerCase().includes(assignmentSearch.toLowerCase());
    const isReturned = a.end_date !== null;
    const matchesFilter = 
      assignmentStatusFilter === 'returned' ? isReturned :
      assignmentStatusFilter === 'active' ? !isReturned : true;
    return matchesSearch && matchesFilter;
  });

  const filteredDocuments = (documentsQuery.data?.data || []).filter((d: any) => {
    return (
      (d.file_name || '').toLowerCase().includes(docSearch.toLowerCase()) ||
      (d.category || '').toLowerCase().includes(docSearch.toLowerCase()) ||
      (d.folder || '').toLowerCase().includes(docSearch.toLowerCase())
    );
  });

  const handleConfirmDelete = () => {
    Alert.alert('Aracı Sil', 'Bu aracı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  if (vehicleQuery.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={{ color: c.text }}>Araç bulunamadı.</Text>
        <IconButton icon="arrow-left" onPress={() => router.back()} iconColor={c.text} />
      </View>
    );
  }

  const statusColorMap: Record<string, string> = {
    active: c.success,
    passive: c.textSecondary,
    maintenance: c.warning,
    sold: c.error,
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return (
          <View style={styles.tabContainer}>
            <GlassCard intensity={30} style={styles.cardGlass}>
              <View style={styles.cardContent}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Plaka</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{vehicle.plate}</Text>
                </View>
                <Divider style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Marka / Model</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>
                    {vehicle.brand} {vehicle.model}
                  </Text>
                </View>
                <Divider style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Yıl</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{vehicle.year || '-'}</Text>
                </View>
                <Divider style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Tür</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{vehicle.type || '-'}</Text>
                </View>
                <Divider style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Şasi Numarası</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{vehicle.vin || '-'}</Text>
                </View>
                <Divider style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Motor Numarası</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{vehicle.engine_no || '-'}</Text>
                </View>
              </View>
            </GlassCard>
          </View>
        );

      case 'maintenances':
        return (
          <View style={styles.tabContainer}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <Searchbar
                placeholder="Bakım ara..."
                value={maintSearch}
                onChangeText={setMaintSearch}
                style={[styles.searchBarCompact, { flex: 1, backgroundColor: glassBgColor, borderColor: glassBorderColor, marginBottom: 0 }]}
                inputStyle={[styles.searchInputCompact, { color: c.text }]}
                placeholderTextColor={c.textTertiary}
                iconColor={c.textSecondary}
              />
              <Pressable
                onPress={() => setIsMaintFilterVisible(true)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  borderWidth: 1,
                  borderColor: glassBorderColor,
                  backgroundColor: glassBgColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Ionicons name="funnel-outline" size={16} color={maintTypeFilter ? c.primary : c.textSecondary} />
                {maintTypeFilter && (
                  <View style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: c.primary,
                  }} />
                )}
              </Pressable>
            </View>

            {maintenanceQuery.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : filteredMaintenances.length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Kayıtlı bakım bulunamadı.</Text>
            ) : (
              filteredMaintenances.map((m: any) => (
                <GlassCard key={m.id} intensity={25} style={styles.subCardGlass}>
                  <View style={styles.subCardContent}>
                     <View style={styles.subCardHeader}>
                      <Text style={[styles.subCardTitle, { color: c.text }]}>{m.description || 'Bakım'}</Text>
                      <Text style={[styles.subCardPrice, { color: c.error }]}>{formatCurrency(m.cost)}</Text>
                    </View>
                    <View style={styles.subCardFooter}>
                      <Text style={[styles.subCardDate, { color: c.textSecondary }]}>Tarih: {formatDate(m.date)}</Text>
                      {m.next_km && <Text style={[styles.subCardDate, { color: c.textSecondary }]}>KM: {m.next_km}</Text>}
                    </View>
                    {m.file_path && (
                      <Pressable 
                        onPress={() => {
                          Linking.openURL(getFileUrl(m.file_path)).catch(err => {
                            Alert.alert('Hata', 'Dosya açılamadı.');
                          });
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}
                      >
                        <Ionicons name="document-attach-outline" size={14} color={c.primary} />
                        <Text style={{ fontSize: 12, color: c.primary, fontWeight: '600' }}>Belgeyi Görüntüle</Text>
                      </Pressable>
                    )}
                  </View>
                </GlassCard>
              ))
            )}

            {/* Maintenance Filter Modal */}
            <GlassModal visible={isMaintFilterVisible} onDismiss={() => setIsMaintFilterVisible(false)}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Bakım Filtrele</Text>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 8 }]}>Bakım Türü</Text>
                <View style={[styles.filterRow, { flexWrap: 'wrap', gap: 8, marginTop: 8 }]}>
                  <Pressable
                    onPress={() => setMaintTypeFilter(null)}
                    style={{
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 1,
                      paddingHorizontal: 16,
                      backgroundColor: !maintTypeFilter 
                        ? (colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)')
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)'),
                      borderColor: !maintTypeFilter 
                        ? c.primary 
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)'),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, color: !maintTypeFilter ? c.primary : c.textSecondary, fontWeight: !maintTypeFilter ? '600' : '400' }}>
                      Tümü
                    </Text>
                  </Pressable>
                  {maintenanceTypes.map((opt) => {
                    const isSelected = maintTypeFilter === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setMaintTypeFilter(isSelected ? null : opt.value)}
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
                            : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)'),
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 13, color: isSelected ? c.primary : c.textSecondary, fontWeight: isSelected ? '600' : '400' }}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 24 }}>
                <Button 
                  mode="outlined" 
                  onPress={() => { setMaintTypeFilter(null); setIsMaintFilterVisible(false); }}
                  style={{ flex: 1, borderColor: c.primary }}
                  textColor={c.primary}
                >
                  Temizle
                </Button>
                <Button 
                  mode="contained" 
                  onPress={() => setIsMaintFilterVisible(false)} 
                  style={{ flex: 1 }}
                  buttonColor={c.primary} 
                  textColor="#fff"
                >
                  Uygula
                </Button>
              </View>
            </GlassModal>
          </View>
        );

      case 'inspections':
        return (
          <View style={styles.tabContainer}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <Searchbar
                placeholder="Muayene ara..."
                value={inspSearch}
                onChangeText={setInspSearch}
                style={[styles.searchBarCompact, { flex: 1, backgroundColor: glassBgColor, borderColor: glassBorderColor, marginBottom: 0 }]}
                inputStyle={[styles.searchInputCompact, { color: c.text }]}
                placeholderTextColor={c.textTertiary}
                iconColor={c.textSecondary}
              />
              <Pressable
                onPress={() => setIsInspFilterVisible(true)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  borderWidth: 1,
                  borderColor: glassBorderColor,
                  backgroundColor: glassBgColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Ionicons name="funnel-outline" size={16} color={inspResultFilter ? c.primary : c.textSecondary} />
                {inspResultFilter && (
                  <View style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: c.primary,
                  }} />
                )}
              </Pressable>
            </View>

            {inspectionQuery.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : filteredInspections.length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Kayıtlı muayene bulunamadı.</Text>
            ) : (
              filteredInspections.map((i: any) => (
                <GlassCard key={i.id} intensity={25} style={styles.subCardGlass}>
                  <View style={styles.subCardContent}>
                    <View style={styles.subCardHeader}>
                      <Text style={[styles.subCardTitle, { color: c.text }]}>{i.type === 'traffic' ? 'Trafik Muayenesi' : i.type === 'egzoz' ? 'Egzoz Muayenesi' : i.type || 'Muayene'}</Text>
                      <Text style={[styles.subCardPrice, { color: c.error }]}>{formatCurrency(i.cost)}</Text>
                    </View>
                    <View style={styles.subCardFooter}>
                      <Text style={[styles.subCardDate, { color: c.textSecondary }]}>Tarih: {formatDate(i.inspection_date || i.date)}</Text>
                      <Text style={[styles.subCardDate, { color: i.result === 'failed' ? c.error : c.success }]}>Sonuç: {i.result === 'passed' ? 'Geçti' : i.result === 'failed' ? 'Kaldı' : i.result || '-'}</Text>
                    </View>
                    <View style={{ marginTop: 4 }}>
                      {i.next_inspection && <Text style={[styles.subCardDate, { color: c.warning }]}>Geçerlilik: {formatDate(i.next_inspection)}</Text>}
                    </View>
                    {i.file_path && (
                      <Pressable 
                        onPress={() => {
                          Linking.openURL(getFileUrl(i.file_path)).catch(err => {
                            Alert.alert('Hata', 'Dosya açılamadı.');
                          });
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}
                      >
                        <Ionicons name="document-attach-outline" size={14} color={c.primary} />
                        <Text style={{ fontSize: 12, color: c.primary, fontWeight: '600' }}>Belgeyi Görüntüle</Text>
                      </Pressable>
                    )}
                  </View>
                </GlassCard>
              ))
            )}

            {/* Inspection Filter Modal */}
            <GlassModal visible={isInspFilterVisible} onDismiss={() => setIsInspFilterVisible(false)}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Muayene Filtrele</Text>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 8 }]}>Sonuç</Text>
                <View style={[styles.filterRow, { flexWrap: 'wrap', gap: 8, marginTop: 8 }]}>
                  <Pressable
                    onPress={() => setInspResultFilter(null)}
                    style={{
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 1,
                      paddingHorizontal: 16,
                      backgroundColor: !inspResultFilter 
                        ? (colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)')
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)'),
                      borderColor: !inspResultFilter 
                        ? c.primary 
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)'),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, color: !inspResultFilter ? c.primary : c.textSecondary, fontWeight: !inspResultFilter ? '600' : '400' }}>
                      Tümü
                    </Text>
                  </Pressable>
                  {resultOptions.map((opt) => {
                    const isSelected = inspResultFilter === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setInspResultFilter(isSelected ? null : opt.value)}
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
                            : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)'),
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 13, color: isSelected ? c.primary : c.textSecondary, fontWeight: isSelected ? '600' : '400' }}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 24 }}>
                <Button 
                  mode="outlined" 
                  onPress={() => { setInspResultFilter(null); setIsInspFilterVisible(false); }}
                  style={{ flex: 1, borderColor: c.primary }}
                  textColor={c.primary}
                >
                  Temizle
                </Button>
                <Button 
                  mode="contained" 
                  onPress={() => setIsInspFilterVisible(false)} 
                  style={{ flex: 1 }}
                  buttonColor={c.primary} 
                  textColor="#fff"
                >
                  Uygula
                </Button>
              </View>
            </GlassModal>
          </View>
        );

      case 'insurances':
        return (
          <View style={styles.tabContainer}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <Searchbar
                placeholder="Sigorta ara..."
                value={insSearch}
                onChangeText={setInsSearch}
                style={[styles.searchBarCompact, { flex: 1, backgroundColor: glassBgColor, borderColor: glassBorderColor, marginBottom: 0 }]}
                inputStyle={[styles.searchInputCompact, { color: c.text }]}
                placeholderTextColor={c.textTertiary}
                iconColor={c.textSecondary}
              />
              <Pressable
                onPress={() => setIsInsFilterVisible(true)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  borderWidth: 1,
                  borderColor: glassBorderColor,
                  backgroundColor: glassBgColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Ionicons name="funnel-outline" size={16} color={insTypeFilter ? c.primary : c.textSecondary} />
                {insTypeFilter && (
                  <View style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: c.primary,
                  }} />
                )}
              </Pressable>
            </View>

            {insuranceQuery.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : filteredInsurances.length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Kayıtlı sigorta bulunamadı.</Text>
            ) : (
              filteredInsurances.map((ins: any) => (
                <GlassCard key={ins.id} intensity={25} style={styles.subCardGlass}>
                  <View style={styles.subCardContent}>
                    <View style={styles.subCardHeader}>
                      <Text style={[styles.subCardTitle, { color: c.text }]}>{ins.company || 'Sigorta'} - {ins.type === 'kasko' ? 'Kasko' : ins.type === 'traffic' ? 'Trafik' : ins.type || 'Diğer'}</Text>
                      <Text style={[styles.subCardPrice, { color: c.error }]}>{formatCurrency(ins.premium || ins.cost)}</Text>
                    </View>
                    <View style={styles.subCardFooter}>
                      <Text style={[styles.subCardDate, { color: c.textSecondary }]}>Başlangıç: {formatDate(ins.start_date)}</Text>
                      <Text style={[styles.subCardDate, { color: c.warning }]}>Bitiş: {formatDate(ins.end_date)}</Text>
                    </View>
                    {ins.policy_no && (
                      <Text style={[styles.subCardDate, { color: c.textSecondary, marginTop: 4 }]}>Poliçe No: {ins.policy_no}</Text>
                    )}
                    {ins.file_path && (
                      <Pressable 
                        onPress={() => {
                          Linking.openURL(getFileUrl(ins.file_path)).catch(err => {
                            Alert.alert('Hata', 'Dosya açılamadı.');
                          });
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}
                      >
                        <Ionicons name="document-attach-outline" size={14} color={c.primary} />
                        <Text style={{ fontSize: 12, color: c.primary, fontWeight: '600' }}>Belgeyi Görüntüle</Text>
                      </Pressable>
                    )}
                  </View>
                </GlassCard>
              ))
            )}

            {/* Insurance Filter Modal */}
            <GlassModal visible={isInsFilterVisible} onDismiss={() => setIsInsFilterVisible(false)}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Sigorta Filtrele</Text>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 8 }]}>Sigorta Türü</Text>
                <View style={[styles.filterRow, { flexWrap: 'wrap', gap: 8, marginTop: 8 }]}>
                  <Pressable
                    onPress={() => setInsTypeFilter(null)}
                    style={{
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 1,
                      paddingHorizontal: 16,
                      backgroundColor: !insTypeFilter 
                        ? (colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)')
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)'),
                      borderColor: !insTypeFilter 
                        ? c.primary 
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)'),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, color: !insTypeFilter ? c.primary : c.textSecondary, fontWeight: !insTypeFilter ? '600' : '400' }}>
                      Tümü
                    </Text>
                  </Pressable>
                  {insuranceTypes.map((opt) => {
                    const isSelected = insTypeFilter === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setInsTypeFilter(isSelected ? null : opt.value)}
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
                            : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)'),
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 13, color: isSelected ? c.primary : c.textSecondary, fontWeight: isSelected ? '600' : '400' }}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 24 }}>
                <Button 
                  mode="outlined" 
                  onPress={() => { setInsTypeFilter(null); setIsInsFilterVisible(false); }}
                  style={{ flex: 1, borderColor: c.primary }}
                  textColor={c.primary}
                >
                  Temizle
                </Button>
                <Button 
                  mode="contained" 
                  onPress={() => setIsInsFilterVisible(false)} 
                  style={{ flex: 1 }}
                  buttonColor={c.primary} 
                  textColor="#fff"
                >
                  Uygula
                </Button>
              </View>
            </GlassModal>
          </View>
        );

      case 'services':
        return (
          <View style={styles.tabContainer}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <Searchbar
                placeholder="Servis ara..."
                value={servSearch}
                onChangeText={setServSearch}
                style={[styles.searchBarCompact, { flex: 1, backgroundColor: glassBgColor, borderColor: glassBorderColor, marginBottom: 0 }]}
                inputStyle={[styles.searchInputCompact, { color: c.text }]}
                placeholderTextColor={c.textTertiary}
                iconColor={c.textSecondary}
              />
              <Pressable
                onPress={() => setIsServFilterVisible(true)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  borderWidth: 1,
                  borderColor: glassBorderColor,
                  backgroundColor: glassBgColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Ionicons name="funnel-outline" size={16} color={servTypeFilter ? c.primary : c.textSecondary} />
                {servTypeFilter && (
                  <View style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: c.primary,
                  }} />
                )}
              </Pressable>
            </View>

            {servicesQuery.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : filteredServices.length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Kayıtlı servis kaydı bulunamadı.</Text>
            ) : (
              filteredServices.map((s: any) => (
                <GlassCard key={s.id} intensity={25} style={styles.subCardGlass}>
                  <View style={styles.subCardContent}>
                    <View style={styles.subCardHeader}>
                      <Text style={[styles.subCardTitle, { color: c.text }]}>{s.description || 'Servis'}</Text>
                      <Text style={[styles.subCardPrice, { color: c.error }]}>{formatCurrency(s.cost)}</Text>
                    </View>
                    <View style={styles.subCardFooter}>
                      <Text style={[styles.subCardDate, { color: c.textSecondary }]}>Tarih: {formatDate(s.date)}</Text>
                      {s.km && <Text style={[styles.subCardDate, { color: c.textSecondary }]}>KM: {s.km}</Text>}
                    </View>
                    {s.file_path && (
                      <Pressable 
                        onPress={() => {
                          Linking.openURL(getFileUrl(s.file_path)).catch(err => {
                            Alert.alert('Hata', 'Dosya açılamadı.');
                          });
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}
                      >
                        <Ionicons name="document-attach-outline" size={14} color={c.primary} />
                        <Text style={{ fontSize: 12, color: c.primary, fontWeight: '600' }}>Belgeyi Görüntüle</Text>
                      </Pressable>
                    )}
                  </View>
                </GlassCard>
              ))
            )}

            {/* Service Filter Modal */}
            <GlassModal visible={isServFilterVisible} onDismiss={() => setIsServFilterVisible(false)}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Servis Filtrele</Text>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 8 }]}>İşlem Türü</Text>
                <View style={[styles.filterRow, { flexWrap: 'wrap', gap: 8, marginTop: 8 }]}>
                  <Pressable
                    onPress={() => setServTypeFilter(null)}
                    style={{
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 1,
                      paddingHorizontal: 16,
                      backgroundColor: !servTypeFilter 
                        ? (colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)')
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)'),
                      borderColor: !servTypeFilter 
                        ? c.primary 
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)'),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, color: !servTypeFilter ? c.primary : c.textSecondary, fontWeight: !servTypeFilter ? '600' : '400' }}>
                      Tümü
                    </Text>
                  </Pressable>
                  {serviceTypes.map((opt) => {
                    const isSelected = servTypeFilter === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setServTypeFilter(isSelected ? null : opt.value)}
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
                            : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)'),
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 13, color: isSelected ? c.primary : c.textSecondary, fontWeight: isSelected ? '600' : '400' }}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 24 }}>
                <Button 
                  mode="outlined" 
                  onPress={() => { setServTypeFilter(null); setIsServFilterVisible(false); }}
                  style={{ flex: 1, borderColor: c.primary }}
                  textColor={c.primary}
                >
                  Temizle
                </Button>
                <Button 
                  mode="contained" 
                  onPress={() => setIsServFilterVisible(false)} 
                  style={{ flex: 1 }}
                  buttonColor={c.primary} 
                  textColor="#fff"
                >
                  Uygula
                </Button>
              </View>
            </GlassModal>
          </View>
        );

      case 'assignments':
        return (
          <View style={styles.tabContainer}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <Searchbar
                placeholder="Zimmet ara..."
                value={assignmentSearch}
                onChangeText={setAssignmentSearch}
                style={[styles.searchBarCompact, { flex: 1, backgroundColor: glassBgColor, borderColor: glassBorderColor, marginBottom: 0 }]}
                inputStyle={[styles.searchInputCompact, { color: c.text }]}
                placeholderTextColor={c.textTertiary}
                iconColor={c.textSecondary}
              />
              <Pressable
                onPress={() => setIsAssignmentFilterVisible(true)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  borderWidth: 1,
                  borderColor: glassBorderColor,
                  backgroundColor: glassBgColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Ionicons name="funnel-outline" size={16} color={assignmentStatusFilter ? c.primary : c.textSecondary} />
                {assignmentStatusFilter && (
                  <View style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: c.primary,
                  }} />
                )}
              </Pressable>
            </View>

            {assignmentsQuery.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : filteredAssignments.length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Zimmet kaydı bulunamadı.</Text>
            ) : (
              filteredAssignments.map((a: any) => {
                const isActive = !a.end_date;
                return (
                  <GlassCard key={a.id} intensity={25} style={styles.subCardGlass}>
                    <View style={styles.subCardContent}>
                      <View style={styles.subCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                          <Ionicons name="person-outline" size={14} color={c.primary} />
                          <Text style={[styles.subCardTitle, { color: c.text }]} numberOfLines={1}>
                            {a.assigned_to || a.employee_name || 'Atanmamış'}
                          </Text>
                        </View>
                        <View style={{
                          backgroundColor: isActive ? c.success + '20' : c.textSecondary + '20',
                          borderRadius: 4,
                          paddingHorizontal: 6,
                          paddingVertical: 2
                        }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: isActive ? c.success : c.textSecondary }}>
                            {isActive ? 'Aktif' : 'İade Edildi'}
                          </Text>
                        </View>
                      </View>

                      {a.item_name && a.item_name !== 'Araç Zimmeti' && (
                        <Text style={{ fontSize: 12, color: c.textSecondary, marginTop: 4 }}>
                          Detay: {a.item_name}
                        </Text>
                      )}

                      {a.department && (
                        <Text style={{ fontSize: 12, color: c.textSecondary, marginTop: 2 }}>
                          Departman: {a.department}
                        </Text>
                      )}

                      <View style={[styles.subCardFooter, { marginTop: 8 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="calendar-outline" size={12} color={c.textSecondary} />
                          <Text style={[styles.subCardDate, { color: c.textSecondary }]}>
                            Tarih: {formatDate(a.start_date || a.date)} {a.end_date ? ` - ${formatDate(a.end_date)}` : ''}
                          </Text>
                        </View>
                      </View>

                      {a.notes && (
                        <Text style={{ fontSize: 12, color: c.textTertiary, marginTop: 6, fontStyle: 'italic' }}>
                          Not: {a.notes}
                        </Text>
                      )}
                    </View>
                  </GlassCard>
                );
              })
            )}

            {/* Assignment Filter Modal */}
            <GlassModal visible={isAssignmentFilterVisible} onDismiss={() => setIsAssignmentFilterVisible(false)}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Zimmet Filtrele</Text>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 8 }]}>Durum</Text>
                <View style={[styles.filterRow, { flexWrap: 'wrap', gap: 8, marginTop: 8 }]}>
                  <Pressable
                    onPress={() => setAssignmentStatusFilter(null)}
                    style={{
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 1,
                      paddingHorizontal: 16,
                      backgroundColor: !assignmentStatusFilter 
                        ? (colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)')
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)'),
                      borderColor: !assignmentStatusFilter 
                        ? c.primary 
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)'),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, color: !assignmentStatusFilter ? c.primary : c.textSecondary, fontWeight: !assignmentStatusFilter ? '600' : '400' }}>
                      Tümü
                    </Text>
                  </Pressable>
                  {[
                    { label: 'Aktif Zimmetler', value: 'active' },
                    { label: 'İade Edilenler', value: 'returned' }
                  ].map((opt) => {
                    const isSelected = assignmentStatusFilter === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setAssignmentStatusFilter(isSelected ? null : opt.value)}
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
                            : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)'),
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 13, color: isSelected ? c.primary : c.textSecondary, fontWeight: isSelected ? '600' : '400' }}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 24 }}>
                <Button 
                  mode="outlined" 
                  onPress={() => { setAssignmentStatusFilter(null); setIsAssignmentFilterVisible(false); }}
                  style={{ flex: 1, borderColor: c.primary }}
                  textColor={c.primary}
                >
                  Temizle
                </Button>
                <Button 
                  mode="contained" 
                  onPress={() => setIsAssignmentFilterVisible(false)} 
                  style={{ flex: 1 }}
                  buttonColor={c.primary} 
                  textColor="#fff"
                >
                  Uygula
                </Button>
              </View>
            </GlassModal>
          </View>
        );

      case 'documents':
        return (
          <View style={styles.tabContainer}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <Searchbar
                placeholder="Belge ara..."
                value={docSearch}
                onChangeText={setDocSearch}
                style={[styles.searchBarCompact, { flex: 1, backgroundColor: glassBgColor, borderColor: glassBorderColor, marginBottom: 0 }]}
                inputStyle={[styles.searchInputCompact, { color: c.text }]}
                placeholderTextColor={c.textTertiary}
                iconColor={c.textSecondary}
              />
            </View>

            {documentsQuery.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : filteredDocuments.length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Belge bulunamadı.</Text>
            ) : (
              filteredDocuments.map((d: any) => (
                <GlassCard key={d.id} intensity={25} style={styles.subCardGlass}>
                  <Pressable
                    onPress={() => {
                      if (d.file_path) {
                        Linking.openURL(getFileUrl(d.file_path)).catch(err => {
                          Alert.alert('Hata', 'Dosya açılamadı.');
                        });
                      } else {
                        Alert.alert('Hata', 'Dosya yolu bulunamadı.');
                      }
                    }}
                    style={styles.subCardContent}
                  >
                    <View style={styles.subCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Ionicons name="document-text-outline" size={18} color={c.primary} />
                        <Text style={[styles.subCardTitle, { color: c.text }]} numberOfLines={1}>
                          {d.file_name}
                        </Text>
                      </View>
                      <Ionicons name="eye-outline" size={16} color={c.primary} style={{ marginLeft: 8 }} />
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {d.category && (
                        <View style={{ backgroundColor: c.primaryContainer + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11, color: c.primary, fontWeight: '600' }}>{d.category}</Text>
                        </View>
                      )}
                      {d.folder && (
                        <View style={{ backgroundColor: c.textSecondary + '15', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11, color: c.textSecondary, fontWeight: '600' }}>{d.folder}</Text>
                        </View>
                      )}
                    </View>

                    {(d.start_date || d.end_date) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        {d.start_date && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="calendar-outline" size={12} color={c.textTertiary} />
                            <Text style={[styles.subCardDate, { color: c.textTertiary }]}>Başlangıç: {formatDate(d.start_date)}</Text>
                          </View>
                        )}
                        {d.end_date && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="alert-circle-outline" size={12} color={c.warning} />
                            <Text style={[styles.subCardDate, { color: c.warning }]}>Bitiş: {formatDate(d.end_date)}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </Pressable>
                </GlassCard>
              ))
            )}
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <MovingBackground />
      
      {/* Navbar */}
      <View style={[styles.nav, { paddingTop: insets.top }]}>
        <IconButton icon="arrow-left" size={24} iconColor={c.text} onPress={() => router.back()} />
        <Text style={[styles.navTitle, { color: c.text }]}>Araç Detayı</Text>
        <IconButton icon="trash-can-outline" size={24} iconColor={c.error} onPress={handleConfirmDelete} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={vehicleQuery.isFetching}
            onRefresh={() => vehicleQuery.refetch()}
            tintColor={c.primary}
          />
        }
      >
        {/* Vehicle Header Card */}
        <View style={styles.headerSection}>
          <View style={[styles.plateBox, { backgroundColor: c.primaryContainer + '20' }]}>
            <Ionicons name="car" size={32} color={c.primary} />
          </View>
          <Text style={[styles.plateText, { color: c.text }]}>{vehicle.plate}</Text>
          <Text style={[styles.modelText, { color: c.textSecondary }]}>
            {vehicle.brand} {vehicle.model} ({vehicle.year})
          </Text>

          <View style={[styles.statusBadge, { backgroundColor: (statusColorMap[vehicle.status] || c.textSecondary) + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColorMap[vehicle.status] || c.textSecondary }]} />
            <Text style={[styles.statusText, { color: statusColorMap[vehicle.status] || c.textSecondary }]}>
              {getStatusLabel(vehicle.status)}
            </Text>
          </View>
        </View>

        {/* Tab Buttons */}
        <View style={styles.tabPicker}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {(['details', 'maintenances', 'inspections', 'insurances', 'services', 'assignments', 'documents'] as TabValue[]).map((tab) => {
              const labelMap: Record<TabValue, string> = {
                details: 'Genel',
                maintenances: 'Bakım',
                inspections: 'Muayene',
                insurances: 'Sigorta',
                services: 'Servis',
                assignments: 'Zimmet',
                documents: 'Belgeler',
              };
              const isSelected = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    styles.tabButton,
                    {
                      backgroundColor: isSelected ? c.primaryContainer + '30' : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'),
                      borderColor: isSelected ? c.primary : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      { color: isSelected ? c.primary : c.textSecondary },
                    ]}
                  >
                    {labelMap[tab]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Content */}
        {renderTabContent()}
      </ScrollView>

      {/* Add Maintenance Modal */}
      <GlassModal visible={activeModal === 'maintenance'} onDismiss={() => { setActiveModal(null); resetForm(); }}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni Bakım Kaydı</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <GlassInput
                label="Açıklama"
                value={desc}
                onChangeText={setDesc}
                placeholder="örn: Motor Yağı Değişimi"
              />
              <GlassInput
                label="Maliyet (₺)"
                value={cost}
                onChangeText={setCost}
                keyboardType="numeric"
                placeholder="0.00"
              />
              <GlassInput
                label="Tarih"
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />
              <GlassDropdown
                label="Bakım Türü"
                value={maintType}
                options={[
                  { label: 'Periyodik Bakım', value: 'Periyodik Bakım' },
                  { label: 'Ağır Bakım', value: 'Ağır Bakım' },
                  { label: 'Lastik Değişimi', value: 'Lastik Değişimi' },
                  { label: 'Kışlık Bakım', value: 'Kışlık Bakım' },
                  { label: 'Arıza Onarım', value: 'Arıza Onarım' },
                  { label: 'Diğer', value: 'Diğer' },
                ]}
                onSelect={setMaintType}
                placeholder="Bakım Türü Seçiniz"
              />
              <GlassInput
                label="Sonraki Kilometre (KM)"
                value={maintNextKm}
                onChangeText={setMaintNextKm}
                keyboardType="numeric"
                placeholder="örn: 60000"
              />
              <GlassInput
                label="Sonraki Bakım Tarihi"
                value={maintNextDate}
                onChangeText={setMaintNextDate}
                placeholder="YYYY-MM-DD"
              />
              <GlassInput
                label="Notlar"
                value={notes}
                onChangeText={setNotes}
                placeholder="Ek notlar..."
                multiline
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button mode="text" onPress={() => { setActiveModal(null); resetForm(); }} textColor={c.textSecondary}>
                İptal
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateMaintenance}
                loading={createMaintenanceMutation.isPending}
                disabled={createMaintenanceMutation.isPending || !desc}
                buttonColor={c.primary}
                textColor="#ffffff"
              >
                Kaydet
              </Button>
            </View>
          </GlassModal>

      {/* Add Inspection Modal */}
      <GlassModal visible={activeModal === 'inspection'} onDismiss={() => { setActiveModal(null); resetForm(); }}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni Muayene Kaydı</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <GlassInput
                label="Tarih"
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />
              <GlassDropdown
                label="Muayene Türü"
                value={inspType}
                options={[
                  { label: 'TÜVTÜRK Muayene', value: 'TÜVTÜRK Muayene' },
                  { label: 'Egzoz Muayene', value: 'Egzoz Muayene' },
                  { label: 'Takograf Muayene', value: 'Takograf Muayene' },
                  { label: 'Diğer', value: 'Diğer' },
                ]}
                onSelect={setInspType}
                placeholder="Muayene Türü Seçiniz"
              />
              <GlassDropdown
                label="Sonuç"
                value={inspResult}
                options={[
                  { label: 'Geçti', value: 'Geçti' },
                  { label: 'Kaldı', value: 'Kaldı' },
                ]}
                onSelect={setInspResult}
                placeholder="Sonuç Seçiniz"
              />
              <GlassInput
                label="Geçerlilik Tarihi"
                value={inspExpiryDate}
                onChangeText={setInspExpiryDate}
                placeholder="YYYY-MM-DD"
              />
              <GlassInput
                label="Maliyet (₺)"
                value={cost}
                onChangeText={setCost}
                keyboardType="numeric"
                placeholder="0.00"
              />
              <GlassInput
                label="Notlar"
                value={notes}
                onChangeText={setNotes}
                placeholder="Ek notlar..."
                multiline
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button mode="text" onPress={() => { setActiveModal(null); resetForm(); }} textColor={c.textSecondary}>
                İptal
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateInspection}
                loading={createInspectionMutation.isPending}
                disabled={createInspectionMutation.isPending}
                buttonColor={c.primary}
                textColor="#ffffff"
              >
                Kaydet
              </Button>
            </View>
          </GlassModal>

      {/* Add Insurance Modal */}
      <GlassModal visible={activeModal === 'insurance'} onDismiss={() => { setActiveModal(null); resetForm(); }}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni Sigorta Kaydı</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <GlassInput
                label="Sigorta Şirketi"
                value={insCompany}
                onChangeText={setInsCompany}
                placeholder="örn: Allianz, AXA"
              />
              <GlassInput
                label="Poliçe No"
                value={insPolicyNo}
                onChangeText={setInsPolicyNo}
                placeholder="Poliçe numarası"
              />
              <GlassDropdown
                label="Poliçe Türü"
                value={insType}
                options={[
                  { label: 'Kasko', value: 'Kasko' },
                  { label: 'Trafik Sigortası', value: 'Trafik Sigortası' },
                  { label: 'Yeşil Kart', value: 'Yeşil Kart' },
                  { label: 'Diğer', value: 'Diğer' },
                ]}
                onSelect={setInsType}
                placeholder="Poliçe Türü Seçiniz"
              />
              <GlassInput
                label="Başlangıç Tarihi"
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />
              <GlassInput
                label="Bitiş Tarihi"
                value={insEndDate}
                onChangeText={setInsEndDate}
                placeholder="YYYY-MM-DD"
              />
              <GlassInput
                label="Prim Tutarı (₺)"
                value={cost}
                onChangeText={setCost}
                keyboardType="numeric"
                placeholder="0.00"
              />
              <GlassInput
                label="Notlar"
                value={notes}
                onChangeText={setNotes}
                placeholder="Ek notlar..."
                multiline
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button mode="text" onPress={() => { setActiveModal(null); resetForm(); }} textColor={c.textSecondary}>
                İptal
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateInsurance}
                loading={createInsuranceMutation.isPending}
                disabled={createInsuranceMutation.isPending || !insCompany}
                buttonColor={c.primary}
                textColor="#ffffff"
              >
                Kaydet
              </Button>
            </View>
          </GlassModal>

      {/* Add Service Modal */}
      <GlassModal visible={activeModal === 'service'} onDismiss={() => { setActiveModal(null); resetForm(); }}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni Servis Kaydı</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <GlassDropdown
                label="Servis Türü"
                value={servType}
                options={[
                  { label: 'Periyodik Bakım', value: 'Periyodik Bakım' },
                  { label: 'Kaporta/Boya', value: 'Kaporta/Boya' },
                  { label: 'Elektrik', value: 'Elektrik' },
                  { label: 'Mekanik Onarım', value: 'Mekanik Onarım' },
                  { label: 'Lastik', value: 'Lastik' },
                  { label: 'Diğer', value: 'Diğer' },
                ]}
                onSelect={setServType}
                placeholder="Servis Türü Seçiniz"
              />
              <GlassInput
                label="Açıklama"
                value={desc}
                onChangeText={setDesc}
                placeholder="Servis açıklaması..."
              />
              <GlassInput
                label="Tarih"
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />
              <GlassInput
                label="Maliyet (₺)"
                value={cost}
                onChangeText={setCost}
                keyboardType="numeric"
                placeholder="0.00"
              />
              <GlassInput
                label="Kilometre (KM)"
                value={servKm}
                onChangeText={setServKm}
                keyboardType="numeric"
                placeholder="örn: 45200"
              />
              <GlassInput
                label="Notlar"
                value={notes}
                onChangeText={setNotes}
                placeholder="Ek notlar..."
                multiline
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button mode="text" onPress={() => { setActiveModal(null); resetForm(); }} textColor={c.textSecondary}>
                İptal
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateService}
                loading={createServiceMutation.isPending}
                disabled={createServiceMutation.isPending || !servType}
                buttonColor={c.primary}
                textColor="#ffffff"
              >
                Kaydet
              </Button>
            </View>
          </GlassModal>

      {/* Floating Action Button */}
      {['maintenances', 'inspections', 'insurances', 'services'].includes(activeTab) && (
        <Pressable
          onPress={() => {
            if (activeTab === 'maintenances') setActiveModal('maintenance');
            else if (activeTab === 'inspections') setActiveModal('inspection');
            else if (activeTab === 'insurances') setActiveModal('insurance');
            else if (activeTab === 'services') setActiveModal('service');
          }}
          style={[styles.fab, { backgroundColor: c.primary }]}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  navTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingBottom: 60 },
  headerSection: { alignItems: 'center', marginVertical: 20 },
  plateBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  plateText: { fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
  modelText: { fontSize: 14, marginTop: 4, marginBottom: 10 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  tabPicker: { marginVertical: 10, paddingHorizontal: 16 },
  tabsScroll: { gap: 8 },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabButtonText: { fontSize: 13, fontWeight: '600' },
  tabContainer: { paddingHorizontal: 16, marginTop: 12 },
  cardGlass: { padding: 0 },
  cardContent: { padding: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  detailLabel: { fontSize: 13, fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: '600' },
  tabLoader: { marginVertical: 20 },
  emptyText: { textAlign: 'center', marginVertical: 40, fontSize: 14 },
  subCardGlass: { padding: 0, marginBottom: 8 },
  subCardContent: { padding: 16 },
  subCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subCardTitle: { fontSize: 15, fontWeight: '600' },
  subCardPrice: { fontSize: 15, fontWeight: '700' },
  subCardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  subCardDate: { fontSize: 12 },
  addTabBtn: { marginBottom: 12, borderRadius: 12 },
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
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  filterRow: {
    flexDirection: 'row',
  },
  searchBarCompact: {
    borderRadius: 20,
    elevation: 0,
    height: 38,
    borderWidth: 1,
    marginBottom: 6,
  },
  searchInputCompact: {
    fontSize: 13,
    minHeight: 0,
    paddingLeft: 4,
  },
});

