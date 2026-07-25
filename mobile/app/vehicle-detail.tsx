import { useState } from 'react';
import GlassModal from '../components/ui/GlassModal';
import SwipeableRow from '../components/ui/SwipeableRow';
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
  Modal,
  Image,
  SafeAreaView,
} from 'react-native';
import { Text, ActivityIndicator, IconButton, Divider, Button, Searchbar, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/Colors';
import { vehicleService } from '../services/dataServices';
import { formatCurrency, getStatusLabel, formatDate } from '../utils/format';
import MovingBackground from '../components/ui/MovingBackground';
import GlassCard from '../components/ui/GlassCard';
import GlassInput from '../components/ui/GlassInput';
import GlassDropdown from '../components/ui/GlassDropdown';
import GlassIconButton from '../components/ui/GlassIconButton';

import { getFileUrl } from '../services/api';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

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

import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { themeMode } = useThemeStore();
  const colorScheme = themeMode;
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const glassBgColor = Platform.OS === 'web'
    ? (colorScheme === 'dark' ? 'rgba(30, 30, 40, 0.65)' : 'rgba(255, 255, 255, 0.65)')
    : (colorScheme === 'dark' ? 'rgba(30, 30, 40, 0.55)' : 'rgba(255, 255, 255, 0.45)');
  const glassBorderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.5)';

  const [activeTab, setActiveTab] = useState<TabValue>('details');

  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // Edit vehicle states
  const [editPlate, setEditPlate] = useState('');
  const [editType, setEditType] = useState('Otomobil');
  const [editBrand, setEditBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editKm, setEditKm] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editNotes, setEditNotes] = useState('');
  const [editVin, setEditVin] = useState('');
  const [editEngineNo, setEditEngineNo] = useState('');

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

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleViewDocument = async (filePath: string) => {
    const url = getFileUrl(filePath);
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
      setPreviewUrl(url);
    } else {
      try {
        await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          toolbarColor: '#1e293b',
          controlsColor: '#3b82f6',
        });
      } catch (error) {
        Alert.alert('Hata', 'Belge açılamadı.');
      }
    }
  };

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

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => vehicleService.update(vehicleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsEditModalVisible(false);
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Güncelleme başarısız oldu.');
    }
  });

  const handleUpdateVehicle = () => {
    if (!editPlate || !editType) {
      Alert.alert('Hata', 'Lütfen plaka ve araç türünü doldurun.');
      return;
    }
    updateMutation.mutate({
      plate: editPlate,
      type: editType,
      brand: editBrand,
      model: editModel,
      year: editYear ? parseInt(editYear) : null,
      color: editColor,
      km: editKm ? parseInt(editKm) : null,
      status: editStatus,
      notes: editNotes,
      vin: editVin,
      engine_no: editEngineNo,
    });
  };

  const openEditModal = () => {
    setIsOptionsModalVisible(false);
    setTimeout(() => {
      if (vehicle) {
        setEditPlate(vehicle.plate || '');
        setEditType(vehicle.type || 'Otomobil');
        setEditBrand(vehicle.brand || '');
        setEditModel(vehicle.model || '');
        setEditYear(vehicle.year ? vehicle.year.toString() : '');
        setEditColor(vehicle.color || '');
        setEditKm(vehicle.km ? vehicle.km.toString() : '');
        setEditStatus(vehicle.status || 'active');
        setEditNotes(vehicle.notes || '');
        setEditVin(vehicle.vin || '');
        setEditEngineNo(vehicle.engine_no || '');
        setIsEditModalVisible(true);
      }
    }, 350);
  };

  // Modal State
  const [activeModal, setActiveModal] = useState<'maintenance' | 'inspection' | 'insurance' | 'service' | 'assignment' | 'document' | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Common fields
  const [desc, setDesc] = useState('');
  const [cost, setCost] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Assignment fields
  const [assignItemName, setAssignItemName] = useState('Araç Zimmeti');
  const [assignQuantity, setAssignQuantity] = useState('1');
  const [assignAssignedTo, setAssignAssignedTo] = useState('');
  const [assignDepartment, setAssignDepartment] = useState('');
  const [assignStartDate, setAssignStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignEndDate, setAssignEndDate] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  // Document fields
  const [docFileName, setDocFileName] = useState('');
  const [docCategory, setDocCategory] = useState('');
  const [docStartDate, setDocStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [docEndDate, setDocEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [selectedFile, setSelectedFile] = useState<{ uri: string | null; name: string; size?: number; isExisting?: boolean } | null>(null);

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
    setEditingItem(null);
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
    setAssignItemName('Araç Zimmeti');
    setAssignQuantity('1');
    setAssignAssignedTo('');
    setAssignDepartment('');
    setAssignStartDate(new Date().toISOString().split('T')[0]);
    setAssignEndDate('');
    setAssignNotes('');
    setDocFileName('');
    setDocCategory('');
    setDocStartDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setDocEndDate(d.toISOString().split('T')[0]);
    setSelectedFile(null);
  };

  const handleDocStartDateChange = (val: string) => {
    setDocStartDate(val);
    if (val && val.length === 10) {
      const parts = val.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parts[1];
        const day = parts[2];
        if (!isNaN(year) && month.length === 2 && day.length === 2) {
          setDocEndDate(`${year + 1}-${month}-${day}`);
        }
      }
    }
  };

  // Maintenance Mutations
  const createMaintenanceMutation = useMutation({
    mutationFn: (data: any) => vehicleService.createMaintenance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenances', vehicleId] });
      setActiveModal(null);
      resetForm();
    },
  });

  const updateMaintenanceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => vehicleService.updateMaintenance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenances', vehicleId] });
      setActiveModal(null);
      resetForm();
    },
    onError: (err: any) => Alert.alert('Hata', err.message || 'Güncelleme başarısız oldu.'),
  });

  const deleteMaintenanceMutation = useMutation({
    mutationFn: (id: number) => vehicleService.deleteMaintenance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenances', vehicleId] });
    },
    onError: (err: any) => Alert.alert('Hata', err.message || 'Silme işlemi başarısız oldu.'),
  });

  // Inspection Mutations
  const createInspectionMutation = useMutation({
    mutationFn: (data: any) => vehicleService.createInspection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-inspections', vehicleId] });
      setActiveModal(null);
      resetForm();
    },
  });

  const updateInspectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => vehicleService.updateInspection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-inspections', vehicleId] });
      setActiveModal(null);
      resetForm();
    },
    onError: (err: any) => Alert.alert('Hata', err.message || 'Güncelleme başarısız oldu.'),
  });

  const deleteInspectionMutation = useMutation({
    mutationFn: (id: number) => vehicleService.deleteInspection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-inspections', vehicleId] });
    },
    onError: (err: any) => Alert.alert('Hata', err.message || 'Silme işlemi başarısız oldu.'),
  });

  // Insurance Mutations
  const createInsuranceMutation = useMutation({
    mutationFn: (data: any) => vehicleService.createInsurance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances', vehicleId] });
      setActiveModal(null);
      resetForm();
    },
  });

  const updateInsuranceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => vehicleService.updateInsurance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances', vehicleId] });
      setActiveModal(null);
      resetForm();
    },
    onError: (err: any) => Alert.alert('Hata', err.message || 'Güncelleme başarısız oldu.'),
  });

  const deleteInsuranceMutation = useMutation({
    mutationFn: (id: number) => vehicleService.deleteInsurance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances', vehicleId] });
    },
    onError: (err: any) => Alert.alert('Hata', err.message || 'Silme işlemi başarısız oldu.'),
  });

  // Service Mutations
  const createServiceMutation = useMutation({
    mutationFn: (data: any) => vehicleService.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-services', vehicleId] });
      setActiveModal(null);
      resetForm();
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => vehicleService.updateService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-services', vehicleId] });
      setActiveModal(null);
      resetForm();
    },
    onError: (err: any) => Alert.alert('Hata', err.message || 'Güncelleme başarısız oldu.'),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: number) => vehicleService.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-services', vehicleId] });
    },
    onError: (err: any) => Alert.alert('Hata', err.message || 'Silme işlemi başarısız oldu.'),
  });

  const handleCreateMaintenance = async () => {
    let fileData: string | null = null;
    let fileName: string | null = null;
    let filePath: string | null = null;

    if (selectedFile) {
      if (selectedFile.isExisting) {
        filePath = selectedFile.name;
      } else if (selectedFile.uri) {
        try {
          fileData = await readUriAsBase64(selectedFile.uri, selectedFile.name);
          fileName = selectedFile.name;
          filePath = selectedFile.name;
        } catch (err) {
          Alert.alert('Hata', 'Dosya verisi okunurken bir hata oluştu.');
          return;
        }
      }
    }

    const payload = {
      type: maintType,
      description: desc,
      date,
      cost: cost ? parseFloat(cost) : 0,
      nextKm: maintNextKm ? parseInt(maintNextKm) : undefined,
      nextDate: maintNextDate || undefined,
      notes,
      filePath,
      fileData,
      fileName,
    };

    if (editingItem) {
      updateMaintenanceMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMaintenanceMutation.mutate({
        vehicleId,
        ...payload,
      });
    }
  };

  const handleCreateInspection = async () => {
    let fileData: string | null = null;
    let fileName: string | null = null;
    let filePath: string | null = null;

    if (selectedFile) {
      if (selectedFile.isExisting) {
        filePath = selectedFile.name;
      } else if (selectedFile.uri) {
        try {
          fileData = await readUriAsBase64(selectedFile.uri, selectedFile.name);
          fileName = selectedFile.name;
          filePath = selectedFile.name;
        } catch (err) {
          Alert.alert('Hata', 'Dosya verisi okunurken bir hata oluştu.');
          return;
        }
      }
    }

    const payload = {
      type: inspType,
      date,
      validUntil: inspExpiryDate || undefined,
      result: inspResult,
      cost: cost ? parseFloat(cost) : 0,
      notes,
      filePath,
      fileData,
      fileName,
    };

    if (editingItem) {
      updateInspectionMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createInspectionMutation.mutate({
        vehicleId,
        ...payload,
      });
    }
  };

  const handleCreateInsurance = async () => {
    let fileData: string | null = null;
    let fileName: string | null = null;
    let filePath: string | null = null;

    if (selectedFile) {
      if (selectedFile.isExisting) {
        filePath = selectedFile.name;
      } else if (selectedFile.uri) {
        try {
          fileData = await readUriAsBase64(selectedFile.uri, selectedFile.name);
          fileName = selectedFile.name;
          filePath = selectedFile.name;
        } catch (err) {
          Alert.alert('Hata', 'Dosya verisi okunurken bir hata oluştu.');
          return;
        }
      }
    }

    const payload = {
      company: insCompany,
      policyNo: insPolicyNo,
      type: insType,
      startDate: date,
      endDate: insEndDate || undefined,
      premium: cost ? parseFloat(cost) : 0,
      notes,
      filePath,
      fileData,
      fileName,
    };

    if (editingItem) {
      updateInsuranceMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createInsuranceMutation.mutate({
        vehicleId,
        ...payload,
      });
    }
  };

  const handleCreateService = async () => {
    let fileData: string | null = null;
    let fileName: string | null = null;
    let filePath: string | null = null;

    if (selectedFile) {
      if (selectedFile.isExisting) {
        filePath = selectedFile.name;
      } else if (selectedFile.uri) {
        try {
          fileData = await readUriAsBase64(selectedFile.uri, selectedFile.name);
          fileName = selectedFile.name;
          filePath = selectedFile.name;
        } catch (err) {
          Alert.alert('Hata', 'Dosya verisi okunurken bir hata oluştu.');
          return;
        }
      }
    }

    const payload = {
      type: servType,
      description: desc,
      date,
      cost: cost ? parseFloat(cost) : 0,
      km: servKm ? parseInt(servKm) : undefined,
      notes,
      filePath,
      fileData,
      fileName,
    };

    if (editingItem) {
      updateServiceMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createServiceMutation.mutate({
        vehicleId,
        ...payload,
      });
    }
  };

  // Assignment Mutations
  const createAssignmentMutation = useMutation({
    mutationFn: (data: any) => vehicleService.createAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-assignments', vehicleId] });
      setActiveModal(null);
      resetForm();
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Zimmet kaydı oluşturulamadı.');
    }
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => vehicleService.updateAssignment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-assignments', vehicleId] });
      setActiveModal(null);
      resetForm();
    },
    onError: (err: any) => Alert.alert('Hata', err.message || 'Güncelleme başarısız oldu.'),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: number) => vehicleService.deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-assignments', vehicleId] });
    },
    onError: (err: any) => Alert.alert('Hata', err.message || 'Silme işlemi başarısız oldu.'),
  });

  const handleCreateAssignment = () => {
    if (!assignStartDate) {
      Alert.alert('Hata', 'Lütfen başlangıç tarihini girin.');
      return;
    }
    const payload = {
      itemName: assignItemName,
      quantity: assignQuantity ? parseInt(assignQuantity) : 1,
      assignedTo: assignAssignedTo || null,
      department: assignDepartment || null,
      startDate: assignStartDate,
      endDate: assignEndDate || null,
      notes: assignNotes || null,
    };

    if (editingItem) {
      updateAssignmentMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createAssignmentMutation.mutate({
        vehicleId,
        ...payload,
      });
    }
  };

  // Document Mutations
  const createDocumentMutation = useMutation({
    mutationFn: (data: any) => vehicleService.createDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-documents', vehicleId] });
      setActiveModal(null);
      resetForm();
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Belge kaydı oluşturulamadı.');
    }
  });

  const updateDocumentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => vehicleService.updateDocument(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-documents', vehicleId] });
      setActiveModal(null);
      resetForm();
    },
    onError: (err: any) => Alert.alert('Hata', err.message || 'Güncelleme başarısız oldu.'),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id: number) => vehicleService.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-documents', vehicleId] });
    },
    onError: (err: any) => Alert.alert('Hata', err.message || 'Silme işlemi başarısız oldu.'),
  });

  // Edit / Delete helpers
  const handleEditMaintenance = (item: any) => {
    setEditingItem(item);
    setMaintType(item.type || 'Periyodik Bakım');
    setDesc(item.description || '');
    setDate(item.date ? item.date.split('T')[0] : '');
    setCost(item.cost?.toString() || '');
    setMaintNextKm(item.next_km?.toString() || '');
    setMaintNextDate(item.next_date ? item.next_date.split('T')[0] : '');
    setNotes(item.notes || '');
    if (item.file_path) {
      setSelectedFile({
        uri: null,
        name: item.file_path,
        isExisting: true
      });
    } else {
      setSelectedFile(null);
    }
    setActiveModal('maintenance');
  };

  const handleConfirmDeleteMaintenance = (item: any) => {
    Alert.alert(
      'Bakımı Sil',
      'Bu bakım kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteMaintenanceMutation.mutate(item.id) },
      ]
    );
  };

  const handleEditInspection = (item: any) => {
    setEditingItem(item);
    setInspType(item.type || 'Muayene');
    setDate(item.date ? item.date.split('T')[0] : '');
    setInspExpiryDate(item.valid_until ? item.valid_until.split('T')[0] : '');
    setInspResult(item.result || 'Geçti');
    setCost(item.cost?.toString() || '');
    setNotes(item.notes || '');
    if (item.file_path) {
      setSelectedFile({
        uri: null,
        name: item.file_path,
        isExisting: true
      });
    } else {
      setSelectedFile(null);
    }
    setActiveModal('inspection');
  };

  const handleConfirmDeleteInspection = (item: any) => {
    Alert.alert(
      'Muayeneyi Sil',
      'Bu muayene kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteInspectionMutation.mutate(item.id) },
      ]
    );
  };

  const handleEditInsurance = (item: any) => {
    setEditingItem(item);
    setInsCompany(item.company || '');
    setInsPolicyNo(item.policy_no || '');
    setInsType(item.type || 'Kasko');
    setDate(item.start_date ? item.start_date.split('T')[0] : '');
    setInsEndDate(item.end_date ? item.end_date.split('T')[0] : '');
    setCost(item.premium?.toString() || '');
    setNotes(item.notes || '');
    if (item.file_path) {
      setSelectedFile({
        uri: null,
        name: item.file_path,
        isExisting: true
      });
    } else {
      setSelectedFile(null);
    }
    setActiveModal('insurance');
  };

  const handleConfirmDeleteInsurance = (item: any) => {
    Alert.alert(
      'Sigortayı Sil',
      'Bu sigorta kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteInsuranceMutation.mutate(item.id) },
      ]
    );
  };

  const handleEditService = (item: any) => {
    setEditingItem(item);
    setServType(item.type || 'Onarım');
    setDesc(item.description || '');
    setDate(item.date ? item.date.split('T')[0] : '');
    setCost(item.cost?.toString() || '');
    setServKm(item.km?.toString() || '');
    setNotes(item.notes || '');
    if (item.file_path) {
      setSelectedFile({
        uri: null,
        name: item.file_path,
        isExisting: true
      });
    } else {
      setSelectedFile(null);
    }
    setActiveModal('service');
  };

  const handleConfirmDeleteService = (item: any) => {
    Alert.alert(
      'Servisi Sil',
      'Bu servis/onarım kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteServiceMutation.mutate(item.id) },
      ]
    );
  };

  const handleEditAssignment = (item: any) => {
    setEditingItem(item);
    setAssignItemName(item.item_name || '');
    setAssignQuantity(item.quantity?.toString() || '1');
    setAssignAssignedTo(item.assigned_to || '');
    setAssignDepartment(item.department || '');
    setAssignStartDate(item.start_date ? item.start_date.split('T')[0] : '');
    setAssignEndDate(item.end_date ? item.end_date.split('T')[0] : '');
    setAssignNotes(item.notes || '');
    setActiveModal('assignment');
  };

  const handleConfirmDeleteAssignment = (item: any) => {
    Alert.alert(
      'Zimmeti Sil',
      'Bu zimmet kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteAssignmentMutation.mutate(item.id) },
      ]
    );
  };

  const handleEditDocument = (item: any) => {
    setEditingItem(item);
    setDocFileName(item.file_name || '');
    setDocCategory(item.category || '');
    setDocStartDate(item.start_date ? item.start_date.split('T')[0] : '');
    setDocEndDate(item.expiry_date ? item.expiry_date.split('T')[0] : '');
    setSelectedFile(null);
    setActiveModal('document');
  };

  const handleConfirmDeleteDocument = (item: any) => {
    Alert.alert(
      'Belgeyi Sil',
      'Bu belgeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteDocumentMutation.mutate(item.id) },
      ]
    );
  };

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
        });
        if (!docFileName) {
          const label = asset.name.substring(0, asset.name.lastIndexOf('.')) || asset.name;
          setDocFileName(label);
        }
      }
    } catch (err) {
      Alert.alert('Hata', 'Dosya seçilirken bir hata oluştu.');
    }
  };

  const readUriAsBase64 = async (uri: string, fileName?: string): Promise<string> => {
    try {
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(blob);
        });
      }

      // Native (Android/iOS)
      // 1. Try reading the file directly
      try {
        const data = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });
        return data;
      } catch (err1) {
        console.warn('readAsStringAsync directly failed:', err1);
        try {
          const decodedUri = decodeURIComponent(uri);
          const data = await FileSystem.readAsStringAsync(decodedUri, {
            encoding: 'base64',
          });
          return data;
        } catch (err2) {
          console.warn('readAsStringAsync with decoded URI failed:', err2);
          
          // 2. Copy the file to the cache directory and read it
          const tempFileName = `temp_upload_${Date.now()}_${fileName || 'file'}`;
          const tempDest = `${FileSystem.cacheDirectory}${tempFileName}`;
          
          await FileSystem.copyAsync({
            from: uri,
            to: tempDest,
          });
          
          const data = await FileSystem.readAsStringAsync(tempDest, {
            encoding: 'base64',
          });
          
          // Clean up temp file
          FileSystem.deleteAsync(tempDest, { idempotent: true }).catch((delErr) => {
            console.warn('Failed to delete temp file:', delErr);
          });
          
          return data;
        }
      }
    } catch (err) {
      console.error('Error in readUriAsBase64:', err);
      throw err;
    }
  };

  const handleCreateDocument = async () => {
    if (!docFileName) {
      Alert.alert('Hata', 'Lütfen belge adını girin.');
      return;
    }

    let fileData: string | null = null;
    let fileNameOnDisk = docFileName;
    if (selectedFile && selectedFile.uri) {
      try {
        fileData = await readUriAsBase64(selectedFile.uri, selectedFile.name);
        fileNameOnDisk = selectedFile.name;
      } catch (err) {
        console.error('Error reading document file:', err);
        Alert.alert('Hata', 'Dosya verisi okunurken bir hata oluştu.');
        return;
      }
    }

    const payload = {
      fileName: docFileName,
      fileNameOnDisk,
      fileData,
      category: docCategory || null,
      startDate: docStartDate || null,
      endDate: docEndDate || null,
    };

    if (editingItem) {
      updateDocumentMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createDocumentMutation.mutate({
        vehicleId,
        ...payload,
      });
    }
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
            <View style={{ marginHorizontal: -16 }}>
              <GlassCard intensity={30} style={styles.cardGlass} isListRow={true}>
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
                <SwipeableRow
                  key={m.id}
                  onEdit={() => handleEditMaintenance(m)}
                  onDelete={() => handleConfirmDeleteMaintenance(m)}
                >
                  <GlassCard intensity={25} style={styles.subCardGlass} isListRow={true}>
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
                          onPress={() => handleViewDocument(m.file_path)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}
                        >
                          <Ionicons name="document-attach-outline" size={14} color={c.primary} />
                          <Text style={{ fontSize: 12, color: c.primary, fontWeight: '600' }}>Belgeyi Görüntüle</Text>
                        </Pressable>
                      )}
                    </View>
                  </GlassCard>
                </SwipeableRow>
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
                <SwipeableRow
                  key={i.id}
                  onEdit={() => handleEditInspection(i)}
                  onDelete={() => handleConfirmDeleteInspection(i)}
                >
                  <GlassCard intensity={25} style={styles.subCardGlass} isListRow={true}>
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
                          onPress={() => handleViewDocument(i.file_path)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}
                        >
                          <Ionicons name="document-attach-outline" size={14} color={c.primary} />
                          <Text style={{ fontSize: 12, color: c.primary, fontWeight: '600' }}>Belgeyi Görüntüle</Text>
                        </Pressable>
                      )}
                    </View>
                  </GlassCard>
                </SwipeableRow>
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
                <SwipeableRow
                  key={ins.id}
                  onEdit={() => handleEditInsurance(ins)}
                  onDelete={() => handleConfirmDeleteInsurance(ins)}
                >
                  <GlassCard intensity={25} style={styles.subCardGlass} isListRow={true}>
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
                          onPress={() => handleViewDocument(ins.file_path)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}
                        >
                          <Ionicons name="document-attach-outline" size={14} color={c.primary} />
                          <Text style={{ fontSize: 12, color: c.primary, fontWeight: '600' }}>Belgeyi Görüntüle</Text>
                        </Pressable>
                      )}
                    </View>
                  </GlassCard>
                </SwipeableRow>
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
                <SwipeableRow
                  key={s.id}
                  onEdit={() => handleEditService(s)}
                  onDelete={() => handleConfirmDeleteService(s)}
                >
                  <GlassCard intensity={25} style={styles.subCardGlass} isListRow={true}>
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
                          onPress={() => handleViewDocument(s.file_path)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}
                        >
                          <Ionicons name="document-attach-outline" size={14} color={c.primary} />
                          <Text style={{ fontSize: 12, color: c.primary, fontWeight: '600' }}>Belgeyi Görüntüle</Text>
                        </Pressable>
                      )}
                    </View>
                  </GlassCard>
                </SwipeableRow>
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
                  <SwipeableRow
                    key={a.id}
                    onEdit={() => handleEditAssignment(a)}
                    onDelete={() => handleConfirmDeleteAssignment(a)}
                  >
                    <GlassCard intensity={25} style={styles.subCardGlass} isListRow={true}>
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
                  </SwipeableRow>
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
                <SwipeableRow
                  key={d.id}
                  onEdit={() => handleEditDocument(d)}
                  onDelete={() => handleConfirmDeleteDocument(d)}
                  onPress={() => {
                    if (d.file_path) {
                      handleViewDocument(d.file_path);
                    } else {
                      Alert.alert('Hata', 'Dosya yolu bulunamadı.');
                    }
                  }}
                >
                  <GlassCard intensity={25} style={styles.subCardGlass} isListRow={true}>
                    <View style={styles.subCardContent}>
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
                    </View>
                  </GlassCard>
                </SwipeableRow>
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
      <View style={[styles.nav, { paddingTop: insets.top + 8, paddingBottom: 8, paddingHorizontal: 16 }]}>
        <GlassIconButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={[styles.navTitle, { color: c.text }]}>Araç Detayı</Text>
        <GlassIconButton icon="ellipsis-vertical" onPress={() => setIsOptionsModalVisible(true)} />
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
            <Text style={[styles.modalTitle, { color: c.text }]}>{editingItem ? 'Bakım Kaydını Düzenle' : 'Yeni Bakım Kaydı'}</Text>
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
              <Pressable
                onPress={handlePickDocument}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: glassBorderColor,
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    marginTop: 10,
                    marginBottom: 10,
                  }
                ]}
              >
                <Ionicons name="document-attach-outline" size={18} color={c.primary} />
                <Text style={{ color: c.text, fontWeight: '600' }}>
                  {selectedFile ? 'Dosyayı Değiştir' : 'Belge Dosyası Seç'}
                </Text>
              </Pressable>
              {selectedFile && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 4 }}>
                  <Ionicons name="checkmark-circle" size={16} color={c.success} />
                  <Text style={{ color: c.textSecondary, fontSize: 13, flex: 1 }} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Pressable onPress={() => setSelectedFile(null)}>
                    <Ionicons name="close-circle" size={18} color={c.error} />
                  </Pressable>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button mode="text" onPress={() => { setActiveModal(null); resetForm(); }} textColor={c.textSecondary}>
                İptal
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateMaintenance}
                loading={createMaintenanceMutation.isPending || updateMaintenanceMutation.isPending}
                disabled={createMaintenanceMutation.isPending || updateMaintenanceMutation.isPending || !desc}
                buttonColor={c.primary}
                textColor="#ffffff"
              >
                {editingItem ? 'Güncelle' : 'Kaydet'}
              </Button>
            </View>
          </GlassModal>

      {/* Add Inspection Modal */}
      <GlassModal visible={activeModal === 'inspection'} onDismiss={() => { setActiveModal(null); resetForm(); }}>
            <Text style={[styles.modalTitle, { color: c.text }]}>{editingItem ? 'Muayene Kaydını Düzenle' : 'Yeni Muayene Kaydı'}</Text>
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
              <Pressable
                onPress={handlePickDocument}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: glassBorderColor,
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    marginTop: 10,
                    marginBottom: 10,
                  }
                ]}
              >
                <Ionicons name="document-attach-outline" size={18} color={c.primary} />
                <Text style={{ color: c.text, fontWeight: '600' }}>
                  {selectedFile ? 'Dosyayı Değiştir' : 'Belge Dosyası Seç'}
                </Text>
              </Pressable>
              {selectedFile && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 4 }}>
                  <Ionicons name="checkmark-circle" size={16} color={c.success} />
                  <Text style={{ color: c.textSecondary, fontSize: 13, flex: 1 }} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Pressable onPress={() => setSelectedFile(null)}>
                    <Ionicons name="close-circle" size={18} color={c.error} />
                  </Pressable>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button mode="text" onPress={() => { setActiveModal(null); resetForm(); }} textColor={c.textSecondary}>
                İptal
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateInspection}
                loading={createInspectionMutation.isPending || updateInspectionMutation.isPending}
                disabled={createInspectionMutation.isPending || updateInspectionMutation.isPending}
                buttonColor={c.primary}
                textColor="#ffffff"
              >
                {editingItem ? 'Güncelle' : 'Kaydet'}
              </Button>
            </View>
          </GlassModal>

      {/* Add Insurance Modal */}
      <GlassModal visible={activeModal === 'insurance'} onDismiss={() => { setActiveModal(null); resetForm(); }}>
            <Text style={[styles.modalTitle, { color: c.text }]}>{editingItem ? 'Sigorta Kaydını Düzenle' : 'Yeni Sigorta Kaydı'}</Text>
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
              <Pressable
                onPress={handlePickDocument}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: glassBorderColor,
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    marginTop: 10,
                    marginBottom: 10,
                  }
                ]}
              >
                <Ionicons name="document-attach-outline" size={18} color={c.primary} />
                <Text style={{ color: c.text, fontWeight: '600' }}>
                  {selectedFile ? 'Dosyayı Değiştir' : 'Belge Dosyası Seç'}
                </Text>
              </Pressable>
              {selectedFile && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 4 }}>
                  <Ionicons name="checkmark-circle" size={16} color={c.success} />
                  <Text style={{ color: c.textSecondary, fontSize: 13, flex: 1 }} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Pressable onPress={() => setSelectedFile(null)}>
                    <Ionicons name="close-circle" size={18} color={c.error} />
                  </Pressable>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button mode="text" onPress={() => { setActiveModal(null); resetForm(); }} textColor={c.textSecondary}>
                İptal
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateInsurance}
                loading={createInsuranceMutation.isPending || updateInsuranceMutation.isPending}
                disabled={createInsuranceMutation.isPending || updateInsuranceMutation.isPending || !insCompany}
                buttonColor={c.primary}
                textColor="#ffffff"
              >
                {editingItem ? 'Güncelle' : 'Kaydet'}
              </Button>
            </View>
          </GlassModal>

      {/* Add Service Modal */}
      <GlassModal visible={activeModal === 'service'} onDismiss={() => { setActiveModal(null); resetForm(); }}>
            <Text style={[styles.modalTitle, { color: c.text }]}>{editingItem ? 'Servis Kaydını Düzenle' : 'Yeni Servis Kaydı'}</Text>
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
              <Pressable
                onPress={handlePickDocument}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: glassBorderColor,
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    marginTop: 10,
                    marginBottom: 10,
                  }
                ]}
              >
                <Ionicons name="document-attach-outline" size={18} color={c.primary} />
                <Text style={{ color: c.text, fontWeight: '600' }}>
                  {selectedFile ? 'Dosyayı Değiştir' : 'Belge Dosyası Seç'}
                </Text>
              </Pressable>
              {selectedFile && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 4 }}>
                  <Ionicons name="checkmark-circle" size={16} color={c.success} />
                  <Text style={{ color: c.textSecondary, fontSize: 13, flex: 1 }} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Pressable onPress={() => setSelectedFile(null)}>
                    <Ionicons name="close-circle" size={18} color={c.error} />
                  </Pressable>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button mode="text" onPress={() => { setActiveModal(null); resetForm(); }} textColor={c.textSecondary}>
                İptal
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateService}
                loading={createServiceMutation.isPending || updateServiceMutation.isPending}
                disabled={createServiceMutation.isPending || updateServiceMutation.isPending || !servType}
                buttonColor={c.primary}
                textColor="#ffffff"
              >
                {editingItem ? 'Güncelle' : 'Kaydet'}
              </Button>
            </View>
          </GlassModal>

      {/* Floating Action Button */}
      {['maintenances', 'inspections', 'insurances', 'services', 'assignments', 'documents'].includes(activeTab) && (
        <GlassIconButton
          icon="add"
          size={56}
          iconSize={28}
          onPress={() => {
            if (activeTab === 'maintenances') setActiveModal('maintenance');
            else if (activeTab === 'inspections') setActiveModal('inspection');
            else if (activeTab === 'insurances') setActiveModal('insurance');
            else if (activeTab === 'services') setActiveModal('service');
            else if (activeTab === 'assignments') setActiveModal('assignment');
            else if (activeTab === 'documents') setActiveModal('document');
          }}
          style={styles.fab}
        />
      )}

      {/* Options Menu Modal (3-dots) */}
      <GlassModal visible={isOptionsModalVisible} onDismiss={() => setIsOptionsModalVisible(false)}>
        <Text style={[styles.modalTitle, { color: c.text, textAlign: 'center', marginBottom: 20 }]}>İşlemler</Text>
        <View style={styles.optionsList}>
          <Pressable 
            style={[styles.optionItem, { borderBottomWidth: 1, borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} 
            onPress={openEditModal}
          >
            <Ionicons name="create-outline" size={20} color={c.primary} />
            <Text style={[styles.optionText, { color: c.text }]}>Aracı Düzenle</Text>
          </Pressable>
          
          <Pressable 
            style={styles.optionItem} 
            onPress={() => {
              setIsOptionsModalVisible(false);
              setTimeout(() => {
                handleConfirmDelete();
              }, 350);
            }}
          >
            <Ionicons name="trash-outline" size={20} color={c.error} />
            <Text style={[styles.optionText, { color: c.error }]}>Aracı Sil</Text>
          </Pressable>
        </View>
      </GlassModal>

      {/* Edit Vehicle Modal */}
      <GlassModal visible={isEditModalVisible} onDismiss={() => setIsEditModalVisible(false)}>
        <Text style={[styles.modalTitle, { color: c.text }]}>Aracı Düzenle</Text>
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          <GlassInput
            label="Plaka"
            value={editPlate}
            onChangeText={setEditPlate}
            placeholder="örn: 34ABC123"
            autoCapitalize="characters"
          />

          <GlassDropdown
            label="Araç Türü"
            value={editType}
            options={[
              { label: 'Otomobil', value: 'Otomobil' },
              { label: 'Çekici', value: 'Çekici' },
              { label: 'Dorse', value: 'Dorse' },
              { label: 'Kamyon', value: 'Kamyon' },
              { label: 'İş Makinesi', value: 'İş Makinesi' },
              { label: 'Diğer', value: 'Diğer' },
            ]}
            onSelect={setEditType}
            placeholder="Araç Türü Seçiniz"
          />

          <GlassInput
            label="Marka"
            value={editBrand}
            onChangeText={setEditBrand}
            placeholder="örn: Ford, Renault"
          />

          <GlassInput
            label="Model"
            value={editModel}
            onChangeText={setEditModel}
            placeholder="örn: Focus, Megane"
          />

          <GlassInput
            label="Yıl"
            value={editYear}
            onChangeText={setEditYear}
            keyboardType="numeric"
            placeholder="örn: 2022"
          />

          <GlassInput
            label="Kilometre (KM)"
            value={editKm}
            onChangeText={setEditKm}
            keyboardType="numeric"
            placeholder="örn: 45000"
          />

          <GlassInput
            label="Renk"
            value={editColor}
            onChangeText={setEditColor}
            placeholder="örn: Beyaz, Siyah"
          />

          <GlassInput
            label="Şasi Numarası (VIN)"
            value={editVin}
            onChangeText={setEditVin}
            placeholder="Şasi Numarası girin"
          />

          <GlassInput
            label="Motor Numarası"
            value={editEngineNo}
            onChangeText={setEditEngineNo}
            placeholder="Motor Numarası girin"
          />

          <GlassDropdown
            label="Durum"
            value={editStatus}
            options={[
              { label: 'Aktif', value: 'active' },
              { label: 'Bakımda', value: 'maintenance' },
              { label: 'Pasif', value: 'passive' },
              { label: 'Satıldı', value: 'sold' },
            ]}
            onSelect={setEditStatus}
            placeholder="Durum Seçiniz"
          />

          <GlassInput
            label="Notlar"
            value={editNotes}
            onChangeText={setEditNotes}
            placeholder="Araç ile ilgili notlar..."
            multiline
          />
        </ScrollView>
        <View style={styles.modalButtons}>
          <Button mode="text" onPress={() => setIsEditModalVisible(false)} textColor={c.textSecondary}>
            İptal
          </Button>
          <Button
            mode="contained"
            onPress={handleUpdateVehicle}
            loading={updateMutation.isPending}
            disabled={updateMutation.isPending || !editPlate || !editType}
            buttonColor={c.primary}
            textColor="#ffffff"
          >
            Kaydet
          </Button>
        </View>
      </GlassModal>

      {/* Add Assignment Modal */}
      <GlassModal visible={activeModal === 'assignment'} onDismiss={() => { setActiveModal(null); resetForm(); }}>
        <Text style={[styles.modalTitle, { color: c.text }]}>{editingItem ? 'Zimmet Kaydını Düzenle' : 'Yeni Zimmet Kaydı'}</Text>
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          <GlassInput
            label="Zimmet Edilen Ürün/Araç"
            value={assignItemName}
            onChangeText={setAssignItemName}
            placeholder="örn: Araç Zimmeti, Cep Telefonu"
          />
          <GlassInput
            label="Miktar"
            value={assignQuantity}
            onChangeText={setAssignQuantity}
            keyboardType="numeric"
            placeholder="1"
          />
          <GlassInput
            label="Zimmet Edilen Kişi"
            value={assignAssignedTo}
            onChangeText={setAssignAssignedTo}
            placeholder="Zimmet edilen personel adı"
          />
          <GlassInput
            label="Departman"
            value={assignDepartment}
            onChangeText={setAssignDepartment}
            placeholder="örn: Operasyon, Satış"
          />
          <GlassInput
            label="Zimmet Başlangıç Tarihi"
            value={assignStartDate}
            onChangeText={setAssignStartDate}
            placeholder="YYYY-MM-DD"
          />
          <GlassInput
            label="Zimmet Bitiş Tarihi"
            value={assignEndDate}
            onChangeText={setAssignEndDate}
            placeholder="YYYY-MM-DD (İsteğe bağlı)"
          />
          <GlassInput
            label="Notlar"
            value={assignNotes}
            onChangeText={setAssignNotes}
            placeholder="Zimmet ile ilgili notlar..."
            multiline
          />
        </ScrollView>
        <View style={styles.modalButtons}>
          <Button mode="text" onPress={() => { setActiveModal(null); resetForm(); }} textColor={c.textSecondary}>
            İptal
          </Button>
          <Button
            mode="contained"
            onPress={handleCreateAssignment}
            loading={createAssignmentMutation.isPending || updateAssignmentMutation.isPending}
            disabled={createAssignmentMutation.isPending || updateAssignmentMutation.isPending || !assignStartDate}
            buttonColor={c.primary}
            textColor="#ffffff"
          >
            {editingItem ? 'Güncelle' : 'Kaydet'}
          </Button>
        </View>
      </GlassModal>

      {/* Add Document Modal */}
      <GlassModal visible={activeModal === 'document'} onDismiss={() => { setActiveModal(null); resetForm(); }}>
        <Text style={[styles.modalTitle, { color: c.text }]}>{editingItem ? 'Belgeyi Düzenle' : 'Yeni Belge Kaydı'}</Text>
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          <GlassInput
            label="Belge Adı"
            value={docFileName}
            onChangeText={setDocFileName}
            placeholder="örn: Ruhsat, Muayene Belgesi"
          />
          <GlassInput
            label="Kategori / Tür"
            value={docCategory}
            onChangeText={setDocCategory}
            placeholder="örn: Zorunlu, Ruhsat, Kasko"
          />
          <GlassInput
            label="Geçerlilik Başlangıç Tarihi"
            value={docStartDate}
            onChangeText={handleDocStartDateChange}
            placeholder="YYYY-MM-DD"
          />
          <GlassInput
            label="Geçerlilik Bitiş Tarihi"
            value={docEndDate}
            onChangeText={setDocEndDate}
            placeholder="YYYY-MM-DD"
          />
          <Pressable
            onPress={handlePickDocument}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: glassBorderColor,
                backgroundColor: pressed ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                marginTop: 10,
                marginBottom: 10,
              }
            ]}
          >
            <Ionicons name="document-attach-outline" size={18} color={c.primary} />
            <Text style={{ color: c.text, fontWeight: '600' }}>
              {selectedFile ? 'Dosyayı Değiştir' : 'Belge Dosyası Seç'}
            </Text>
          </Pressable>
          {selectedFile && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 4 }}>
              <Ionicons name="checkmark-circle" size={16} color={c.success} />
              <Text style={{ color: c.textSecondary, fontSize: 13, flex: 1 }} numberOfLines={1}>
                {selectedFile.name} ({Math.round((selectedFile.size || 0) / 1024)} KB)
              </Text>
              <Pressable onPress={() => setSelectedFile(null)}>
                <Ionicons name="close-circle" size={18} color={c.error} />
              </Pressable>
            </View>
          )}
        </ScrollView>
        <View style={styles.modalButtons}>
          <Button mode="text" onPress={() => { setActiveModal(null); resetForm(); }} textColor={c.textSecondary}>
            İptal
          </Button>
          <Button
            mode="contained"
            onPress={handleCreateDocument}
            loading={createDocumentMutation.isPending || updateDocumentMutation.isPending}
            disabled={createDocumentMutation.isPending || updateDocumentMutation.isPending || !docFileName}
            buttonColor={c.primary}
            textColor="#ffffff"
          >
            {editingItem ? 'Güncelle' : 'Kaydet'}
          </Button>
        </View>
      </GlassModal>

      {/* Custom Document Preview Modal */}
      <Modal
        visible={!!previewUrl}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewUrl(null)}
      >
        <View style={styles.previewModalContainer}>
          <SafeAreaView style={styles.previewSafeArea}>
            {/* Header */}
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                Belge Önizleme
              </Text>
              <Pressable style={styles.previewCloseButton} onPress={() => setPreviewUrl(null)}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
            
            {/* Image Content */}
            <View style={styles.previewContent}>
              {previewUrl && (
                <Image 
                  source={{ uri: previewUrl }} 
                  style={styles.previewImage} 
                  resizeMode="contain" 
                />
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
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
  tabPicker: { marginVertical: 10, paddingHorizontal: 0 },
  tabsScroll: { gap: 8, paddingHorizontal: 16 },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabButtonText: { fontSize: 13, fontWeight: '600' },
  tabContainer: { paddingHorizontal: 16, marginTop: 12 },
  cardGlass: { padding: 0, marginHorizontal: 0, marginVertical: 6 },
  cardContent: { padding: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  detailLabel: { fontSize: 13, fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: '600' },
  tabLoader: { marginVertical: 20 },
  emptyText: { textAlign: 'center', marginVertical: 40, fontSize: 14 },
  subCardGlass: { padding: 0, marginBottom: 0, marginHorizontal: 0, marginVertical: 6 },
  subCardContent: { paddingVertical: 12, paddingHorizontal: 16 },
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
  previewModalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  previewSafeArea: {
    flex: 1,
  },
  previewHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 16,
  },
  previewCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
});

