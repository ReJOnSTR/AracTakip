import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Pressable,
  Alert,
} from 'react-native';
import { Text, Button, Divider } from 'react-native-paper';
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
  const { apiUrl, updateApiUrl } = useAuthStore();

  // Settings State
  const [ipInput, setIpInput] = useState(apiUrl);
  const [isUpdatingIp, setIsUpdatingIp] = useState(false);

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

  return (
    <View style={styles.container}>
      <MovingBackground />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>Diğer</Text>
        </View>

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

        <Text style={[styles.versionText, { color: c.textTertiary }]}>Kontrol Mobil v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 110 },
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
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4, marginTop: 16 },
  menuCardGlass: { padding: 0, marginBottom: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemText: { fontSize: 14, fontWeight: '600' },
  configCardGlass: { padding: 0, marginBottom: 20 },
  configContent: { padding: 16 },
  saveButton: { alignSelf: 'flex-end', marginTop: 8 },
  versionText: { textAlign: 'center', fontSize: 12, marginTop: 10 },
});
