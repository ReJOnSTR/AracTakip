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
import { Text, ActivityIndicator, IconButton, Divider, Avatar, Portal, Modal, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { employeeService } from '../services/dataServices';
import { formatCurrency } from '../utils/format';
import MovingBackground from '../components/ui/MovingBackground';
import GlassCard from '../components/ui/GlassCard';
import GlassInput from '../components/ui/GlassInput';

type TabValue = 'details' | 'salaries' | 'leaves' | 'overtimes' | 'documents';

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabValue>('details');

  const empId = parseInt(id);

  // Queries
  const employeeQuery = useQuery({
    queryKey: ['employee', empId],
    queryFn: () => employeeService.getById(empId),
    enabled: !!empId,
  });

  const salariesQuery = useQuery({
    queryKey: ['employee-salaries', empId],
    queryFn: () => employeeService.getSalaries(empId),
    enabled: !!empId && activeTab === 'salaries',
  });

  const leavesQuery = useQuery({
    queryKey: ['employee-leaves', empId],
    queryFn: () => employeeService.getLeaves(empId),
    enabled: !!empId && activeTab === 'leaves',
  });

  const overtimesQuery = useQuery({
    queryKey: ['employee-overtimes', empId],
    queryFn: () => employeeService.getOvertimes(empId),
    enabled: !!empId && activeTab === 'overtimes',
  });

  const documentsQuery = useQuery({
    queryKey: ['employee-documents', empId],
    queryFn: () => employeeService.getDocuments(empId),
    enabled: !!empId && activeTab === 'documents',
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: () => employeeService.delete(empId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      router.back();
    },
  });

  // Modal State
  const [activeModal, setActiveModal] = useState<'salary' | 'leave' | 'overtime' | null>(null);

  // Common/Salary fields
  const [period, setPeriod] = useState(new Date().toISOString().split('T')[0].substring(0, 7)); // YYYY-MM
  const [baseSalary, setBaseSalary] = useState('');
  const [bonus, setBonus] = useState('');
  const [deduction, setDeduction] = useState('');
  const [netSalary, setNetSalary] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryStatus, setSalaryStatus] = useState('Ödendi');
  const [paymentMethod, setPaymentMethod] = useState('banka');
  const [notes, setNotes] = useState('');

  // Leave fields
  const [leaveType, setLeaveType] = useState('Yıllık İzin');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveDays, setLeaveDays] = useState('1');
  const [leaveStatus, setLeaveStatus] = useState('approved');

  // Overtime fields
  const [overtimeDate, setOvertimeDate] = useState(new Date().toISOString().split('T')[0]);
  const [overtimeHours, setOvertimeHours] = useState('');
  const [overtimeRate, setOvertimeRate] = useState('1.5');
  const [overtimeAmount, setOvertimeAmount] = useState('');
  const [overtimeNotes, setOvertimeNotes] = useState('');

  const resetForm = () => {
    setPeriod(new Date().toISOString().split('T')[0].substring(0, 7));
    setBaseSalary('');
    setBonus('');
    setDeduction('');
    setNetSalary('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setSalaryStatus('Ödendi');
    setPaymentMethod('banka');
    setNotes('');
    setLeaveType('Yıllık İzin');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setLeaveDays('1');
    setLeaveStatus('approved');
    setOvertimeDate(new Date().toISOString().split('T')[0]);
    setOvertimeHours('');
    setOvertimeRate('1.5');
    setOvertimeAmount('');
    setOvertimeNotes('');
  };

  // Salary Mutation
  const createSalaryMutation = useMutation({
    mutationFn: (data: any) => employeeService.createSalary(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-salaries', empId] });
      setActiveModal(null);
      resetForm();
    },
  });

  // Leave Mutation
  const createLeaveMutation = useMutation({
    mutationFn: (data: any) => employeeService.createLeave(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-leaves', empId] });
      setActiveModal(null);
      resetForm();
    },
  });

  // Overtime Mutation
  const createOvertimeMutation = useMutation({
    mutationFn: (data: any) => employeeService.createOvertime(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-overtimes', empId] });
      setActiveModal(null);
      resetForm();
    },
  });

  const handleCreateSalary = () => {
    createSalaryMutation.mutate({
      employeeId: empId,
      period,
      baseSalary: baseSalary ? parseFloat(baseSalary) : 0,
      bonus: bonus ? parseFloat(bonus) : 0,
      deduction: deduction ? parseFloat(deduction) : 0,
      netSalary: netSalary ? parseFloat(netSalary) : 0,
      paymentDate: paymentDate || undefined,
      salaryMonth: period,
      status: salaryStatus,
      paymentMethod,
      notes,
    });
  };

  const handleCreateLeave = () => {
    createLeaveMutation.mutate({
      employeeId: empId,
      type: leaveType,
      startDate,
      endDate,
      days: leaveDays ? parseInt(leaveDays) : 1,
      status: leaveStatus,
      notes,
    });
  };

  const handleCreateOvertime = () => {
    createOvertimeMutation.mutate({
      employeeId: empId,
      date: overtimeDate,
      hours: overtimeHours ? parseFloat(overtimeHours) : 0,
      rate: overtimeRate ? parseFloat(overtimeRate) : 1.5,
      amount: overtimeAmount ? parseFloat(overtimeAmount) : 0,
      notes: overtimeNotes,
    });
  };

  const employee = employeeQuery.data?.data;

  const handleConfirmDelete = () => {
    Alert.alert('Personeli Sil', 'Bu personeli silmek istediğinize emin misiniz? Bu işlem geri alınamaz.', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  if (employeeQuery.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!employee) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={{ color: c.text }}>Personel bulunamadı.</Text>
        <IconButton icon="arrow-left" onPress={() => router.back()} iconColor={c.text} />
      </View>
    );
  }

  const getInitials = (first: string, last: string) => {
    return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return (
          <View style={styles.tabContainer}>
            <GlassCard intensity={30} style={styles.cardGlass}>
              <View style={styles.cardContent}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Ad Soyad</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>
                    {employee.first_name} {employee.last_name}
                  </Text>
                </View>
                <Divider style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Pozisyon</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{employee.position || '-'}</Text>
                </View>
                <Divider style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Departman</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{employee.department || '-'}</Text>
                </View>
                <Divider style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textSecondary }]}>T.C. Kimlik No</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{employee.identity_no || '-'}</Text>
                </View>
                <Divider style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Telefon</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{employee.phone || '-'}</Text>
                </View>
                <Divider style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textSecondary }]}>E-posta</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{employee.email || '-'}</Text>
                </View>
                <Divider style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textSecondary }]}>IBAN</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{employee.iban || '-'}</Text>
                </View>
                <Divider style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textSecondary }]}>İşe Giriş Tarihi</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{employee.hire_date || '-'}</Text>
                </View>
                <Divider style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Maaş</Text>
                  <Text style={[styles.detailValue, { color: c.success }]}>{formatCurrency(employee.salary)}</Text>
                </View>
              </View>
            </GlassCard>
          </View>
        );

      case 'salaries':
        return (
          <View style={styles.tabContainer}>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => setActiveModal('salary')}
              style={styles.addTabBtn}
              buttonColor={c.primary}
              textColor="#ffffff"
            >
              Yeni Maaş Ödemesi Ekle
            </Button>
            {salariesQuery.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : (salariesQuery.data?.data || []).length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Kayıtlı maaş ödemesi bulunamadı.</Text>
            ) : (
              (salariesQuery.data?.data || []).map((s: any) => {
                const isPaid = s.status === 'Ödendi' || s.status === 'paid';
                return (
                  <GlassCard key={s.id} intensity={25} style={styles.subCardGlass}>
                    <View style={styles.subCardContent}>
                      <View style={styles.subCardHeader}>
                        <Text style={[styles.subCardTitle, { color: c.text }]}>{s.month} / {s.year}</Text>
                        <Text style={[styles.subCardPrice, { color: isPaid ? c.success : c.error }]}>
                          {formatCurrency(s.amount)}
                        </Text>
                      </View>
                      <View style={styles.subCardFooter}>
                        <Text style={[styles.subCardDate, { color: c.textSecondary }]}>Tarih: {s.payment_date || '-'}</Text>
                        <Text style={[styles.subCardDate, { color: isPaid ? c.success : c.warning }]}>
                          {isPaid ? 'Ödendi' : 'Ödenmedi'}
                        </Text>
                      </View>
                    </View>
                  </GlassCard>
                );
              })
            )}
          </View>
        );

      case 'leaves':
        return (
          <View style={styles.tabContainer}>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => setActiveModal('leave')}
              style={styles.addTabBtn}
              buttonColor={c.primary}
              textColor="#ffffff"
            >
              Yeni İzin Kaydı Ekle
            </Button>
            {leavesQuery.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : (leavesQuery.data?.data || []).length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Kayıtlı izin bulunamadı.</Text>
            ) : (
              (leavesQuery.data?.data || []).map((l: any) => (
                <GlassCard key={l.id} intensity={25} style={styles.subCardGlass}>
                  <View style={styles.subCardContent}>
                    <View style={styles.subCardHeader}>
                      <Text style={[styles.subCardTitle, { color: c.text }]}>{l.type || 'İzin'}</Text>
                      <Text style={[styles.subCardPrice, { color: c.primary }]}>{l.days || 0} gün</Text>
                    </View>
                    <Text style={[styles.subCardDesc, { color: c.textSecondary }]}>{l.description || '-'}</Text>
                    <View style={styles.subCardFooter}>
                      <Text style={[styles.subCardDate, { color: c.textTertiary }]}>Başlangıç: {l.start_date}</Text>
                      <Text style={[styles.subCardDate, { color: c.textTertiary }]}>Bitiş: {l.end_date}</Text>
                    </View>
                  </View>
                </GlassCard>
              ))
            )}
          </View>
        );

      case 'overtimes':
        return (
          <View style={styles.tabContainer}>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => setActiveModal('overtime')}
              style={styles.addTabBtn}
              buttonColor={c.primary}
              textColor="#ffffff"
            >
              Yeni Mesai Kaydı Ekle
            </Button>
            {overtimesQuery.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : (overtimesQuery.data?.data || []).length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Kayıtlı mesai bulunamadı.</Text>
            ) : (
              (overtimesQuery.data?.data || []).map((ot: any) => (
                <GlassCard key={ot.id} intensity={25} style={styles.subCardGlass}>
                  <View style={styles.subCardContent}>
                    <View style={styles.subCardHeader}>
                      <Text style={[styles.subCardTitle, { color: c.text }]}>{ot.description || 'Mesai'}</Text>
                      <Text style={[styles.subCardPrice, { color: c.success }]}>+{ot.hours} saat</Text>
                    </View>
                    <View style={styles.subCardFooter}>
                      <Text style={[styles.subCardDate, { color: c.textSecondary }]}>Tarih: {ot.date}</Text>
                    </View>
                  </View>
                </GlassCard>
              ))
            )}
          </View>
        );

      case 'documents':
        return (
          <View style={styles.tabContainer}>
            {documentsQuery.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : (documentsQuery.data?.data || []).length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Kayıtlı belge bulunamadı.</Text>
            ) : (
              (documentsQuery.data?.data || []).map((d: any) => (
                <GlassCard key={d.id} intensity={25} style={styles.subCardGlass}>
                  <View style={styles.subCardContent}>
                    <View style={styles.subCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="document-text-outline" size={18} color={c.primary} />
                        <Text style={[styles.subCardTitle, { color: c.text }]}>{d.name}</Text>
                      </View>
                      <Text style={[styles.subCardDate, { color: c.textSecondary }]}>{d.type || '-'}</Text>
                    </View>
                    {d.expiry_date && (
                      <Text style={[styles.subCardDate, { color: c.warning, marginTop: 4 }]}>
                        Geçerlilik: {d.expiry_date}
                      </Text>
                    )}
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
        <Text style={[styles.navTitle, { color: c.text }]}>Personel Detayı</Text>
        <IconButton icon="trash-can-outline" size={24} iconColor={c.error} onPress={handleConfirmDelete} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={employeeQuery.isFetching}
            onRefresh={() => employeeQuery.refetch()}
            tintColor={c.primary}
          />
        }
      >
        {/* Profile Card Header */}
        <View style={styles.headerSection}>
          <Avatar.Text
            size={72}
            label={getInitials(employee.first_name, employee.last_name)}
            style={{ backgroundColor: c.primaryContainer + '20', marginBottom: 12 }}
            labelStyle={{ color: c.primary, fontWeight: 'bold' }}
          />
          <Text style={[styles.nameText, { color: c.text }]}>
            {employee.first_name} {employee.last_name}
          </Text>
          <Text style={[styles.positionText, { color: c.textSecondary }]}>
            {employee.position} {employee.department ? `• ${employee.department}` : ''}
          </Text>
        </View>

        {/* Tab Picker Scroll */}
        <View style={styles.tabPicker}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {(['details', 'salaries', 'leaves', 'overtimes', 'documents'] as TabValue[]).map((tab) => {
              const labelMap: Record<TabValue, string> = {
                details: 'Genel',
                salaries: 'Maaş',
                leaves: 'İzin',
                overtimes: 'Mesai',
                documents: 'Belge',
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
                  <Text style={[styles.tabButtonText, { color: isSelected ? c.primary : c.textSecondary }]}>
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

      {/* Add Salary Modal */}
      <Portal>
        <Modal
          visible={activeModal === 'salary'}
          onDismiss={() => { setActiveModal(null); resetForm(); }}
          contentContainerStyle={styles.modalContent}
        >
          <GlassCard intensity={85} style={styles.modalGlassCard}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni Maaş Ödemesi</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <GlassInput
                label="Dönem (YYYY-MM)"
                value={period}
                onChangeText={setPeriod}
                placeholder="örn: 2026-06"
              />
              <GlassInput
                label="Hak Ediş Maaşı (₺)"
                value={baseSalary}
                onChangeText={setBaseSalary}
                keyboardType="numeric"
                placeholder="0.00"
              />
              <GlassInput
                label="Prim / Bonus (₺)"
                value={bonus}
                onChangeText={setBonus}
                keyboardType="numeric"
                placeholder="0.00"
              />
              <GlassInput
                label="Kesinti (₺)"
                value={deduction}
                onChangeText={setDeduction}
                keyboardType="numeric"
                placeholder="0.00"
              />
              <GlassInput
                label="Net Ödenen (₺)"
                value={netSalary}
                onChangeText={setNetSalary}
                keyboardType="numeric"
                placeholder="0.00"
              />
              <GlassInput
                label="Ödeme Tarihi"
                value={paymentDate}
                onChangeText={setPaymentDate}
                placeholder="YYYY-MM-DD"
              />
              <GlassInput
                label="Durum"
                value={salaryStatus}
                onChangeText={setSalaryStatus}
                placeholder="Ödendi / Ödenmedi"
              />
              <GlassInput
                label="Ödeme Yöntemi"
                value={paymentMethod}
                onChangeText={setPaymentMethod}
                placeholder="banka / nakit / kasa"
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
                onPress={handleCreateSalary}
                loading={createSalaryMutation.isPending}
                disabled={createSalaryMutation.isPending || !period || !netSalary}
                buttonColor={c.primary}
                textColor="#ffffff"
              >
                Kaydet
              </Button>
            </View>
          </GlassCard>
        </Modal>
      </Portal>

      {/* Add Leave Modal */}
      <Portal>
        <Modal
          visible={activeModal === 'leave'}
          onDismiss={() => { setActiveModal(null); resetForm(); }}
          contentContainerStyle={styles.modalContent}
        >
          <GlassCard intensity={85} style={styles.modalGlassCard}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni İzin Kaydı</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <GlassInput
                label="İzin Türü"
                value={leaveType}
                onChangeText={setLeaveType}
                placeholder="örn: Yıllık İzin, Rapor, Ücretsiz İzin"
              />
              <GlassInput
                label="Başlangıç Tarihi"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
              />
              <GlassInput
                label="Bitiş Tarihi"
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
              />
              <GlassInput
                label="Gün Sayısı"
                value={leaveDays}
                onChangeText={setLeaveDays}
                keyboardType="numeric"
                placeholder="örn: 1"
              />
              <GlassInput
                label="Durum"
                value={leaveStatus}
                onChangeText={setLeaveStatus}
                placeholder="approved / pending"
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
                onPress={handleCreateLeave}
                loading={createLeaveMutation.isPending}
                disabled={createLeaveMutation.isPending}
                buttonColor={c.primary}
                textColor="#ffffff"
              >
                Kaydet
              </Button>
            </View>
          </GlassCard>
        </Modal>
      </Portal>

      {/* Add Overtime Modal */}
      <Portal>
        <Modal
          visible={activeModal === 'overtime'}
          onDismiss={() => { setActiveModal(null); resetForm(); }}
          contentContainerStyle={styles.modalContent}
        >
          <GlassCard intensity={85} style={styles.modalGlassCard}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni Mesai Kaydı</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <GlassInput
                label="Tarih"
                value={overtimeDate}
                onChangeText={setOvertimeDate}
                placeholder="YYYY-MM-DD"
              />
              <GlassInput
                label="Mesai Saati"
                value={overtimeHours}
                onChangeText={setOvertimeHours}
                keyboardType="numeric"
                placeholder="örn: 4"
              />
              <GlassInput
                label="Saat Oranı"
                value={overtimeRate}
                onChangeText={setOvertimeRate}
                keyboardType="numeric"
                placeholder="1.5 veya 2.0"
              />
              <GlassInput
                label="Toplam Ödeme (₺)"
                value={overtimeAmount}
                onChangeText={setOvertimeAmount}
                keyboardType="numeric"
                placeholder="0.00"
              />
              <GlassInput
                label="Notlar"
                value={overtimeNotes}
                onChangeText={setOvertimeNotes}
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
                onPress={handleCreateOvertime}
                loading={createOvertimeMutation.isPending}
                disabled={createOvertimeMutation.isPending || !overtimeHours || !overtimeAmount}
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
  nameText: { fontSize: 22, fontWeight: '800' },
  positionText: { fontSize: 14, marginTop: 4 },
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
  detailValue: { fontSize: 14, fontWeight: '600', maxWidth: '70%' },
  tabLoader: { marginVertical: 20 },
  emptyText: { textAlign: 'center', marginVertical: 40, fontSize: 14 },
  subCardGlass: { padding: 0, marginBottom: 8 },
  subCardContent: { padding: 16 },
  subCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subCardTitle: { fontSize: 15, fontWeight: '600' },
  subCardPrice: { fontSize: 15, fontWeight: '700' },
  subCardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  subCardDate: { fontSize: 12 },
  subCardDesc: { fontSize: 13, marginBottom: 4 },
  addTabBtn: { marginBottom: 12, borderRadius: 12 },
  modalContent: { padding: 12, margin: 12 },
  modalGlassCard: { padding: 16, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
});

