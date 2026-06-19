import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Pressable,
  Alert,
} from 'react-native';
import { Text, Button, Portal, Modal, Avatar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../stores/authStore';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, companies, selectedCompanyId, setSelectedCompany } = useAuthStore();

  // Company selector modal state
  const [isCompanyModalVisible, setIsCompanyModalVisible] = useState(false);

  const currentCompany = companies.find(comp => comp.id === selectedCompanyId);

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
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>Profil</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileSection}>
          <Avatar.Text
            size={70}
            label={getInitials(user?.full_name || user?.username || '')}
            style={{ backgroundColor: c.primaryContainer + '30' }}
            labelStyle={{ color: c.primary, fontWeight: 'bold' }}
          />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: c.text }]}>{user?.full_name || user?.username}</Text>
            <Text style={[styles.profileEmail, { color: c.textSecondary }]}>{user?.email}</Text>
          </View>
        </View>

        {/* Selected Company Selector */}
        <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>Şirket Yönetimi</Text>
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

        {/* Actions / Logout */}
        <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>Hesap İşlemleri</Text>
        <GlassCard intensity={30} style={styles.actionCardGlass}>
          <Pressable style={styles.menuItem} android_ripple={{ color: c.surfaceVariant }} onPress={handleLogout}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="log-out-outline" size={22} color={c.error} />
              <Text style={[styles.menuItemText, { color: c.error }]}>Çıkış Yap</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
          </Pressable>
        </GlassCard>

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
                    <Ionicons name="checkmark" size={20} color={c.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <Button
              mode="outlined"
              onPress={() => setIsCompanyModalVisible(false)}
              style={{ marginTop: 16 }}
              textColor={c.primary}
            >
              Kapat
            </Button>
          </GlassCard>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
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
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 16,
    paddingHorizontal: 4,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 22, fontWeight: '700' },
  profileEmail: { fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 24, marginBottom: 8, paddingHorizontal: 4 },
  compCardGlass: { padding: 0 },
  compCardInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  compLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  compIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  compLabel: { fontSize: 10, fontWeight: '600' },
  compName: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  actionCardGlass: { padding: 0, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemText: { fontSize: 15, fontWeight: '600' },
  versionText: { textAlign: 'center', fontSize: 11, marginTop: 40 },
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
  modalScroll: { maxHeight: 300 },
  companyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
  },
  companyOptionText: { fontSize: 15, fontWeight: '600' },
});
