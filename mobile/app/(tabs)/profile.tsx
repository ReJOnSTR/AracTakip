import { useState } from 'react';
import GlassModal from '../../components/ui/GlassModal';
import {
  View,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Pressable,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { Text, Button, Avatar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';
import GlassIconButton from '../../components/ui/GlassIconButton';
import GlassInput from '../../components/ui/GlassInput';

export default function ProfileScreen() {
  const { themeMode, setThemeMode } = useThemeStore();
  const colorScheme = themeMode;
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { user, logout, companies, selectedCompanyId, setSelectedCompany, apiUrl, updateApiUrl } = useAuthStore();

  // Modals state
  const [isCompanyModalVisible, setIsCompanyModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [ipInput, setIpInput] = useState(apiUrl);
  const [isUpdatingIp, setIsUpdatingIp] = useState(false);

  const currentCompany = companies.find(comp => comp.id === selectedCompanyId);

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleUpdateIp = async () => {
    try {
      setIsUpdatingIp(true);
      await updateApiUrl(ipInput);
      Alert.alert('Başarılı', 'Sunucu API adresi başarıyla güncellendi.');
    } catch (err) {
      Alert.alert('Hata', 'API adresi güncellenirken bir sorun oluştu.');
    } finally {
      setIsUpdatingIp(false);
    }
  };

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U';
  };

  return (
    <View style={styles.container}>
      <MovingBackground />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
        
        {/* Header with Top-Right Settings Button */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>Profilim</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colorScheme === 'dark' ? '#E2E8F0' : c.textSecondary, marginTop: 2 }}>Hesap ve Uygulama Ayarları</Text>
          </View>
          <GlassIconButton
            icon="settings-outline"
            size={44}
            iconSize={22}
            onPress={() => setIsSettingsModalVisible(true)}
          />
        </View>

        {/* User Card Container */}
        <GlassCard intensity={45} style={styles.userCardGlass}>
          <View style={styles.profileSection}>
            <Avatar.Text
              size={68}
              label={getInitials(user?.full_name || user?.username || 'Yönetici')}
              style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }}
              labelStyle={{ color: colorScheme === 'dark' ? '#FFFFFF' : '#000000', fontWeight: '800', fontSize: 24 }}
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>
                {user?.full_name || user?.username || 'Sistem Yöneticisi'}
              </Text>
              <Text style={[styles.profileEmail, { color: colorScheme === 'dark' ? '#E2E8F0' : c.textSecondary }]}>
                {user?.email || 'admin@kontrol.com'}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: colorScheme === 'dark' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(0,0,0,0.06)' }]}>
                <Ionicons name="shield-checkmark" size={13} color={colorScheme === 'dark' ? '#34D399' : '#000000'} />
                <Text style={[styles.roleBadgeText, { color: colorScheme === 'dark' ? '#34D399' : c.text, fontWeight: '700' }]}>
                  {user?.role === 'admin' || !user?.role ? 'Sistem Yöneticisi' : 'Kullanıcı'}
                </Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Selected Company Management */}
        <Text style={[styles.sectionTitle, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>Aktif Şirket</Text>
        <Pressable onPress={() => setIsCompanyModalVisible(true)}>
          <GlassCard intensity={45} style={styles.compCardGlass}>
            <View style={styles.compCardInner}>
              <View style={styles.compLeft}>
                <View style={[styles.compIconBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)' }]}>
                  <Ionicons name="business" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.compLabel, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>Seçili Şirket</Text>
                  <Text style={[styles.compName, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text, fontWeight: '700' }]} numberOfLines={1}>
                    {currentCompany?.name || 'Şirket Seçilmedi'}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }}>Değiştir</Text>
                <Ionicons name="chevron-forward" size={18} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
              </View>
            </View>
          </GlassCard>
        </Pressable>

        {/* Account Actions / Logout */}
        <Text style={[styles.sectionTitle, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>Hesap Yönetimi</Text>
        <GlassCard intensity={45} style={styles.actionCardGlass}>
          <Pressable style={styles.menuItem} onPress={handleLogout}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="log-out-outline" size={22} color="#FF453A" />
              <Text style={[styles.menuItemText, { color: '#FF453A', fontWeight: '700' }]}>Oturumu Kapat</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FF453A" />
          </Pressable>
        </GlassCard>

        <Text style={[styles.versionText, { color: c.textSecondary }]}>Kontrol Mobil v1.0.0 • Liquid Glass iOS</Text>
      </ScrollView>

      {/* Settings Bottom Sheet Modal */}
      <GlassModal visible={isSettingsModalVisible} onDismiss={() => setIsSettingsModalVisible(false)}>
        <View style={styles.modalHeaderRow}>
          <View>
            <Text style={[styles.modalTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>Uygulama Ayarları</Text>
            <Text style={{ fontSize: 13, color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary, marginTop: 2 }}>Görünüm ve Sunucu Bağlantısı</Text>
          </View>
          <GlassIconButton
            icon="close"
            size={36}
            iconSize={18}
            onPress={() => setIsSettingsModalVisible(false)}
          />
        </View>

        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* iOS Style Theme Toggle Row */}
          <Text style={[styles.modalSectionLabel, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>Görünüm & Tema</Text>
          <View style={[styles.settingsRow, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name={colorScheme === 'dark' ? 'moon' : 'sunny'} size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
              <Text style={[styles.settingsRowText, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>Karanlık Mod</Text>
            </View>
            <Switch
              value={themeMode === 'dark'}
              onValueChange={(val) => setThemeMode(val ? 'dark' : 'light')}
              trackColor={{ false: 'rgba(200, 200, 200, 0.5)', true: '#34c759' }}
              thumbColor="#ffffff"
              ios_backgroundColor="rgba(200, 200, 200, 0.5)"
            />
          </View>

          {/* Server Settings */}
          <Text style={[styles.modalSectionLabel, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary, marginTop: 18 }]}>Sunucu Bağlantısı</Text>
          <GlassInput
            label="Sunucu API Adresi"
            value={ipInput}
            onChangeText={setIpInput}
            placeholder="http://192.168.1.X:9999"
          />
          <Button
            mode="contained"
            onPress={handleUpdateIp}
            loading={isUpdatingIp}
            disabled={isUpdatingIp || !ipInput.trim()}
            buttonColor={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
            textColor={colorScheme === 'dark' ? '#000000' : '#FFFFFF'}
            style={{ marginTop: 12, borderRadius: 14 }}
          >
            Sunucu Adresini Güncelle
          </Button>

          {/* Version Info */}
          <View style={[styles.infoBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
            <Ionicons name="information-circle-outline" size={18} color={colorScheme === 'dark' ? '#94A3B8' : c.textSecondary} />
            <Text style={[styles.infoBoxText, { color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary }]}>
              Kontrol Mobil v1.0.0 (Build 2026.07) • Apple SwiftUI Liquid Glass Engine
            </Text>
          </View>
        </ScrollView>
        <View style={styles.modalFooterRow}>
          <Button
            mode="contained"
            onPress={() => setIsSettingsModalVisible(false)}
            buttonColor={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
            textColor={colorScheme === 'dark' ? '#000000' : '#FFFFFF'}
            style={{ borderRadius: 14, flex: 1 }}
          >
            Tamam
          </Button>
        </View>
      </GlassModal>

      {/* Company Selector Modal */}
      <GlassModal visible={isCompanyModalVisible} onDismiss={() => setIsCompanyModalVisible(false)}>
        <View style={styles.modalHeaderRow}>
          <View>
            <Text style={[styles.modalTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : c.text }]}>Şirket Seçin</Text>
            <Text style={{ fontSize: 13, color: colorScheme === 'dark' ? '#94A3B8' : c.textSecondary, marginTop: 2 }}>İşlem yapacağınız aktif şirketi belirleyin</Text>
          </View>
          <GlassIconButton
            icon="close"
            size={36}
            iconSize={18}
            onPress={() => setIsCompanyModalVisible(false)}
          />
        </View>

        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          {companies.map(comp => {
            const isSelected = selectedCompanyId === comp.id;
            return (
              <Pressable
                key={comp.id}
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
                onPress={() => {
                  setSelectedCompany(comp.id);
                  setIsCompanyModalVisible(false);
                }}
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
                    {comp.name}
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
        <View style={styles.modalFooterRow}>
          <Button
            mode="text"
            onPress={() => setIsCompanyModalVisible(false)}
            textColor={colorScheme === 'dark' ? '#94A3B8' : c.textSecondary}
            style={{ flex: 1 }}
          >
            İptal
          </Button>
        </View>
      </GlassModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  userCardGlass: {
    padding: 0,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700' },
  profileEmail: { fontSize: 13, marginTop: 2 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 8, paddingHorizontal: 4 },
  compCardGlass: { padding: 0, borderRadius: 20, overflow: 'hidden', marginBottom: 10 },
  compCardInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  compLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  compIconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  compLabel: { fontSize: 11, fontWeight: '600' },
  compName: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  actionCardGlass: { padding: 0, borderRadius: 20, overflow: 'hidden', marginBottom: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuItemText: { fontSize: 16, fontWeight: '700' },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalScroll: { maxHeight: 420 },
  modalSectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 4,
  },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsRowText: { fontSize: 15, fontWeight: '600' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginTop: 18,
  },
  infoBoxText: { fontSize: 12, flex: 1, lineHeight: 16 },
  companyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginVertical: 4,
  },
  companyOptionText: { fontSize: 15 },
});
