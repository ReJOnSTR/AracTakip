import { useState, useEffect } from 'react';
import { getFileUrl } from '../services/api';
import GlassModal from '../components/ui/GlassModal';
import SwipeBackView from '../components/ui/SwipeBackView';
import {
  View,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Pressable,
  RefreshControl,
  Alert,
  Clipboard,
  Platform,
  Linking,
} from 'react-native';
import { Text, ActivityIndicator, IconButton, Divider, Avatar, Button, Searchbar, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { employeeService } from '../services/dataServices';
import { formatCurrency, formatDate } from '../utils/format';
import MovingBackground from '../components/ui/MovingBackground';
import GlassMonthPicker from '../components/ui/GlassMonthPicker';
import GlassCard from '../components/ui/GlassCard';
import GlassInput from '../components/ui/GlassInput';
import GlassDropdown from '../components/ui/GlassDropdown';
import GlassIconButton from '../components/ui/GlassIconButton';

const paymentTypes = [
  { label: 'Maaş', value: 'salary' },
  { label: 'Prim', value: 'bonus' },
  { label: 'Avans', value: 'advance' },
  { label: 'Borç Alma', value: 'loan' },
  { label: 'Borç Ödeme', value: 'loan_payment' },
  { label: 'Mesai Ücreti', value: 'overtime_pay' },
  { label: 'Harcırah', value: 'expense' },
  { label: 'Devir Bakiyesi', value: 'carryover' },
  { label: 'Diğer', value: 'other' }
];

const paymentMethods = [
  { label: 'Nakit', value: 'nakit' },
  { label: 'Kasa', value: 'kasa' },
  { label: 'Banka', value: 'bank' },
  { label: 'Maaştan Düşme', value: 'salary_deduction' }
];

const paymentStatuses = [
  { label: 'Ödendi', value: 'paid' },
  { label: 'Bekliyor', value: 'pending' }
];

const leaveTypes = [
  { label: 'Yıllık İzin', value: 'Yıllık İzin' },
  { label: 'Rapor', value: 'Rapor' },
  { label: 'Ücretsiz İzin', value: 'Ücretsiz İzin' },
  { label: 'Evlilik İzni', value: 'Evlilik İzni' },
  { label: 'Babalık İzni', value: 'Babalık İzni' },
  { label: 'Ölüm İzni', value: 'Ölüm İzni' },
  { label: 'Diğer', value: 'Diğer' }
];

const leaveStatuses = [
  { label: 'Onaylandı', value: 'approved' },
  { label: 'Bekliyor', value: 'pending' }
];

const overtimeRates = [
  { label: '1.5 (Hafta İçi)', value: '1.5' },
  { label: '2.0 (Pazar / Tatil)', value: '2.0' },
  { label: '3.0 (Resmi Bayram)', value: '3.0' }
];

type TabValue = 'details' | 'salaries' | 'salary_history' | 'leaves' | 'overtimes' | 'assignments' | 'documents';

export default function EmployeeDetailScreen() {
  const params = useLocalSearchParams<{ id: string; month?: string; openAdd?: string; hidePlus?: string }>();
  const { id, month } = params;
  const router = useRouter();
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const glassBgColor = Platform.OS === 'web'
    ? (colorScheme === 'dark' ? 'rgba(30, 30, 40, 0.65)' : 'rgba(255, 255, 255, 0.65)')
    : (colorScheme === 'dark' ? 'rgba(30, 30, 40, 0.55)' : 'rgba(255, 255, 255, 0.45)');
  const glassBorderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.5)';

  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    return month ? 'salaries' : 'details';
  });

  const empId = parseInt(id);

  const [currentDate, setCurrentDate] = useState(() => {
    if (month) {
      try {
        const [y, m] = month.split('-');
        return new Date(parseInt(y), parseInt(m) - 1, 1);
      } catch (e) {}
    }
    return new Date();
  });

  // Search & Filter state for detail page tabs
  const [salarySearch, setSalarySearch] = useState('');
  const [salaryStatusFilter, setSalaryStatusFilter] = useState<string | null>(null);
  const [salaryTypeFilter, setSalaryTypeFilter] = useState<string | null>(null);

  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string | null>(null);
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string | null>(null);

  const [overtimeSearch, setOvertimeSearch] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<string | null>(null);
  const [salaryHistorySearch, setSalaryHistorySearch] = useState('');

  // Scroll tracking states for stat cards
  const [salariesScrollIndex, setSalariesScrollIndex] = useState(0);
  const [leavesScrollIndex, setLeavesScrollIndex] = useState(0);
  const [overtimesScrollIndex, setOvertimesScrollIndex] = useState(0);

  // Filter modal visibility states for Salaries, Leaves & Assignments tabs
  const [isSalariesFilterModalVisible, setIsSalariesFilterModalVisible] = useState(false);
  const [isLeavesFilterModalVisible, setIsLeavesFilterModalVisible] = useState(false);
  const [isAssignmentsFilterModalVisible, setIsAssignmentsFilterModalVisible] = useState(false);

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
    enabled: !!empId && (activeTab === 'overtimes' || activeTab === 'leaves'),
  });

  const documentsQuery = useQuery({
    queryKey: ['employee-documents', empId],
    queryFn: () => employeeService.getDocuments(empId),
    enabled: !!empId && activeTab === 'documents',
  });

  const assignmentsQuery = useQuery({
    queryKey: ['employee-assignments', empId],
    queryFn: () => employeeService.getAssignments(empId),
    enabled: !!empId && activeTab === 'assignments',
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: () => employeeService.delete(empId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      router.push('/employees-list');
    },
  });

  // Modal State
  const [activeModal, setActiveModal] = useState<'salary' | 'leave' | 'overtime' | null>(null);
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // Edit fields
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editIban, setEditIban] = useState('');
  const [editHireDate, setEditHireDate] = useState('');
  const [editSalary, setEditSalary] = useState('');

  useEffect(() => {
    router.setParams({ hidePlus: activeTab === 'details' ? 'true' : 'false' });
  }, [activeTab]);

  useEffect(() => {
    if (params.openAdd === 'true') {
      if (activeTab === 'salaries') setActiveModal('salary');
      else if (activeTab === 'leaves') setActiveModal('leave');
      else if (activeTab === 'overtimes') setActiveModal('overtime');
      router.setParams({ openAdd: undefined });
    }
  }, [params.openAdd, activeTab]);


  const getMonthStr = (date: Date) => {
    return date.toISOString().slice(0, 7); // e.g. "2026-06"
  };

  const getMonthLabel = (date: Date) => {
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const onPrevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const onNextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  let touchStartX = 0;
  const handleTouchStart = (e: any) => {
    if (['salaries', 'leaves', 'overtimes'].includes(activeTab)) {
      touchStartX = e.nativeEvent.pageX;
    }
  };
  const handleTouchEnd = (e: any) => {
    if (['salaries', 'leaves', 'overtimes'].includes(activeTab)) {
      const touchEndX = e.nativeEvent.pageX;
      const diff = touchEndX - touchStartX;
      if (Math.abs(diff) > 80) {
        if (diff > 0) {
          onPrevMonth();
        } else {
          onNextMonth();
        }
      }
    }
  };

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => employeeService.update(empId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', empId] });
      setIsEditModalVisible(false);
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Güncelleme başarısız oldu.');
    }
  });

  const handleUpdateEmployee = () => {
    if (!editFirstName || !editLastName) {
      Alert.alert('Hata', 'Lütfen ad ve soyad alanlarını doldurun.');
      return;
    }
    updateMutation.mutate({
      firstName: editFirstName,
      lastName: editLastName,
      position: editPosition,
      department: editDepartment,
      email: editEmail,
      phone: editPhone,
      iban: editIban,
      startDate: editHireDate || undefined,
      salary: editSalary ? parseFloat(editSalary) : 0,
    });
  };


  const openEditModal = () => {
    setIsOptionsModalVisible(false);
    setTimeout(() => {
      if (employee) {
        setEditFirstName(employee.first_name || '');
        setEditLastName(employee.last_name || '');
        setEditPosition(employee.position || '');
        setEditDepartment(employee.department || '');
        setEditEmail(employee.email || '');
        setEditPhone(employee.phone || '');
        setEditIban(employee.iban || '');
        setEditHireDate(employee.hire_date || '');
        setEditSalary(String(employee.salary || ''));
        setIsEditModalVisible(true);
      }
    }, 300);
  };


  // Common/Salary fields
  const [paymentType, setPaymentType] = useState('salary');
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().split('T')[0].substring(0, 7)); // YYYY-MM
  const [baseSalary, setBaseSalary] = useState('');
  const [bonus, setBonus] = useState('');
  const [deduction, setDeduction] = useState('');
  const [netSalary, setNetSalary] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryStatus, setSalaryStatus] = useState('paid');
  const [paymentMethod, setPaymentMethod] = useState('nakit');
  const [notes, setNotes] = useState('');

  // Leave fields
  const [leaveType, setLeaveType] = useState('Yıllık İzin');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveDays, setLeaveDays] = useState('1');
  const [leaveStatus, setLeaveStatus] = useState('approved');
  const [leaveUnit, setLeaveUnit] = useState('daily');
  const [leaveHours, setLeaveHours] = useState('');

  // Overtime fields
  const [overtimeDate, setOvertimeDate] = useState(new Date().toISOString().split('T')[0]);
  const [overtimeHours, setOvertimeHours] = useState('');
  const [overtimeRate, setOvertimeRate] = useState('1.5');
  const [overtimeAmount, setOvertimeAmount] = useState('');
  const [overtimeNotes, setOvertimeNotes] = useState('');

  const resetForm = () => {
    const activeMonthStr = getMonthStr(currentDate);
    setPaymentType('salary');
    setSalaryMonth(activeMonthStr);
    setBaseSalary('');
    setBonus('');
    setDeduction('');
    setNetSalary('');
    setPaymentDate(activeMonthStr + '-15');
    setSalaryStatus('paid');
    setPaymentMethod('nakit');
    setNotes('');
    setLeaveType('Yıllık İzin');
    setStartDate(activeMonthStr + '-01');
    setEndDate(activeMonthStr + '-01');
    setLeaveDays('1');
    setLeaveStatus('approved');
    setLeaveUnit('daily');
    setLeaveHours('');
    setOvertimeDate(activeMonthStr + '-01');
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

  const getHistoricalBaseSalary = (emp: any, targetMonth: string) => {
    if (!emp) return 0;
    if (!emp.employee_salary_history || emp.employee_salary_history.length === 0) {
      return emp.salary || 0;
    }
    const [year, month] = targetMonth.split('-').map(Number);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);

    const sortedHistory = [...emp.employee_salary_history].sort(
      (a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );

    for (const record of sortedHistory) {
      const start = new Date(record.start_date);
      const end = record.end_date ? new Date(record.end_date) : null;
      if (start <= endOfMonth && (!end || end >= startOfMonth)) {
        return record.amount || 0;
      }
    }
    const earliestRecord = [...emp.employee_salary_history].sort(
      (a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    )[0];
    return earliestRecord?.amount || emp.salary || 0;
  };

  const calculateEarnedOtDays = (o: any, emp: any, whpl: number, sdpl: number, hdpl: number) => {
    const isHoliday = o.notes && o.notes.includes('[BAYRAM]');
    if (isHoliday) {
      return (o.hours || 0) / hdpl;
    }
    const oRate = o.rate || 0;
    let isWeekday = false;
    if (oRate > 0 && oRate < 5) {
      isWeekday = Math.abs(oRate - 1.5) < 0.1;
    } else {
      const oDateStr = typeof o.date === 'string' ? o.date : new Date(o.date).toISOString();
      const oMonth = oDateStr.slice(0, 7);
      const oSalary = getHistoricalBaseSalary(emp, oMonth) || emp?.salary || 0;
      const oDailyRate = oSalary / 30;
      const oHourlyRate = oDailyRate / 10;
      const oExpectedWeekdayRate = Math.round(oHourlyRate * 1.5 * 100) / 100;
      isWeekday = Math.abs(oRate - oExpectedWeekdayRate) < (oExpectedWeekdayRate * 0.3);
    }
    const divisor = isWeekday ? whpl : sdpl;
    return (o.hours || 0) / divisor;
  };

  const getNextMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month, 1);
    return date.toISOString().slice(0, 7);
  };

  const deleteSalaryMutation = useMutation({
    mutationFn: (salaryId: number) => employeeService.deleteSalary(salaryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-salaries', empId] });
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Silme işlemi başarısız oldu.');
    }
  });

  const handleCarryOver = (netRemaining: number) => {
    const nextMonth = getNextMonth(selectedMonth);
    const existing = (salariesQuery.data?.data || []).find(
      (s: any) => s.salary_month === nextMonth && s.period === 'carryover'
    );

    if (existing) {
      Alert.alert(
        'Devri İptal Et',
        `Gelecek aya yapılan ${formatCurrency(existing.net_salary)} tutarındaki devri iptal etmek istediğinize emin misiniz?`,
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Onaylıyorum', 
            onPress: () => deleteSalaryMutation.mutate(existing.id)
          }
        ]
      );
    } else {
      if (netRemaining === 0) {
        Alert.alert('Uyarı', 'Kalan bakiye 0 olduğu için devredilemez.');
        return;
      }

      Alert.alert(
        'Bakiyeyi Devret',
        `${selectedMonth} ayından kalan ${formatCurrency(netRemaining)} bakiye ${nextMonth} ayına devredilecek. Onaylıyor musunuz?`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Onaylıyorum',
            onPress: () => {
              createSalaryMutation.mutate({
                employeeId: empId,
                period: 'carryover',
                baseSalary: 0,
                bonus: 0,
                deduction: 0,
                netSalary: netRemaining,
                paymentDate: `${nextMonth}-01`,
                salaryMonth: nextMonth,
                status: 'paid',
                paymentMethod: 'other',
                notes: `${selectedMonth} ayından devreden bakiye`,
              });
            }
          }
        ]
      );
    }
  };

  const handleOffsetLeave = (amount: number) => {
    const whpl = 8;
    const sdpl = 1;
    const hdpl = 1;
    const allLeaves = leavesQuery.data?.data || [];
    const allOvertimes = overtimesQuery.data?.data || [];

    const earnedOts = [...allOvertimes]
      .filter((o: any) => o.notes && o.notes.includes('[İZİN OLARAK KULLANILDI]'))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const earnedData = earnedOts.map((o: any) => ({
      date: o.date,
      days: calculateEarnedOtDays(o, employee, whpl, sdpl, hdpl)
    }));

    const totalUsedOT = allLeaves
      .filter((l: any) => l.status === 'approved' && l.type && (l.type.toLowerCase().includes('mesai') || l.type.toLowerCase().includes('mahsup') || l.type === 'offset'))
      .reduce((sum: number, l: any) => sum + (l.hours ? l.hours / whpl : (l.days || 0)), 0);

    let remainingSkip = totalUsedOT;
    let needed = amount;
    const usedDates: string[] = [];

    for (const ot of earnedData) {
      if (needed <= 0) break;
      if (remainingSkip >= ot.days) {
        remainingSkip -= ot.days;
        continue;
      }
      const available = ot.days - remainingSkip;
      remainingSkip = 0;
      const consumed = Math.min(available, needed);
      needed -= consumed;
      usedDates.push(formatDate(ot.date));
    }

    const consumptionNote = usedDates.length > 0 ? ` [Kullanılan Mesailer: ${usedDates.join(', ')}]` : '';
    const amountInHours = Math.round(amount * whpl * 10) / 10;
    const amountText = amount % 1 === 0 ? `${amount} günlük` : `${amountInHours} saatlik`;

    Alert.alert(
      'Mahsup Et',
      `${amountText} yıllık izin borcunu mesai izninden mahsup etmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onaylıyorum',
          onPress: () => {
            const todayStr = new Date().toISOString().split('T')[0];
            const durationText = amount % 1 === 0 ? `${amount} gün` : `${amount * whpl} saat`;
            createLeaveMutation.mutate({
              employeeId: empId,
              type: 'Mahsup',
              startDate: todayStr,
              endDate: todayStr,
              days: amount,
              hours: amount * whpl,
              status: 'approved',
              notes: `[MAHSUP] Yıllık izin borcu kapatıldı. (${durationText})${consumptionNote}`,
            });
          }
        }
      ]
    );
  };

  const handleCreateSalary = () => {
    createSalaryMutation.mutate({
      employeeId: empId,
      period: paymentType,
      baseSalary: baseSalary ? parseFloat(baseSalary) : 0,
      bonus: bonus ? parseFloat(bonus) : 0,
      deduction: deduction ? parseFloat(deduction) : 0,
      netSalary: netSalary ? parseFloat(netSalary) : 0,
      paymentDate: paymentDate || undefined,
      salaryMonth: salaryMonth,
      status: salaryStatus,
      paymentMethod,
      notes,
    });
  };

  const handleCreateLeave = () => {
    const whpl = 8;
    const finalDays = leaveUnit === 'hourly' 
      ? (parseFloat(leaveHours) || 0) / whpl 
      : (leaveDays ? parseFloat(leaveDays) : 1);
    
    const finalHours = leaveUnit === 'hourly' && leaveHours ? parseFloat(leaveHours) : null;
    const finalEndDate = leaveUnit === 'hourly' ? startDate : endDate;

    if (leaveType.toLowerCase().includes('mesai') || leaveType.toLowerCase().includes('mahsup') || leaveType === 'offset') {
      const allLeaves = leavesQuery.data?.data || [];
      const allOvertimes = overtimesQuery.data?.data || [];
      const sdpl = 1;
      const hdpl = 1;
      const earnedOts = allOvertimes.filter((o: any) => o.notes && o.notes.includes('[İZİN OLARAK KULLANILDI]'));
      const totalEarned = earnedOts.reduce((sum: number, o: any) => sum + calculateEarnedOtDays(o, employee, whpl, sdpl, hdpl), 0);
      const totalUsedOT = allLeaves
        .filter((l: any) => l.status === 'approved' && l.type && (l.type.toLowerCase().includes('mesai') || l.type.toLowerCase().includes('mahsup') || l.type === 'offset'))
        .reduce((sum: number, l: any) => sum + (l.hours ? l.hours / whpl : (l.days || 0)), 0);
      const otBalance = Math.round((totalEarned - totalUsedOT) * 100) / 100;

      if (finalDays > otBalance) {
        const balanceText = otBalance % 1 === 0 ? `${otBalance} gün` : `${Math.round(otBalance * whpl * 10) / 10} saat`;
        Alert.alert('Hata', `Yetersiz mesai izni bakiyesi. Mevcut: ${balanceText}.`);
        return;
      }
    }

    createLeaveMutation.mutate({
      employeeId: empId,
      type: leaveType,
      startDate,
      endDate: finalEndDate,
      days: finalDays,
      hours: finalHours,
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
        <Text style={{ color: c.text, marginBottom: 12 }}>Personel bulunamadı.</Text>
        <GlassIconButton icon="chevron-back" onPress={() => router.push('/employees-list')} />
      </View>
    );
  }

  const getInitials = (first: string, last: string) => {
    return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
  };

  const selectedMonth = getMonthStr(currentDate);

  const salariesList = (salariesQuery.data?.data || []).filter((s: any) => {
    if (s.salary_month) {
      return s.salary_month === selectedMonth;
    }
    if (s.payment_date) {
      try {
        const dStr = typeof s.payment_date === 'string' ? s.payment_date : new Date(s.payment_date).toISOString();
        return dStr.startsWith(selectedMonth);
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  const leavesList = (leavesQuery.data?.data || []).filter((l: any) => {
    if (!l.start_date) return false;
    try {
      const dStr = typeof l.start_date === 'string' ? l.start_date : new Date(l.start_date).toISOString();
      return dStr.startsWith(selectedMonth);
    } catch (e) {
      return false;
    }
  });

  const overtimesList = (overtimesQuery.data?.data || []).filter((ot: any) => {
    if (!ot.date) return false;
    try {
      const dStr = typeof ot.date === 'string' ? ot.date : new Date(ot.date).toISOString();
      return dStr.startsWith(selectedMonth);
    } catch (e) {
      return false;
    }
  });

  const filteredSalaries = salariesList.filter((s: any) => {
    const periodLabel = paymentTypes.find(t => t.value === s.period)?.label || s.period || '';
    const matchesSearch = !salarySearch || 
      periodLabel.toLowerCase().includes(salarySearch.toLowerCase()) ||
      (s.notes && s.notes.toLowerCase().includes(salarySearch.toLowerCase()));
    
    const isPaid = s.status === 'Ödendi' || s.status === 'paid';
    const sStatus = isPaid ? 'paid' : 'pending';
    const matchesStatus = !salaryStatusFilter || sStatus === salaryStatusFilter;
    const matchesType = !salaryTypeFilter || s.period === salaryTypeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredLeaves = leavesList.filter((l: any) => {
    const matchesSearch = !leaveSearch || 
      l.type?.toLowerCase().includes(leaveSearch.toLowerCase()) ||
      (l.notes && l.notes.toLowerCase().includes(leaveSearch.toLowerCase()));
    
    const matchesStatus = !leaveStatusFilter || l.status === leaveStatusFilter;
    const matchesType = !leaveTypeFilter || l.type === leaveTypeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredOvertimes = overtimesList.filter((ot: any) => {
    const matchesSearch = !overtimeSearch || 
      (ot.notes && ot.notes.toLowerCase().includes(overtimeSearch.toLowerCase())) ||
      String(ot.hours).includes(overtimeSearch) ||
      String(ot.amount).includes(overtimeSearch);
    return matchesSearch;
  });

  const filteredDocuments = (documentsQuery.data?.data || []).filter((d: any) => {
    const matchesSearch = !docSearch || 
      d.name?.toLowerCase().includes(docSearch.toLowerCase()) ||
      d.type?.toLowerCase().includes(docSearch.toLowerCase());
    return matchesSearch;
  });

  const filteredAssignments = (assignmentsQuery.data?.data || []).filter((a: any) => {
    const matchesSearch = !assignmentSearch || 
      (a.item_name && a.item_name.toLowerCase().includes(assignmentSearch.toLowerCase())) ||
      (a.serial_number && a.serial_number.toLowerCase().includes(assignmentSearch.toLowerCase())) ||
      (a.notes && a.notes.toLowerCase().includes(assignmentSearch.toLowerCase()));
    
    const matchesStatus = !assignmentStatusFilter || a.status === assignmentStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const salaryHistoryList = employeeQuery.data?.data?.employee_salary_history || [];
  const filteredSalaryHistory = salaryHistoryList.filter((sh: any) => {
    const matchesSearch = !salaryHistorySearch ||
      (sh.description && sh.description.toLowerCase().includes(salaryHistorySearch.toLowerCase())) ||
      (sh.type && sh.type.toLowerCase().includes(salaryHistorySearch.toLowerCase())) ||
      String(sh.amount).includes(salaryHistorySearch);
    return matchesSearch;
  });

  const formatSalaryPeriod = (s: any) => {
    const period = s.salary_month || (s.payment_date ? (typeof s.payment_date === 'string' ? s.payment_date : new Date(s.payment_date).toISOString()).slice(0, 7) : null) || (s.created_at ? (typeof s.created_at === 'string' ? s.created_at : new Date(s.created_at).toISOString()).slice(0, 7) : null);
    if (!period) return 'Bilinmeyen Dönem';
    try {
      const [year, month] = period.split('-');
      const months = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
      ];
      const mIndex = parseInt(month) - 1;
      return `${months[mIndex] || month} ${year}`;
    } catch (e) {
      return period;
    }
  };

  const handleCopy = (text: string, label: string) => {
    if (!text || text === '-') {
      Alert.alert('Hata', 'Kopyalanacak bilgi bulunamadı.');
      return;
    }
    Clipboard.setString(text);
    Alert.alert('Kopyalandı', `${label} panoya kopyalandı.`);
  };

  const renderTabContent = () => {
    const boxBorderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const boxBgColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)';
    const actionButtonBg = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)';

    switch (activeTab) {
      case 'details':
        return (
          <View style={styles.tabContainer}>
            {/* Group 1: Görev ve Finans Bilgileri */}
            <GlassCard intensity={30} style={styles.sectionCard}>
              <Text style={[styles.sectionTitle, { color: c.primary }]}>Görev ve Maaş Bilgileri</Text>
              
              <View style={styles.gridRow}>
                <View style={[styles.gridCol, { borderColor: boxBorderColor, backgroundColor: boxBgColor }]}>
                  <View style={styles.fieldHeader}>
                    <Ionicons name="briefcase-outline" size={14} color={c.primary} />
                    <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Pozisyon</Text>
                  </View>
                  <Text style={[styles.fieldValue, { color: c.text }]} numberOfLines={1}>
                    {employee.position || '-'}
                  </Text>
                </View>

                <View style={[styles.gridCol, { borderColor: boxBorderColor, backgroundColor: boxBgColor }]}>
                  <View style={styles.fieldHeader}>
                    <Ionicons name="business-outline" size={14} color={c.primary} />
                    <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Departman</Text>
                  </View>
                  <Text style={[styles.fieldValue, { color: c.text }]} numberOfLines={1}>
                    {employee.department || '-'}
                  </Text>
                </View>
              </View>

              <View style={styles.gridRow}>
                <View style={[styles.gridCol, { borderColor: boxBorderColor, backgroundColor: boxBgColor }]}>
                  <View style={styles.fieldHeader}>
                    <Ionicons name="calendar-outline" size={14} color={c.primary} />
                    <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>İşe Giriş</Text>
                  </View>
                  <Text style={[styles.fieldValue, { color: c.text }]} numberOfLines={1}>
                    {employee.hire_date || '-'}
                  </Text>
                </View>

                <View style={[styles.gridCol, { borderColor: boxBorderColor, backgroundColor: boxBgColor }]}>
                  <View style={styles.fieldHeader}>
                    <Ionicons name="cash-outline" size={14} color={c.success} />
                    <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Maaş</Text>
                  </View>
                  <Text style={[styles.fieldValue, { color: c.success }]} numberOfLines={1}>
                    {formatCurrency(employee.salary)}
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Group 2: Kişisel ve İletişim Bilgileri */}
            <GlassCard intensity={30} style={styles.sectionCard}>
              <Text style={[styles.sectionTitle, { color: c.primary }]}>Kişisel ve İletişim</Text>

              {/* T.C. Kimlik No */}
              <View style={[styles.fullWidthField, { borderColor: boxBorderColor, backgroundColor: boxBgColor }]}>
                <View style={styles.actionRow}>
                  <View style={styles.valueContainer}>
                    <View style={styles.fieldHeader}>
                      <Ionicons name="card-outline" size={14} color={c.primary} />
                      <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>T.C. Kimlik Numarası</Text>
                    </View>
                    <Text style={[styles.fieldValue, { color: c.text }]} numberOfLines={1}>
                      {employee.identity_no || '-'}
                    </Text>
                  </View>
                  {employee.identity_no && (
                    <Pressable 
                      onPress={() => handleCopy(employee.identity_no, 'T.C. Kimlik Numarası')}
                      style={[styles.copyBtn, { backgroundColor: actionButtonBg }]}
                    >
                      <Ionicons name="copy-outline" size={16} color={c.primary} />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Telefon */}
              <View style={[styles.fullWidthField, { borderColor: boxBorderColor, backgroundColor: boxBgColor }]}>
                <View style={styles.actionRow}>
                  <View style={styles.valueContainer}>
                    <View style={styles.fieldHeader}>
                      <Ionicons name="call-outline" size={14} color={c.primary} />
                      <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Telefon</Text>
                    </View>
                    <Text style={[styles.fieldValue, { color: c.text }]} numberOfLines={1}>
                      {employee.phone || '-'}
                    </Text>
                  </View>
                  {employee.phone && employee.phone !== '-' && (
                    <Pressable 
                      onPress={() => Linking.openURL(`tel:${employee.phone}`)}
                      style={[styles.copyBtn, { backgroundColor: actionButtonBg }]}
                    >
                      <Ionicons name="call" size={16} color={c.success} />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* E-posta */}
              <View style={[styles.fullWidthField, { borderColor: boxBorderColor, backgroundColor: boxBgColor }]}>
                <View style={styles.actionRow}>
                  <View style={styles.valueContainer}>
                    <View style={styles.fieldHeader}>
                      <Ionicons name="mail-outline" size={14} color={c.primary} />
                      <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>E-posta</Text>
                    </View>
                    <Text style={[styles.fieldValue, { color: c.text }]} numberOfLines={1}>
                      {employee.email || '-'}
                    </Text>
                  </View>
                  {employee.email && employee.email !== '-' && (
                    <Pressable 
                      onPress={() => Linking.openURL(`mailto:${employee.email}`)}
                      style={[styles.copyBtn, { backgroundColor: actionButtonBg }]}
                    >
                      <Ionicons name="mail" size={16} color={c.primary} />
                    </Pressable>
                  )}
                </View>
              </View>
            </GlassCard>

            {/* Group 3: Banka Bilgileri */}
            <GlassCard intensity={30} style={styles.sectionCard}>
              <Text style={[styles.sectionTitle, { color: c.primary }]}>Banka ve Ödeme Bilgileri</Text>
              
              <View style={[styles.fullWidthField, { borderColor: boxBorderColor, backgroundColor: boxBgColor }]}>
                <View style={styles.fieldHeader}>
                  <Ionicons name="wallet-outline" size={14} color={c.primary} />
                  <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>IBAN Adresi</Text>
                </View>
                <Text style={[styles.fieldValue, styles.monoText, { color: c.text, marginVertical: 6 }]} numberOfLines={2}>
                  {employee.iban || '-'}
                </Text>
                {employee.iban && employee.iban !== '-' && (
                  <Button 
                    mode="contained-tonal"
                    icon="content-copy"
                    onPress={() => handleCopy(employee.iban, 'IBAN')}
                    buttonColor={colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)'}
                    textColor={c.primary}
                    style={{ marginTop: 6, borderRadius: 8 }}
                  >
                    IBAN Kopyala
                  </Button>
                )}
              </View>
            </GlassCard>
          </View>
        );

      case 'salaries': {
        const allOvertimes = overtimesQuery.data?.data || [];
        const monthlyOvertimes = allOvertimes.filter((o: any) => {
          if (!o.date) return false;
          const dStr = typeof o.date === 'string' ? o.date : new Date(o.date).toISOString();
          return dStr.startsWith(selectedMonth) && (!o.notes || !o.notes.includes('[İZİN OLARAK KULLANILDI]'));
        });
        const totalOtTarget = monthlyOvertimes.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
        const baseSalaryTarget = getHistoricalBaseSalary(employee, selectedMonth) || 0;
        
        const carryOverAmount = salariesList.filter((s: any) => s.period === 'carryover' && (s.status === 'paid' || s.status === 'Ödendi')).reduce((sum: number, s: any) => sum + (s.net_salary || 0), 0);
        const netTarget = baseSalaryTarget + totalOtTarget + carryOverAmount;

        const paidSalary = salariesList.filter((s: any) => (s.status === 'paid' || s.status === 'Ödendi') && s.period === 'salary').reduce((sum: number, s: any) => sum + (s.net_salary || 0), 0);
        const paidOt = salariesList.filter((s: any) => (s.status === 'paid' || s.status === 'Ödendi') && s.period === 'overtime_pay').reduce((sum: number, s: any) => sum + (s.net_salary || 0), 0);
        const paidAdvance = salariesList.filter((s: any) => (s.status === 'paid' || s.status === 'Ödendi') && s.period === 'advance').reduce((sum: number, s: any) => sum + (s.net_salary || 0), 0);
        const paidLoanDeduction = salariesList.filter((s: any) => (s.status === 'paid' || s.status === 'Ödendi') && s.period === 'loan_payment' && s.payment_method === 'salary_deduction').reduce((sum: number, s: any) => sum + (s.net_salary || 0), 0);
        const totalPaid = paidSalary + paidOt + paidAdvance + paidLoanDeduction;

        const remainingSalary = baseSalaryTarget - paidSalary - paidAdvance - paidLoanDeduction;
        const remainingOt = totalOtTarget - paidOt;
        
        const nextMonthForDevir = getNextMonth(selectedMonth);
        const outboundCarryOver = (salariesQuery.data?.data || []).find((s: any) => s.salary_month === nextMonthForDevir && s.period === 'carryover');
        const outboundCarryOverAmount = outboundCarryOver ? (outboundCarryOver.net_salary || 0) : 0;
        const netRemaining = remainingSalary + remainingOt + carryOverAmount - outboundCarryOverAmount;

        const lastPaidDate = (() => {
          const paidRecords = salariesList.filter((s: any) => (s.status === 'paid' || s.status === 'Ödendi') && (s.payment_date || s.created_at));
          if (paidRecords.length === 0) return null;
          const maxTime = Math.max(...paidRecords.map((r: any) => new Date(r.payment_date || r.created_at).getTime()));
          return new Date(maxTime);
        })();

        const pendingCount = salariesList.filter((s: any) => s.status === 'pending' || s.status === 'Bekliyor').length;
        const progress = netTarget > 0 ? Math.round((totalPaid / netTarget) * 100) : 0;

        const sortedLoans = (salariesQuery.data?.data || [])
          .filter((s: any) => (s.status === 'paid' || s.status === 'Ödendi') && (s.period === 'loan' || s.period === 'loan_payment'))
          .sort((a: any, b: any) => new Date(a.payment_date || a.created_at).getTime() - new Date(b.payment_date || b.created_at).getTime());

        let activeLoanTaken = 0;
        let activeLoanPaid = 0;
        for (const s of sortedLoans) {
          if (s.period === 'loan') {
            activeLoanTaken += (s.net_salary || 0);
          } else if (s.period === 'loan_payment') {
            activeLoanPaid += (s.net_salary || 0);
          }
          if (activeLoanTaken > 0 && (activeLoanTaken - activeLoanPaid) <= 0) {
            activeLoanTaken = 0;
            activeLoanPaid = 0;
          }
        }
        const activeRemainingLoan = activeLoanTaken - activeLoanPaid;
        const hasLoanHistory = sortedLoans.length > 0;

        return (
          <View style={styles.tabContainer}>
            {/* Stat Cards Scroll Row */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.statsScroll} 
              contentContainerStyle={{ paddingRight: 20 }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const index = Math.round(x / 232); // card width (220) + margin (12)
                setSalariesScrollIndex(index);
              }}
              scrollEventThrottle={16}
            >
              <GlassCard intensity={25} style={styles.statCardGlass}>
                <View>
                  <Text style={[styles.statCardLabel, { color: c.textSecondary }]}>Ödenecek Tutar</Text>
                  <Text style={[styles.statCardValue, { color: c.text }]}>{formatCurrency(netTarget)}</Text>
                  <Text style={[styles.statCardSubtitle, { color: c.textTertiary }]}>
                    Maaş: {formatCurrency(baseSalaryTarget)} • Mesai: {formatCurrency(totalOtTarget)}
                  </Text>
                </View>
              </GlassCard>

              <GlassCard intensity={25} style={styles.statCardGlass}>
                <View>
                  <Text style={[styles.statCardLabel, { color: c.textSecondary }]}>Ödenen</Text>
                  <Text style={[styles.statCardValue, { color: c.success }]}>{formatCurrency(totalPaid)}</Text>
                  <Text style={[styles.statCardSubtitle, { color: c.textTertiary }]}>
                    {salariesList.filter((s: any) => s.status === 'paid' || s.status === 'Ödendi').length} İşlem • {lastPaidDate ? `Son: ${formatDate(lastPaidDate.toISOString())}` : 'Ödeme Yok'}
                  </Text>
                </View>
              </GlassCard>

              <GlassCard intensity={25} style={styles.statCardGlass}>
                <View>
                  <Text style={[styles.statCardLabel, { color: c.textSecondary }]}>Kalan Maaş Bakiyesi</Text>
                  <Text style={[styles.statCardValue, { color: c.warning }]}>{formatCurrency(netRemaining)}</Text>
                  <Text style={[styles.statCardSubtitle, { color: c.textTertiary }]}>
                    %{progress} Ödendi • {pendingCount} Bekleyen
                  </Text>
                </View>
                <Pressable 
                  style={{
                    backgroundColor: c.primaryContainer + '20',
                    borderColor: c.primary,
                    borderWidth: 0.5,
                    borderRadius: 6,
                    paddingVertical: 5,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 8
                  }}
                  onPress={() => handleCarryOver(netRemaining)}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: c.primary }}>
                    {outboundCarryOver ? 'Devri İptal Et' : 'Gelecek Aya Devret'}
                  </Text>
                </Pressable>
              </GlassCard>

              {hasLoanHistory && (
                <GlassCard intensity={25} style={styles.statCardGlass}>
                  <View>
                    <Text style={[styles.statCardLabel, { color: c.textSecondary }]}>Güncel Borç Bakiyesi</Text>
                    <Text style={[styles.statCardValue, { color: c.text }]}>
                      {formatCurrency(activeRemainingLoan > 0 ? activeRemainingLoan : 0)}
                    </Text>
                    <Text style={[styles.statCardSubtitle, { color: c.textTertiary }]}>
                      Alınan: {formatCurrency(activeLoanTaken)} • Ödenen: {formatCurrency(activeLoanPaid)}
                    </Text>
                  </View>
                </GlassCard>
              )}
            </ScrollView>

            {/* Scroll Indicator Dots */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 2, marginBottom: 8, gap: 4 }}>
              {[0, 1, 2, ...(hasLoanHistory ? [3] : [])].map((i) => (
                <View 
                  key={i} 
                  style={{ 
                    width: salariesScrollIndex === i ? 14 : 6, 
                    height: 4, 
                    borderRadius: 2, 
                    backgroundColor: salariesScrollIndex === i ? c.primary : c.textTertiary + '40' 
                  }} 
                />
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <Searchbar
                placeholder="Ödeme ara..."
                value={salarySearch}
                onChangeText={setSalarySearch}
                style={[styles.searchBarCompact, { flex: 1, backgroundColor: glassBgColor, borderColor: glassBorderColor, marginBottom: 0 }]}
                inputStyle={[styles.searchInputCompact, { color: c.text }]}
                placeholderTextColor={c.textTertiary}
                iconColor={c.textSecondary}
              />
              <Pressable
                onPress={() => setIsSalariesFilterModalVisible(true)}
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
                <Ionicons name="funnel-outline" size={16} color={salaryStatusFilter || salaryTypeFilter ? c.primary : c.textSecondary} />
                {(salaryStatusFilter || salaryTypeFilter) && (
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

            {salariesQuery.isLoading ? (
               <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : filteredSalaries.length === 0 ? (
               <Text style={[styles.emptyText, { color: c.textSecondary, marginTop: 10 }]}>Kayıt bulunamadı.</Text>
            ) : (
               filteredSalaries.map((s: any) => {
                 const isPaid = s.status === 'Ödendi' || s.status === 'paid';
                 return (
                   <GlassCard key={s.id} intensity={25} style={styles.subCardGlass}>
                     <View style={styles.subCardContent}>
                       <View style={styles.subCardHeader}>
                         <Text style={[styles.subCardTitle, { color: c.text }]}>
                           {paymentTypes.find(t => t.value === s.period)?.label || s.period} ({formatSalaryPeriod(s)})
                         </Text>
                         <Text style={[styles.subCardPrice, { color: isPaid ? c.success : c.error }]}>
                           {formatCurrency(s.net_salary)}
                         </Text>
                       </View>
                       <View style={styles.subCardFooter}>
                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                           <Ionicons name="calendar-outline" size={12} color={c.textSecondary} />
                           <Text style={[styles.subCardDate, { color: c.textSecondary }]}>Tarih: {formatDate(s.payment_date)}</Text>
                         </View>
                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                           <Ionicons 
                             name={isPaid ? "checkmark-circle-outline" : "alert-circle-outline"} 
                             size={12} 
                             color={isPaid ? c.success : c.warning} 
                           />
                           <Text style={[styles.subCardDate, { color: isPaid ? c.success : c.warning }]}>
                             {isPaid ? 'Ödendi' : 'Ödenmedi'}
                           </Text>
                         </View>
                       </View>
                       {s.notes ? (
                         <Text style={[styles.subCardDesc, { color: c.textTertiary, marginTop: 6, fontStyle: 'italic' }]}>
                           Not: {s.notes}
                         </Text>
                       ) : null}
                     </View>
                   </GlassCard>
                 );
               })
            )}

            {/* Salaries Filter Modal */}
            <GlassModal visible={isSalariesFilterModalVisible} onDismiss={() => setIsSalariesFilterModalVisible(false)}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Ödeme Filtrele</Text>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                
                {/* Type Filter */}
                <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 8 }]}>Ödeme Türü</Text>
                <View style={[styles.filterRow, { flexWrap: 'wrap', gap: 8, marginTop: 8 }]}>
                  <Pressable
                    onPress={() => setSalaryTypeFilter(null)}
                    style={{
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 1,
                      paddingHorizontal: 16,
                      backgroundColor: !salaryTypeFilter 
                        ? (colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)')
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)'),
                      borderColor: !salaryTypeFilter 
                        ? c.primary 
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ 
                      color: !salaryTypeFilter ? c.primary : c.textSecondary, 
                      fontSize: 13,
                      fontWeight: !salaryTypeFilter ? '600' : '400'
                    }}>
                      Tümü
                    </Text>
                  </Pressable>
                  {paymentTypes.map((opt) => {
                    const isSelected = salaryTypeFilter === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setSalaryTypeFilter(isSelected ? null : opt.value)}
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

                {/* Status Filter */}
                <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 16 }]}>Ödeme Durumu</Text>
                <View style={[styles.filterRow, { flexWrap: 'wrap', gap: 8, marginTop: 8 }]}>
                  <Pressable
                    onPress={() => setSalaryStatusFilter(null)}
                    style={{
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 1,
                      paddingHorizontal: 16,
                      backgroundColor: !salaryStatusFilter 
                        ? (colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)')
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)'),
                      borderColor: !salaryStatusFilter 
                        ? c.primary 
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ 
                      color: !salaryStatusFilter ? c.primary : c.textSecondary, 
                      fontSize: 13,
                      fontWeight: !salaryStatusFilter ? '600' : '400'
                    }}>
                      Tümü
                    </Text>
                  </Pressable>
                  {paymentStatuses.map((opt) => {
                    const isSelected = salaryStatusFilter === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setSalaryStatusFilter(isSelected ? null : opt.value)}
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
                    setSalaryTypeFilter(null);
                    setSalaryStatusFilter(null);
                  }} 
                  textColor={c.textSecondary}
                >
                  Temizle
                </Button>
                <Button mode="contained" onPress={() => setIsSalariesFilterModalVisible(false)} buttonColor={c.primary} textColor="#fff">
                  Uygula
                </Button>
              </View>
            </GlassModal>
          </View>
        );
      }

      case 'leaves': {
        const allLeaves = leavesQuery.data?.data || [];
        const allOvertimes = overtimesQuery.data?.data || [];
        
        // Yıllık İzin calculations
        const startDateStr = employee.start_date || employee.hire_date;
        let balance = 0;
        let otBalance = 0;
        
        if (startDateStr) {
          const start = new Date(startDateStr);
          const birth = employee.birth_date ? new Date(employee.birth_date) : null;
          const now = new Date();

          const yearsMilli = now.getTime() - start.getTime();
          const years = Math.floor(yearsMilli / (1000 * 60 * 60 * 24 * 365.25));

          let totalAccrued = 0;
          for (let i = 1; i <= years; i++) {
            let daysThisYear = 0;
            if (i <= 5) daysThisYear = 14;
            else if (i < 15) daysThisYear = 20;
            else daysThisYear = 26;

            if (birth) {
              const ageAtThatYear = Math.floor((start.getTime() + (i * 365.25 * 24 * 60 * 60 * 1000) - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
              if (ageAtThatYear <= 18 || ageAtThatYear >= 50) {
                daysThisYear = Math.max(daysThisYear, 20);
              }
            }
            totalAccrued += daysThisYear;
          }

          const pastUsed = employee.past_used_leaves || 0;
          const systemUsedAnnual = allLeaves.filter((l: any) => 
            l.status === 'approved' && 
            (l.type === 'annual' || (l.type && l.type.toLowerCase().includes('yıllık')))
          ).reduce((acc: number, l: any) => acc + (l.days || 0), 0);

          const whpl = 8;
          const sdpl = 1;
          const hdpl = 1;
          const earnedOts = allOvertimes.filter((o: any) => o.notes && o.notes.includes('[İZİN OLARAK KULLANILDI]'));
          const totalEarned = earnedOts.reduce((sum: number, o: any) => sum + calculateEarnedOtDays(o, employee, whpl, sdpl, hdpl), 0);
          const totalUsedOT = allLeaves.filter((l: any) => l.status === 'approved' && l.type && (l.type.toLowerCase().includes('mesai') || l.type.toLowerCase().includes('mahsup') || l.type === 'offset')).reduce((sum: number, l: any) => sum + (l.hours ? l.hours / whpl : (l.days || 0)), 0);
          otBalance = Math.round((totalEarned - totalUsedOT) * 100) / 100;

          const totalOffsets = allLeaves.filter((l: any) => l.status === 'approved' && l.type && (l.type === 'offset' || l.type.toLowerCase() === 'mahsup')).reduce((acc: number, l: any) => acc + (l.hours ? l.hours / whpl : (l.days || 0)), 0);
          balance = totalAccrued - pastUsed - systemUsedAnnual + totalOffsets;
        }

        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const usedThisMonth = allLeaves.filter((l: any) =>
          l.status === 'approved' &&
          ((l.start_date && (typeof l.start_date === 'string' ? l.start_date : new Date(l.start_date).toISOString()).startsWith(currentMonthStr)) || 
           (l.end_date && (typeof l.end_date === 'string' ? l.end_date : new Date(l.end_date).toISOString()).startsWith(currentMonthStr)))
        ).reduce((acc: number, l: any) => acc + (l.days || 1), 0);

        const pendingLeavesCount = allLeaves.filter((l: any) => l.status === 'pending' || l.status === 'bekliyor').length;

        return (
          <View style={styles.tabContainer}>
            {/* Stat Cards Scroll Row */}
            {/* Stat Cards Scroll Row */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.statsScroll} 
              contentContainerStyle={{ paddingRight: 20 }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const index = Math.round(x / 232); // card width (220) + margin (12)
                setLeavesScrollIndex(index);
              }}
              scrollEventThrottle={16}
            >
              <GlassCard intensity={25} style={styles.statCardGlass}>
                <View>
                  <Text style={[styles.statCardLabel, { color: c.textSecondary }]}>Kalan Yıllık İzin</Text>
                  <Text style={[styles.statCardValue, { color: balance < 0 ? c.error : c.primary }]}>
                    {(() => {
                      const whpl = 8;
                      const hours = Math.round(balance * whpl * 10) / 10;
                      if (hours === 0) return '0 gün';
                      if (hours % whpl === 0) {
                        return `${balance} gün`;
                      }
                      return `${hours} saat`;
                    })()}
                  </Text>
                  <Text style={[styles.statCardSubtitle, { color: c.textTertiary }]}>İşe Giriş: {startDateStr || '-'}</Text>
                </View>
                {balance < 0 && otBalance > 0 && (
                  <Pressable 
                    style={{
                      backgroundColor: c.primaryContainer + '20',
                      borderColor: c.primary,
                      borderWidth: 0.5,
                      borderRadius: 6,
                      paddingVertical: 5,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 8
                    }}
                    onPress={() => handleOffsetLeave(Math.min(Math.abs(balance), otBalance))}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: c.primary }}>Mahsup Et</Text>
                  </Pressable>
                )}
              </GlassCard>

              <GlassCard intensity={25} style={styles.statCardGlass}>
                <View>
                  <Text style={[styles.statCardLabel, { color: c.textSecondary }]}>Bu Ay Kullanılan</Text>
                  <Text style={[styles.statCardValue, { color: c.text }]}>
                    {(() => {
                      const whpl = 8;
                      const hours = Math.round(usedThisMonth * whpl * 10) / 10;
                      if (hours === 0) return '0 gün';
                      if (hours % whpl === 0) {
                        return `${usedThisMonth} gün`;
                      }
                      return `${hours} saat`;
                    })()}
                  </Text>
                  <Text style={[styles.statCardSubtitle, { color: c.textTertiary }]}>Onaylı izinler</Text>
                </View>
              </GlassCard>

              <GlassCard intensity={25} style={styles.statCardGlass}>
                <View>
                  <Text style={[styles.statCardLabel, { color: c.textSecondary }]}>Bekleyen İzinler</Text>
                  <Text style={[styles.statCardValue, { color: pendingLeavesCount > 0 ? c.warning : c.text }]}>
                    {pendingLeavesCount} kayıt
                  </Text>
                  <Text style={[styles.statCardSubtitle, { color: c.textTertiary }]}>Onay bekleyenler</Text>
                </View>
              </GlassCard>

              <GlassCard intensity={25} style={[styles.statCardGlass, otBalance > 0 ? { borderColor: c.primary, borderWidth: 1 } : {}]}>
                <View>
                  <Text style={[styles.statCardLabel, { color: otBalance > 0 ? c.primary : c.textSecondary }]}>Kalan Mesai İzni</Text>
                  <Text style={[styles.statCardValue, { color: otBalance < 0 ? c.error : c.text }]}>
                    {(() => {
                      const whpl = 8;
                      const hours = Math.round(otBalance * whpl * 10) / 10;
                      if (hours === 0) return '0 gün';
                      if (hours % whpl === 0) {
                        return `${otBalance} gün`;
                      }
                      return `${hours} saat`;
                    })()}
                  </Text>
                  <Text style={[styles.statCardSubtitle, { color: c.textTertiary }]}>Mesai mahsupları</Text>
                </View>
              </GlassCard>
            </ScrollView>

            {/* Scroll Indicator Dots */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 2, marginBottom: 8, gap: 4 }}>
              {[0, 1, 2, 3].map((i) => (
                <View 
                  key={i} 
                  style={{ 
                    width: leavesScrollIndex === i ? 14 : 6, 
                    height: 4, 
                    borderRadius: 2, 
                    backgroundColor: leavesScrollIndex === i ? c.primary : c.textTertiary + '40' 
                  }} 
                />
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <Searchbar
                placeholder="İzin ara..."
                value={leaveSearch}
                onChangeText={setLeaveSearch}
                style={[styles.searchBarCompact, { flex: 1, backgroundColor: glassBgColor, borderColor: glassBorderColor, marginBottom: 0 }]}
                inputStyle={[styles.searchInputCompact, { color: c.text }]}
                placeholderTextColor={c.textTertiary}
                iconColor={c.textSecondary}
              />
              <Pressable
                onPress={() => setIsLeavesFilterModalVisible(true)}
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
                <Ionicons name="funnel-outline" size={16} color={leaveStatusFilter || leaveTypeFilter ? c.primary : c.textSecondary} />
                {(leaveStatusFilter || leaveTypeFilter) && (
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

            {leavesQuery.isLoading ? (
               <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : filteredLeaves.length === 0 ? (
               <Text style={[styles.emptyText, { color: c.textSecondary, marginTop: 10 }]}>Kayıt bulunamadı.</Text>
            ) : (
               filteredLeaves.map((l: any) => (
                <GlassCard key={l.id} intensity={25} style={styles.subCardGlass}>
                  <View style={styles.subCardContent}>
                    <View style={styles.subCardHeader}>
                      <Text style={[styles.subCardTitle, { color: c.text }]}>{l.type || 'İzin'}</Text>
                      <Text style={[styles.subCardPrice, { color: c.primary }]}>
                        {(() => {
                          const d = parseFloat(l.days);
                          if (l.hours) return `${l.hours} saat`;
                          if (d && d % 1 !== 0) {
                            const whpl = 8;
                            return `${Math.round(d * whpl * 10) / 10} saat`;
                          }
                          return `${d || 0} gün`;
                        })()}
                      </Text>
                    </View>
                    {l.notes ? (
                      <Text style={[styles.subCardDesc, { color: c.textSecondary, marginBottom: 6 }]}>{l.notes}</Text>
                    ) : null}
                    <View style={styles.subCardFooter}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="time-outline" size={12} color={c.textTertiary} />
                        <Text style={[styles.subCardDate, { color: c.textTertiary }]}>
                          {formatDate(l.start_date)} - {formatDate(l.end_date)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </GlassCard>
              ))
            )}

            {/* Leaves Filter Modal */}
            <GlassModal visible={isLeavesFilterModalVisible} onDismiss={() => setIsLeavesFilterModalVisible(false)}>
              <Text style={[styles.modalTitle, { color: c.text }]}>İzin Filtrele</Text>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                
                {/* Type Filter */}
                <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 8 }]}>İzin Türü</Text>
                <View style={[styles.filterRow, { flexWrap: 'wrap', gap: 8, marginTop: 8 }]}>
                  <Pressable
                    onPress={() => setLeaveTypeFilter(null)}
                    style={{
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 1,
                      paddingHorizontal: 16,
                      backgroundColor: !leaveTypeFilter 
                        ? (colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)')
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)'),
                      borderColor: !leaveTypeFilter 
                        ? c.primary 
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ 
                      color: !leaveTypeFilter ? c.primary : c.textSecondary, 
                      fontSize: 13,
                      fontWeight: !leaveTypeFilter ? '600' : '400'
                    }}>
                      Tümü
                    </Text>
                  </Pressable>
                  {leaveTypes.map((opt) => {
                    const isSelected = leaveTypeFilter === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setLeaveTypeFilter(isSelected ? null : opt.value)}
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

                {/* Status Filter */}
                <Text style={[styles.filterSectionTitle, { color: c.textSecondary, marginTop: 16 }]}>İzin Durumu</Text>
                <View style={[styles.filterRow, { flexWrap: 'wrap', gap: 8, marginTop: 8 }]}>
                  <Pressable
                    onPress={() => setLeaveStatusFilter(null)}
                    style={{
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 1,
                      paddingHorizontal: 16,
                      backgroundColor: !leaveStatusFilter 
                        ? (colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)')
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)'),
                      borderColor: !leaveStatusFilter 
                        ? c.primary 
                        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ 
                      color: !leaveStatusFilter ? c.primary : c.textSecondary, 
                      fontSize: 13,
                      fontWeight: !leaveStatusFilter ? '600' : '400'
                    }}>
                      Tümü
                    </Text>
                  </Pressable>
                  {leaveStatuses.map((opt) => {
                    const isSelected = leaveStatusFilter === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setLeaveStatusFilter(isSelected ? null : opt.value)}
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
                    setLeaveTypeFilter(null);
                    setLeaveStatusFilter(null);
                  }} 
                  textColor={c.textSecondary}
                >
                  Temizle
                </Button>
                <Button mode="contained" onPress={() => setIsLeavesFilterModalVisible(false)} buttonColor={c.primary} textColor="#fff">
                  Uygula
                </Button>
              </View>
            </GlassModal>
          </View>
        );
      }

      case 'overtimes': {
        const allOvertimes = overtimesQuery.data?.data || [];
        const monthlyOvertimesList = allOvertimes.filter((o: any) => {
          if (!o.date) return false;
          const dStr = typeof o.date === 'string' ? o.date : new Date(o.date).toISOString();
          return dStr.startsWith(selectedMonth);
        });

        let monthlyWeekdayHours = 0;
        let monthlySundayDays = 0;
        for (const o of monthlyOvertimesList) {
          const isHoliday = o.notes && o.notes.includes('[BAYRAM]');
          if (isHoliday) {
            monthlySundayDays += o.hours || 0;
            continue;
          }
          const oRate = o.rate || 0;
          let isWeekday = false;
          if (oRate > 0 && oRate < 5) {
            isWeekday = Math.abs(oRate - 1.5) < 0.1;
          } else {
            const oDateStr = typeof o.date === 'string' ? o.date : new Date(o.date).toISOString();
            const oMonth = oDateStr.slice(0, 7);
            const oSalary = getHistoricalBaseSalary(employee, oMonth) || employee?.salary || 0;
            const oDailyRate = oSalary / 30;
            const oHourlyRate = oDailyRate / 10;
            const oExpectedWeekdayRate = Math.round(oHourlyRate * 1.5 * 100) / 100;
            isWeekday = Math.abs(oRate - oExpectedWeekdayRate) < (oExpectedWeekdayRate * 0.3);
          }
          if (isWeekday) {
            monthlyWeekdayHours += o.hours || 0;
          } else {
            monthlySundayDays += o.hours || 0;
          }
        }
        
        const monthlyTotalAmount = monthlyOvertimesList.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);

        return (
          <View style={styles.tabContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.statsScroll} 
              contentContainerStyle={{ paddingRight: 20 }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const index = Math.round(x / 232); // card width (220) + margin (12)
                setOvertimesScrollIndex(index);
              }}
              scrollEventThrottle={16}
            >
              <GlassCard intensity={25} style={styles.statCardGlass}>
                <View>
                  <Text style={[styles.statCardLabel, { color: c.textSecondary }]}>Bu Ay Toplam Mesai</Text>
                  <Text style={[styles.statCardValue, { color: c.text }]}>
                    {monthlyWeekdayHours > 0 || monthlySundayDays > 0 ? (
                      `${monthlyWeekdayHours > 0 ? `${monthlyWeekdayHours} sa` : ''}${monthlyWeekdayHours > 0 && monthlySundayDays > 0 ? ' / ' : ''}${monthlySundayDays > 0 ? `${monthlySundayDays} Pazar` : ''}`
                    ) : (
                      '0 sa'
                    )}
                  </Text>
                  <Text style={[styles.statCardSubtitle, { color: c.textTertiary }]}>Çalışılan mesailer</Text>
                </View>
              </GlassCard>

              <GlassCard intensity={25} style={styles.statCardGlass}>
                <View>
                  <Text style={[styles.statCardLabel, { color: c.textSecondary }]}>Bu Ay Toplam Tutar</Text>
                  <Text style={[styles.statCardValue, { color: c.primary }]}>{formatCurrency(monthlyTotalAmount)}</Text>
                  <Text style={[styles.statCardSubtitle, { color: c.textTertiary }]}>Mesai hakedişi</Text>
                </View>
              </GlassCard>

              <GlassCard intensity={25} style={styles.statCardGlass}>
                <View>
                  <Text style={[styles.statCardLabel, { color: c.textSecondary }]}>Bu Ay Kayıt Sayısı</Text>
                  <Text style={[styles.statCardValue, { color: c.text }]}>{monthlyOvertimesList.length}</Text>
                  <Text style={[styles.statCardSubtitle, { color: c.textTertiary }]}>Mesai işlemleri</Text>
                </View>
              </GlassCard>
            </ScrollView>

            {/* Scroll Indicator Dots */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 2, marginBottom: 8, gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <View 
                  key={i} 
                  style={{ 
                    width: overtimesScrollIndex === i ? 14 : 6, 
                    height: 4, 
                    borderRadius: 2, 
                    backgroundColor: overtimesScrollIndex === i ? c.primary : c.textTertiary + '40' 
                  }} 
                />
              ))}
            </View>

            <Searchbar
              placeholder="Mesai ara..."
              value={overtimeSearch}
              onChangeText={setOvertimeSearch}
              style={[styles.searchBarCompact, { backgroundColor: glassBgColor, borderColor: glassBorderColor }]}
              inputStyle={[styles.searchInputCompact, { color: c.text }]}
              placeholderTextColor={c.textTertiary}
              iconColor={c.textSecondary}
            />

            {overtimesQuery.isLoading ? (
               <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : filteredOvertimes.length === 0 ? (
               <Text style={[styles.emptyText, { color: c.textSecondary, marginTop: 10 }]}>Kayıt bulunamadı.</Text>
            ) : (
               filteredOvertimes.map((ot: any) => (
                <GlassCard key={ot.id} intensity={25} style={styles.subCardGlass}>
                  <View style={styles.subCardContent}>
                    <View style={styles.subCardHeader}>
                      <Text style={[styles.subCardTitle, { color: c.text }]}>{ot.notes || 'Mesai'}</Text>
                      <Text style={[styles.subCardPrice, { color: c.success }]}>
                        +{ot.hours} sa ({formatCurrency(ot.amount)})
                      </Text>
                    </View>
                    <View style={styles.subCardFooter}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="calendar-outline" size={12} color={c.textSecondary} />
                        <Text style={[styles.subCardDate, { color: c.textSecondary }]}>Tarih: {formatDate(ot.date)}</Text>
                      </View>
                    </View>
                  </View>
                </GlassCard>
              ))
            )}
          </View>
        );
      }

      case 'salary_history': {
        const salaryHistory = filteredSalaryHistory;
        return (
          <View style={styles.tabContainer}>
            <Searchbar
              placeholder="Maaş geçmişinde ara..."
              value={salaryHistorySearch}
              onChangeText={setSalaryHistorySearch}
              style={[styles.searchBarCompact, { backgroundColor: glassBgColor, borderColor: glassBorderColor }]}
              inputStyle={[styles.searchInputCompact, { color: c.text }]}
              placeholderTextColor={c.textTertiary}
              iconColor={c.textSecondary}
            />

            {employeeQuery.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : salaryHistory.length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary, marginTop: 10 }]}>Kayıt bulunamadı.</Text>
            ) : (
              salaryHistory.map((sh: any) => {
                const dateLabel = sh.start_date ? formatDate(sh.start_date) : '-';
                const endDateLabel = sh.end_date ? formatDate(sh.end_date) : 'Devam Ediyor';
                return (
                  <GlassCard key={sh.id} intensity={25} style={styles.subCardGlass}>
                    <View style={styles.subCardContent}>
                      <View style={styles.subCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                          <Ionicons name="trending-up-outline" size={14} color={c.primary} />
                          <Text style={[styles.subCardTitle, { color: c.text }]} numberOfLines={1}>
                            {sh.type === 'raise' ? 'Maaş Artışı / Güncelleme' : sh.type === 'initial' ? 'Başlangıç Maaşı' : sh.type || 'Maaş Değişimi'}
                          </Text>
                        </View>
                        <Text style={[styles.subCardPrice, { color: c.success }]}>{formatCurrency(sh.amount)}</Text>
                      </View>
                      <View style={styles.subCardFooter}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="calendar-outline" size={12} color={c.textSecondary} />
                          <Text style={[styles.subCardDate, { color: c.textSecondary }]}>Dönem: {dateLabel} - {endDateLabel}</Text>
                        </View>
                      </View>
                      {sh.description ? (
                        <Text style={[styles.subCardDesc, { color: c.textTertiary, marginTop: 6, fontStyle: 'italic' }]}>
                          Açıklama: {sh.description}
                        </Text>
                      ) : null}
                    </View>
                  </GlassCard>
                );
              })
            )}
          </View>
        );
      }

      case 'assignments': {
        const assignments = filteredAssignments;
        const isAssignmentsFiltered = assignmentStatusFilter !== null;
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
                onPress={() => setIsAssignmentsFilterModalVisible(true)}
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
                <Ionicons name="funnel-outline" size={16} color={isAssignmentsFiltered ? c.primary : c.textSecondary} />
                {isAssignmentsFiltered && (
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
            ) : assignments.length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary, marginTop: 10 }]}>Kayıt bulunamadı.</Text>
            ) : (
              assignments.map((a: any) => {
                const isActive = a.status === 'active' || a.status === 'Aktif';
                return (
                  <GlassCard key={a.id} intensity={25} style={styles.subCardGlass}>
                    <View style={styles.subCardContent}>
                      <View style={styles.subCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                          <Ionicons name="cube-outline" size={14} color={c.primary} />
                          <Text style={[styles.subCardTitle, { color: c.text }]} numberOfLines={1}>
                            {a.item_name} {a.quantity > 1 ? `(${a.quantity} Adet)` : ''}
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
                      
                      {a.serial_number ? (
                        <Text style={{ fontSize: 12, color: c.textSecondary, marginTop: 4 }}>
                          Seri No: {a.serial_number}
                        </Text>
                      ) : null}

                      <View style={[styles.subCardFooter, { marginTop: 8 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="calendar-outline" size={12} color={c.textSecondary} />
                          <Text style={[styles.subCardDate, { color: c.textSecondary }]}>
                            Tarih: {formatDate(a.assign_date)} {a.return_date ? ` - ${formatDate(a.return_date)}` : ''}
                          </Text>
                        </View>
                      </View>

                      {a.notes ? (
                        <Text style={[styles.subCardDesc, { color: c.textTertiary, marginTop: 6, fontStyle: 'italic' }]}>
                          Not: {a.notes}
                        </Text>
                      ) : null}
                    </View>
                  </GlassCard>
                );
              })
            )}

            {/* Assignments Filter Modal */}
            <GlassModal visible={isAssignmentsFilterModalVisible} onDismiss={() => setIsAssignmentsFilterModalVisible(false)}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Zimmet Filtrele</Text>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                
                {/* Status Filter */}
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
                    <Text
                      style={{
                        fontSize: 13,
                        color: !assignmentStatusFilter ? c.primary : c.textSecondary,
                        fontWeight: !assignmentStatusFilter ? '600' : '400',
                      }}
                    >
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
                        <Text
                          style={{
                            fontSize: 13,
                            color: isSelected ? c.primary : c.textSecondary,
                            fontWeight: isSelected ? '600' : '400',
                          }}
                        >
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
                  onPress={() => { setAssignmentStatusFilter(null); setIsAssignmentsFilterModalVisible(false); }}
                  style={{ flex: 1, borderColor: c.primary }}
                  textColor={c.primary}
                >
                  Temizle
                </Button>
                <Button 
                  mode="contained" 
                  onPress={() => setIsAssignmentsFilterModalVisible(false)} 
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
      }

      case 'documents':
        return (
          <View style={styles.tabContainer}>
            <Searchbar
              placeholder="Belge ara..."
              value={docSearch}
              onChangeText={setDocSearch}
              style={[styles.searchBarCompact, { backgroundColor: glassBgColor, borderColor: glassBorderColor }]}
              inputStyle={[styles.searchInputCompact, { color: c.text }]}
              placeholderTextColor={c.textTertiary}
              iconColor={c.textSecondary}
            />

            {documentsQuery.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.tabLoader} />
            ) : filteredDocuments.length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary, marginTop: 10 }]}>Kayıt bulunamadı.</Text>
            ) : (
              filteredDocuments.map((d: any) => (
                <GlassCard key={d.id} intensity={25} style={styles.subCardGlass}>
                  <Pressable
                    onPress={() => {
                      if (d.file_path) {
                        Linking.openURL(getFileUrl(d.file_path)).catch(err => {
                          Alert.alert('Hata', 'Dosya açılamadı. Lütfen geçerli bir internet bağlantınız olduğunu veya dosya formatını destekleyen bir uygulama olduğunu doğrulayın.');
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
                      {d.category ? (
                        <View style={{ backgroundColor: c.primaryContainer + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11, color: c.primary, fontWeight: '600' }}>{d.category}</Text>
                        </View>
                      ) : null}
                      {d.folder ? (
                        <View style={{ backgroundColor: c.textSecondary + '15', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11, color: c.textSecondary, fontWeight: '600' }}>{d.folder}</Text>
                        </View>
                      ) : null}
                      {d.file_type ? (
                        <View style={{ backgroundColor: c.textSecondary + '10', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11, color: c.textTertiary }}>{d.file_type.toUpperCase()}</Text>
                        </View>
                      ) : null}
                    </View>

                    {d.start_date || d.expiry_date ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        {d.start_date && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="calendar-outline" size={12} color={c.textTertiary} />
                            <Text style={[styles.subCardDate, { color: c.textTertiary }]}>Başlangıç: {formatDate(d.start_date)}</Text>
                          </View>
                        )}
                        {d.expiry_date && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="alert-circle-outline" size={12} color={c.warning} />
                            <Text style={[styles.subCardDate, { color: c.warning }]}>Bitiş: {formatDate(d.expiry_date)}</Text>
                          </View>
                        )}
                      </View>
                    ) : null}
                  </Pressable>
                </GlassCard>
              ))
            )}
          </View>
        );
    }
  };

  return (
    <SwipeBackView 
      onSwipeBack={() => router.push('/employees-list')}
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <MovingBackground />
      
      {/* Navbar */}
      <View style={[styles.nav, { paddingTop: insets.top + 8, paddingBottom: 8 }]}>
        <GlassIconButton icon="chevron-back" onPress={() => router.push('/employees-list')} />
        <Text style={[styles.navTitle, { color: c.text }]}>Personel Detayı</Text>
        <GlassIconButton icon="ellipsis-vertical" onPress={() => setIsOptionsModalVisible(true)} />
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
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.tabsScroll}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {(['details', 'salaries', 'salary_history', 'leaves', 'overtimes', 'assignments', 'documents'] as TabValue[]).map((tab) => {
              const labelMap: Record<TabValue, string> = {
                details: 'Genel',
                salaries: 'Ödeme',
                salary_history: 'Maaş Geç.',
                leaves: 'İzin',
                overtimes: 'Mesai',
                assignments: 'Zimmet',
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

        {/* Month Navigator (Only for salaries, leaves, overtimes) */}
        {['salaries', 'leaves', 'overtimes'].includes(activeTab) && (
          <View style={styles.monthNavRow}>
            <GlassMonthPicker
              value={currentDate}
              onChange={setCurrentDate}
              minDate={employee?.start_date ? new Date(employee.start_date) : undefined}
            />
          </View>
        )}

        {/* Content */}
        {renderTabContent()}
      </ScrollView>

      {/* Add Salary Modal */}
      <GlassModal visible={activeModal === 'salary'} onDismiss={() => { setActiveModal(null); resetForm(); }}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni Maaş Ödemesi</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <GlassDropdown
                label="Ödeme Türü"
                value={paymentType}
                options={paymentTypes}
                onSelect={setPaymentType}
                placeholder="Seçiniz..."
              />
              <GlassInput
                label="Ait Olduğu Ay (YYYY-MM)"
                value={salaryMonth}
                onChangeText={setSalaryMonth}
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
              <GlassDropdown
                label="Durum"
                value={salaryStatus}
                options={paymentStatuses}
                onSelect={setSalaryStatus}
                placeholder="Seçiniz..."
              />
              <GlassDropdown
                label="Ödeme Kanalı"
                value={paymentMethod}
                options={paymentMethods}
                onSelect={setPaymentMethod}
                placeholder="Seçiniz..."
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
                disabled={createSalaryMutation.isPending || !salaryMonth || !netSalary}
                buttonColor={c.primary}
                textColor="#ffffff"
              >
                Kaydet
              </Button>
            </View>
          </GlassModal>

      {/* Add Leave Modal */}
      <GlassModal visible={activeModal === 'leave'} onDismiss={() => { setActiveModal(null); resetForm(); }}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Yeni İzin Kaydı</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <GlassDropdown
                label="Giriş Şekli"
                value={leaveUnit}
                options={[
                  { value: 'daily', label: 'Günlük' },
                  { value: 'hourly', label: 'Saatlik' }
                ]}
                onSelect={(val) => {
                  setLeaveUnit(val);
                  if (val === 'hourly') {
                    setLeaveHours('1');
                  } else {
                    setLeaveHours('');
                  }
                }}
                placeholder="Seçiniz..."
              />
              <GlassDropdown
                label="İzin Türü"
                value={leaveType}
                options={leaveTypes}
                onSelect={setLeaveType}
                placeholder="Seçiniz..."
              />
              {leaveUnit === 'hourly' ? (
                <>
                  <GlassInput
                    label="Tarih"
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                  />
                  <GlassInput
                    label="Süre (Saat)"
                    value={leaveHours}
                    onChangeText={setLeaveHours}
                    keyboardType="numeric"
                    placeholder="örn: 4"
                  />
                </>
              ) : (
                <>
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
                </>
              )}
              <GlassDropdown
                label="Durum"
                value={leaveStatus}
                options={leaveStatuses}
                onSelect={setLeaveStatus}
                placeholder="Seçiniz..."
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
          </GlassModal>

      {/* Add Overtime Modal */}
      <GlassModal visible={activeModal === 'overtime'} onDismiss={() => { setActiveModal(null); resetForm(); }}>
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
              <GlassDropdown
                label="Saat Oranı"
                value={overtimeRate}
                options={overtimeRates}
                onSelect={setOvertimeRate}
                placeholder="Seçiniz..."
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
          </GlassModal>

      {/* Options Menu Modal (3-dots) */}
      <GlassModal visible={isOptionsModalVisible} onDismiss={() => setIsOptionsModalVisible(false)}>
        <Text style={[styles.modalTitle, { color: c.text, textAlign: 'center', marginBottom: 20 }]}>İşlemler</Text>
        <View style={styles.optionsList}>
          <Pressable 
            style={[styles.optionItem, { borderBottomWidth: 1, borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} 
            onPress={openEditModal}
          >
            <Ionicons name="create-outline" size={20} color={c.primary} />
            <Text style={[styles.optionText, { color: c.text }]}>Personeli Düzenle</Text>
          </Pressable>
          
          <Pressable 
            style={styles.optionItem} 
            onPress={() => {
              setIsOptionsModalVisible(false);
              handleConfirmDelete();
            }}
          >
            <Ionicons name="trash-outline" size={20} color={c.error} />
            <Text style={[styles.optionText, { color: c.error }]}>Personeli Sil</Text>
          </Pressable>
        </View>
      </GlassModal>

      {/* Edit Employee Modal */}
      <GlassModal visible={isEditModalVisible} onDismiss={() => setIsEditModalVisible(false)}>
        <Text style={[styles.modalTitle, { color: c.text }]}>Personeli Düzenle</Text>
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          <GlassInput
            label="Ad"
            value={editFirstName}
            onChangeText={setEditFirstName}
            placeholder="örn: Ahmet"
          />
          <GlassInput
            label="Soyad"
            value={editLastName}
            onChangeText={setEditLastName}
            placeholder="örn: Yılmaz"
          />
          <GlassInput
            label="Pozisyon"
            value={editPosition}
            onChangeText={setEditPosition}
            placeholder="örn: Vinç Operatörü"
          />
          <GlassInput
            label="Departman"
            value={editDepartment}
            onChangeText={setEditDepartment}
            placeholder="örn: Operasyon"
          />
          <GlassInput
            label="E-posta"
            value={editEmail}
            onChangeText={setEditEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="örn: ahmet@firma.com"
          />
          <GlassInput
            label="Telefon"
            value={editPhone}
            onChangeText={setEditPhone}
            keyboardType="phone-pad"
            placeholder="örn: 0530XXXXXXX"
          />
          <GlassInput
            label="IBAN"
            value={editIban}
            onChangeText={setEditIban}
            placeholder="TRXX XXXX XXXX XXXX XXXX XX"
          />
          <GlassInput
            label="İşe Giriş Tarihi"
            value={editHireDate}
            onChangeText={setEditHireDate}
            placeholder="YYYY-MM-DD"
          />
          <GlassInput
            label="Maaş (₺)"
            value={editSalary}
            onChangeText={setEditSalary}
            keyboardType="numeric"
            placeholder="0.00"
          />
        </ScrollView>
        <View style={styles.modalButtons}>
          <Button mode="text" onPress={() => setIsEditModalVisible(false)} textColor={c.textSecondary}>
            İptal
          </Button>
          <Button
            mode="contained"
            onPress={handleUpdateEmployee}
            loading={updateMutation.isPending}
            disabled={updateMutation.isPending || !editFirstName || !editLastName}
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
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginVertical: 4,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  navTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingBottom: 60 },
  headerSection: { alignItems: 'center', marginVertical: 20 },
  nameText: { fontSize: 22, fontWeight: '800' },
  positionText: { fontSize: 14, marginTop: 4 },
  tabPicker: { marginVertical: 6, paddingHorizontal: 16 },
  tabsScroll: { gap: 8 },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabButtonText: { fontSize: 13, fontWeight: '600' },
  tabContainer: { paddingHorizontal: 12, marginTop: 2 },
  cardGlass: { padding: 0 },
  cardContent: { padding: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  detailLabel: { fontSize: 13, fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: '600', maxWidth: '70%' },
  sectionCard: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  gridCol: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  fullWidthField: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  valueContainer: {
    flex: 1,
    marginRight: 8,
  },
  copyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  tabLoader: { marginVertical: 20 },
  emptyText: { textAlign: 'center', marginVertical: 40, fontSize: 14 },
  subCardGlass: { padding: 0, marginBottom: 6 },
  subCardContent: { padding: 12 },
  subCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  subCardTitle: { fontSize: 15, fontWeight: '600' },
  subCardPrice: { fontSize: 15, fontWeight: '700' },
  subCardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  subCardDate: { fontSize: 12 },
  subCardDesc: { fontSize: 13, marginBottom: 4 },
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
  monthNavRow: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    marginBottom: 4,
  },
  monthNavCard: {
    width: '100%',
    padding: 0,
  },
  monthNavInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { fontSize: 16, fontWeight: '700' },
  optionsList: {
    paddingBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
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
  chipCompact: {
    borderRadius: 8,
    marginVertical: 2,
  },
  chipTextCompact: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsScroll: {
    paddingHorizontal: 16,
    marginVertical: 2,
    flexDirection: 'row',
  },
  statCardGlass: {
    width: 220,
    height: 165,
    marginRight: 12,
    padding: 16,
    borderRadius: 18,
    justifyContent: 'space-between',
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  statCardSubtitle: {
    fontSize: 11,
    marginTop: 6,
  },
  statCardInlineBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
});

