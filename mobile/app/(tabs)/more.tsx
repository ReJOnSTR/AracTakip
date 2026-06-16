import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Pressable,
  Alert,
} from 'react-native';
import { Text, Button, Portal, Modal, Divider, Avatar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../stores/authStore';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';

export default function MoreScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, apiUrl, updateApiUrl, logout, companies, selectedCompanyId, setSelectedCompany } = useAuthStore();

  // Settings State
  const [ipInput, setIpInput] = useState(apiUrl);
  const [isUpdatingIp, setIsUpdatingIp] = useState(false);

  // Company selector modal state
  const [isCompanyModalVisible, setIsCompanyModalVisible] = useState(false);

  const currentCompany = companies.find(comp => comp.id === selectedCompanyId);

  const handleUpdateIp = async () => {
    try {
      setIsUpdatingIp(true);
      await updateApiUrl(ipInput);
      Alert.alert('Başarılı', 'API URL adresi başarıyla güncellendi.');
    } catch (err) {
      Alert.alert('Hata', 'API adresi güncellenirken bir sorun oluştu.');
    } finally {
      setIsUpdatingIp(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Çıkış', 'Çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Evet', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U';
  };

  return (
    <View style={styles.container}>
      <MovingBackground />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <View style={styles.profileSection}>
          <Avatar.Text
            size={60}
            label={getInitials(user?.full_name || user?.username || '')}
            style={{ backgroundColor: c.primaryContainer + '30' }}
            labelStyle={{ color: c.primary, fontWeight: 'bold' }}
          />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: c.text }]}>{user?.full_name || user?.username}</Text>
            <Text style={[styles.profileEmail, { color: c.textSecondary }]}>{user?.email}</Text>
          </View>
        </View>

        {/* Selected Company */}
        <Pressable
          onPress={() => setIsCompanyModalVisible(true)}
        >
          <GlassCard intensity={30} style={styles.compCardGlass}>
            <View style={styles.compCardInner}>
              <View style={styles.compLeft}>
                <View style={[styles.compIcon, { backgroundColor: c.primaryContainer + '20' }]}>
                  <Ionicons name="business" size={20} color={c.primary} />
                </View>
                <View>
                  <Text style={[styles.compLabel, { color: c.textTertiary }]}>Aktif Şirket</Text>
                  <Text style={[styles.compName, { color: c.text }]}>{currentCompany?.name || 'Şirket Seçilmedi'}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
            </View>
          </GlassCard>
        </Pressable>

        {/* Modules Section */}
        <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>Modüller</Text>
        <GlassCard intensity={30} style={styles.menuCardGlass}>
          <Pressable style={styles.menuItem} android_ripple={{ color: c.surfaceVariant }} onPress={() => router.push('/finance')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="wallet-outline" size={22} color={c.primary} />
              <Text style={[styles.menuItemText, { color: c.text }]}>Finans</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
          </Pressable>
          <Divider style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />
          <Pressable style={styles.menuItem} android_ripple={{ color: c.surfaceVariant }} onPress={() => router.push('/works')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="briefcase-outline" size={22} color={c.primary} />
              <Text style={[styles.menuItemText, { color: c.text }]}>İşler (Works)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
          </Pressable>
          <Divider style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />
          <Pressable style={styles.menuItem} android_ripple={{ color: c.surfaceVariant }} onPress={() => router.push('/customers')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="people-outline" size={22} color={c.primary} />
              <Text style={[styles.menuItemText, { color: c.text }]}>Müşteriler</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
          </Pressable>
          <Divider style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />
          <Pressable style={styles.menuItem} android_ripple={{ color: c.surfaceVariant }} onPress={() => router.push('/meal-tickets')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="receipt-outline" size={22} color={c.primary} />
              <Text style={[styles.menuItemText, { color: c.text }]}>Yemek Fişleri</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
          </Pressable>
        </GlassCard>

        {/* Server Config */}
        <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>Sunucu Ayarları</Text>
        <GlassCard intensity={30} style={styles.configCardGlass}>
          <View style={styles.configContent}>
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
              disabled={isUpdatingIp}
              style={styles.saveButton}
              buttonColor={c.primary}
              textColor="#ffffff"
            >
              Adresi Güncelle
            </Button>
          </View>
        </GlassCard>

        {/* Actions */}
        <View style={styles.actionRow}>
          <Button
            mode="outlined"
            onPress={handleLogout}
            icon="logout"
            textColor={c.error}
            style={[styles.logoutBtn, { borderColor: c.error + '50' }]}
          >
            Çıkış Yap
          </Button>
        </View>

        <Text style={[styles.versionText, { color: c.textTertiary }]}>Kontrol Mobil v1.0.0</Text>
      </ScrollView>

      {/* Popups / Modals */}
      <Portal>
        {/* Company Selector */}
        <Modal
          visible={isCompanyModalVisible}
          onDismiss={() => setIsCompanyModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <GlassCard intensity={85} style={styles.modalGlassCard}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Şirket Seçin</Text>
            <ScrollView style={styles.modalScroll}>
              {companies.map(comp => (
                <Pressable
                  key={comp.id}
                  style={[
                    styles.companyOption,
                    selectedCompanyId === comp.id && { backgroundColor: c.primaryContainer + '30' }
                  ]}
                  onPress={() => {
                    setSelectedCompany(comp.id);
                    setIsCompanyModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.companyOptionText,
                      { color: selectedCompanyId === comp.id ? c.primary : c.text }
                    ]}
                  >
                    {comp.name}
                  </Text>
                  {selectedCompanyId === comp.id && (
                    <Ionicons name="checkmark-sharp" size={18} color={c.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </GlassCard>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 110 },
  profileSection: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 16 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700' },
  profileEmail: { fontSize: 13, marginTop: 2 },
  compCardGlass: { padding: 0, marginBottom: 20 },
  compCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  compLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  compIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compLabel: { fontSize: 11, fontWeight: '600' },
  compName: { fontSize: 14, fontWeight: '700', marginTop: 1 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  menuCardGlass: { padding: 0, marginBottom: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemText: { fontSize: 14, fontWeight: '600' },
  configCardGlass: { padding: 0, marginBottom: 20 },
  configContent: { padding: 16 },
  saveButton: { alignSelf: 'flex-end', marginTop: 8 },
  actionRow: { marginTop: 10, marginBottom: 20 },
  logoutBtn: { borderRadius: 12, borderWidth: 1 },
  versionText: { textAlign: 'center', fontSize: 12, marginTop: 10 },
  modalContent: {
    marginTop: 'auto',
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
  modalScroll: { maxHeight: 300 },
  companyOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, marginVertical: 4 },
  companyOptionText: { fontSize: 14, fontWeight: '600' },
});
