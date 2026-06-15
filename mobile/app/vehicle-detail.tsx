import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text, ActivityIndicator, IconButton, Divider, Portal, Modal, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { vehicleService } from '../services/dataServices';
import { formatCurrency, getStatusLabel } from '../utils/format';
import MovingBackground from '../components/ui/MovingBackground';
import GlassCard from '../components/ui/GlassCard';
import GlassInput from '../components/ui/GlassInput';

type TabValue = 'details' | 'maintenances' | 'inspections' | 'insurances' | 'services';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabValue>('details');

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
            <Button
              mode="contained"
              icon="plus"
              onPress={() => setActiveModal('maintenance')}
              style={styles.addTabBtn}
              buttonColor={c.primary}
              textColor="#ffffff"
            >
              Yeni Bakım Kaydı Ekle
            </Button>
            {maintenanceQuery.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : (maintenanceQuery.data?.data || []).length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Kayıtlı bakım bulunamadı.</Text>
            ) : (
              (maintenanceQuery.data?.data || []).map((m: any) => (
                <GlassCard key={m.id} intensity={25} style={styles.subCardGlass}>
                  <View style={styles.subCardContent}>
                     <View style={styles.subCardHeader}>
                      <Text style={[styles.subCardTitle, { color: c.text }]}>{m.description || 'Bakım'}</Text>
                      <Text style={[styles.subCardPrice, { color: c.error }]}>{formatCurrency(m.cost)}</Text>
                    </View>
                    <View style={styles.subCardFooter}>
                      <Text style={[styles.subCardDate, { color: c.textSecondary }]}>Tarih: {m.date}</Text>
                      {m.km && <Text style={[styles.subCardDate, { color: c.textSecondary }]}>KM: {m.km}</Text>}
                    </View>
                  </View>
                </GlassCard>
              ))
            )}
          </View>
        );

      case 'inspections':
        return (
          <View style={styles.tabContainer}>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => setActiveModal('inspection')}
              style={styles.addTabBtn}
              buttonColor={c.primary}
              textColor="#ffffff"
            >
              Yeni Muayene Kaydı Ekle
            </Button>
            {inspectionQuery.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : (inspectionQuery.data?.data || []).length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Kayıtlı muayene bulunamadı.</Text>
            ) : (
              (inspectionQuery.data?.data || []).map((i: any) => (
                <GlassCard key={i.id} intensity={25} style={styles.subCardGlass}>
                  <View style={styles.subCardContent}>
                    <View style={styles.subCardHeader}>
                      <Text style={[styles.subCardTitle, { color: c.text }]}>Muayene</Text>
                      <Text style={[styles.subCardPrice, { color: c.error }]}>{formatCurrency(i.cost)}</Text>
                    </View>
                    <View style={styles.subCardFooter}>
                      <Text style={[styles.subCardDate, { color: c.textSecondary }]}>Tarih: {i.date}</Text>
                      <Text style={[styles.subCardDate, { color: c.warning }]}>Geçerlilik: {i.expiry_date}</Text>
                    </View>
                  </View>
                </GlassCard>
              ))
            )}
          </View>
        );

      case 'insurances':
        return (
          <View style={styles.tabContainer}>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => setActiveModal('insurance')}
              style={styles.addTabBtn}
              buttonColor={c.primary}
              textColor="#ffffff"
            >
              Yeni Sigorta Kaydı Ekle
            </Button>
            {insuranceQuery.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : (insuranceQuery.data?.data || []).length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Kayıtlı sigorta bulunamadı.</Text>
            ) : (
              (insuranceQuery.data?.data || []).map((ins: any) => (
                <GlassCard key={ins.id} intensity={25} style={styles.subCardGlass}>
                  <View style={styles.subCardContent}>
                    <View style={styles.subCardHeader}>
                      <Text style={[styles.subCardTitle, { color: c.text }]}>{ins.company || 'Sigorta'}</Text>
                      <Text style={[styles.subCardPrice, { color: c.error }]}>{formatCurrency(ins.cost)}</Text>
                    </View>
                    <View style={styles.subCardFooter}>
                      <Text style={[styles.subCardDate, { color: c.textSecondary }]}>Başlangıç: {ins.start_date}</Text>
                      <Text style={[styles.subCardDate, { color: c.warning }]}>Bitiş: {ins.end_date}</Text>
                    </View>
                  </View>
                </GlassCard>
              ))
            )}
          </View>
        );

      case 'services':
        return (
          <View style={styles.tabContainer}>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => setActiveModal('service')}
              style={styles.addTabBtn}
              buttonColor={c.primary}
              textColor="#ffffff"
            >
              Yeni Servis Kaydı Ekle
            </Button>
            {servicesQuery.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : (servicesQuery.data?.data || []).length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Kayıtlı servis kaydı bulunamadı.</Text>
            ) : (
              (servicesQuery.data?.data || []).map((s: any) => (
                <GlassCard key={s.id} intensity={25} style={styles.subCardGlass}>
                  <View style={styles.subCardContent}>
                    <View style={styles.subCardHeader}>
                      <Text style={[styles.subCardTitle, { color: c.text }]}>{s.description || 'Servis'}</Text>
                      <Text style={[styles.subCardPrice, { color: c.error }]}>{formatCurrency(s.cost)}</Text>
                    </View>
                    <View style={styles.subCardFooter}>
                      <Text style={[styles.subCardDate, { color: c.textSecondary }]}>Tarih: {s.date}</Text>
                    </View>
                  </View>
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
            {(['details', 'maintenances', 'inspections', 'insurances', 'services'] as TabValue[]).map((tab) => {
              const labelMap: Record<TabValue, string> = {
                details: 'Genel',
                maintenances: 'Bakım',
                inspections: 'Muayene',
                insurances: 'Sigorta',
                services: 'Servis',
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
      <Portal>
        <Modal
          visible={activeModal === 'maintenance'}
          onDismiss={() => { setActiveModal(null); resetForm(); }}
          contentContainerStyle={styles.modalContent}
        >
          <GlassCard intensity={85} style={styles.modalGlassCard}>
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
              <GlassInput
                label="Bakım Türü"
                value={maintType}
                onChangeText={setMaintType}
                placeholder="örn: Periyodik Bakım, Ağır Bakım"
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
          </GlassCard>
        </Modal>
      </Portal>

      {/* Add Inspection Modal */}
      <Portal>
        <Modal
          visible={activeModal === 'inspection'}
          onDismiss={() => { setActiveModal(null); resetForm(); }}
          contentContainerStyle={styles.modalContent}
        >
          <GlassCard intensity={85} style={styles.modalGlassCard}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni Muayene Kaydı</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <GlassInput
                label="Tarih"
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />
              <GlassInput
                label="Muayene Türü"
                value={inspType}
                onChangeText={setInspType}
                placeholder="örn: TÜVTÜRK Muayene, Egzoz Muayene"
              />
              <GlassInput
                label="Sonuç"
                value={inspResult}
                onChangeText={setInspResult}
                placeholder="Geçti / Kaldı"
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
          </GlassCard>
        </Modal>
      </Portal>

      {/* Add Insurance Modal */}
      <Portal>
        <Modal
          visible={activeModal === 'insurance'}
          onDismiss={() => { setActiveModal(null); resetForm(); }}
          contentContainerStyle={styles.modalContent}
        >
          <GlassCard intensity={85} style={styles.modalGlassCard}>
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
              <GlassInput
                label="Poliçe Türü"
                value={insType}
                onChangeText={setInsType}
                placeholder="örn: Kasko, Trafik Sigortası"
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
          </GlassCard>
        </Modal>
      </Portal>

      {/* Add Service Modal */}
      <Portal>
        <Modal
          visible={activeModal === 'service'}
          onDismiss={() => { setActiveModal(null); resetForm(); }}
          contentContainerStyle={styles.modalContent}
        >
          <GlassCard intensity={85} style={styles.modalGlassCard}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni Servis Kaydı</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <GlassInput
                label="Servis Türü"
                value={servType}
                onChangeText={setServType}
                placeholder="örn: Onarım, Lastik Değişimi"
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
  modalContent: { padding: 12, margin: 12 },
  modalGlassCard: { padding: 16, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
});

