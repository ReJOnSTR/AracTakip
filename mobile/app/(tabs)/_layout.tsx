import { useState, useEffect } from 'react';
import GlassModal from '../../components/ui/GlassModal';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useColorScheme, Platform, StyleSheet, View, Pressable, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Text, Button } from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import * as Haptics from 'expo-haptics';

import Animated, { 
  FadeInDown, 
  FadeOutDown,
} from 'react-native-reanimated';
import { useAuthStore } from '../../stores/authStore';
import GlassInput from '../../components/ui/GlassInput';
import { NativeUiTabBar } from '../../modules/native-ui';

function CustomTabBar({ c, colorScheme }: any) {
  const router = useRouter();
  const segments = useSegments();
  const { apiUrl, updateApiUrl } = useAuthStore();

  const rawRouteName = (segments[segments.length - 1] || 'index') as string;
  const isInTabs = segments[0] === '(tabs)';

  const [lastTabRoute, setLastTabRoute] = useState('index');

  useEffect(() => {
    if (isInTabs) {
      setLastTabRoute(rawRouteName);
    }
  }, [isInTabs, rawRouteName]);

  const currentRouteName = isInTabs ? rawRouteName : lastTabRoute;

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isIpModalVisible, setIsIpModalVisible] = useState(false);
  const [ipInput, setIpInput] = useState(apiUrl);
  const [isUpdatingIp, setIsUpdatingIp] = useState(false);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const handleUpdateIp = async () => {
    try {
      setIsUpdatingIp(true);
      await updateApiUrl(ipInput);
      Alert.alert('Başarılı', 'API URL adresi başarıyla güncellendi.');
      setIsIpModalVisible(false);
    } catch (err) {
      Alert.alert('Hata', 'API adresi güncellenirken bir sorun oluştu.');
    } finally {
      setIsUpdatingIp(false);
    }
  };

  const getActiveTab = () => {
    if (currentRouteName === 'index' || (isInTabs && segments.length === 1)) return 'index';
    if (['vehicles', 'vehicles-list', 'assignment-list', 'maintenance-list', 'inspection-list', 'insurance-list', 'service-list'].includes(currentRouteName)) return 'vehicles';
    if (['employees', 'employees-list', 'leaves-list', 'overtimes-list', 'payroll-list', 'personel-dashboard'].includes(currentRouteName)) return 'employees';
    if (['profile'].includes(currentRouteName)) return 'profile';
    if (['finance', 'finance-list', 'finance-dashboard', 'works', 'customers', 'meal-tickets'].includes(currentRouteName)) return 'more';
    return 'index';
  };

  const activeTab = getActiveTab();

  const glassBorderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.40)' : 'rgba(255, 255, 255, 0.75)';
  const glassBgColor = Platform.OS === 'web'
    ? (colorScheme === 'dark' ? 'rgba(26, 26, 46, 0.85)' : 'rgba(255, 255, 255, 0.85)')
    : (colorScheme === 'dark' ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)');

  const shadowStyle = {
    shadowColor: '#000000',
    shadowOpacity: 0.20,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 10,
  };

  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.tabBarOuterWrapper, { bottom: 0, left: 0, right: 0, width: '100%', alignItems: 'stretch' }]}>
        <View style={{ width: '100%', overflow: 'visible' }}>
          {/* FLOATING DIĞER MENU OVERLAY */}
          {isMenuVisible && (
            <View style={{ width: '100%', alignItems: 'center' }}>
              <Animated.View
                entering={FadeInDown.duration(200)}
                exiting={FadeOutDown.duration(150)}
                style={[
                  shadowStyle,
                  styles.menuOverlayOuter,
                  {
                    width: 320,
                    borderColor: glassBorderColor,
                    borderWidth: 1.2,
                    backgroundColor: glassBgColor,
                    marginBottom: 12,
                  }
                ]}
              >
                {Platform.OS !== 'web' && (
                  <BlurView intensity={90} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                )}

                {/* Finans */}
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    setIsMenuVisible(false);
                    router.push('/(tabs)/finance-list');
                  }}
                  style={styles.menuOverlayItem}
                >
                  <Ionicons name="wallet-outline" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                  <Text style={[styles.menuOverlayText, { color: c.text }]}>Finans & Ödemeler</Text>
                </Pressable>
                <View style={[styles.menuDivider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }]} />

                {/* İş Takibi */}
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    setIsMenuVisible(false);
                    router.push('/(tabs)/works');
                  }}
                  style={styles.menuOverlayItem}
                >
                  <Ionicons name="briefcase-outline" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                  <Text style={[styles.menuOverlayText, { color: c.text }]}>İş Takibi & Görevler</Text>
                </Pressable>
                <View style={[styles.menuDivider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }]} />

                {/* Müşteriler */}
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    setIsMenuVisible(false);
                    router.push('/(tabs)/customers');
                  }}
                  style={styles.menuOverlayItem}
                >
                  <Ionicons name="people-outline" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                  <Text style={[styles.menuOverlayText, { color: c.text }]}>Müşteriler & Cari</Text>
                </Pressable>
                <View style={[styles.menuDivider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }]} />

                {/* Yemek Fişleri */}
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    setIsMenuVisible(false);
                    router.push('/(tabs)/meal-tickets');
                  }}
                  style={styles.menuOverlayItem}
                >
                  <Ionicons name="receipt-outline" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                  <Text style={[styles.menuOverlayText, { color: c.text }]}>Yemek Fişleri & Kuponlar</Text>
                </Pressable>
                <View style={[styles.menuDivider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }]} />

                {/* Sunucu Ayarları */}
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    setIsMenuVisible(false);
                    setIsIpModalVisible(true);
                  }}
                  style={styles.menuOverlayItem}
                >
                  <Ionicons name="settings-outline" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                  <Text style={[styles.menuOverlayText, { color: c.text }]}>Sunucu Ayarları</Text>
                </Pressable>
              </Animated.View>
            </View>
          )}

          {/* SWIFTUI NATIVE TAB BAR */}
          <NativeUiTabBar
            activeTab={activeTab}
            showPlusButton={false}
            colorScheme={colorScheme}
            onTabPress={(event) => {
              const tab = event.nativeEvent.tabName;
              if (tab === 'more') {
                setIsMenuVisible(!isMenuVisible);
              } else {
                setIsMenuVisible(false);
                if (tab === 'index') router.navigate('/(tabs)');
                else if (tab === 'vehicles') router.navigate('/(tabs)/vehicles');
                else if (tab === 'employees') router.navigate('/(tabs)/employees');
                else if (tab === 'profile') router.navigate('/(tabs)/profile');
              }
            }}
            onPlusPress={() => {}}
            style={{ width: '100%', height: 49 + 34, backgroundColor: 'transparent' }}
          />
        </View>

        {/* Sunucu Ayarları Modal */}
        <GlassModal visible={isIpModalVisible} onDismiss={() => setIsIpModalVisible(false)}>
          <Text style={[styles.modalTitle, { color: c.text }]}>Sunucu Ayarları</Text>
          <ScrollView style={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
            <GlassInput label="Sunucu API Adresi" value={ipInput} onChangeText={setIpInput} placeholder="http://192.168.1.X:9999" />
            <View style={styles.modalButtons}>
              <Button mode="text" onPress={() => setIsIpModalVisible(false)} textColor={c.textSecondary}>İptal</Button>
              <Button mode="contained" onPress={handleUpdateIp} loading={isUpdatingIp} disabled={isUpdatingIp || !ipInput.trim()} buttonColor={c.primary} textColor="#ffffff">Güncelle</Button>
            </View>
          </ScrollView>
        </GlassModal>
      </View>
    );
  }

  return (
    <View style={styles.tabBarOuterWrapper}>
      <NativeUiTabBar
        activeTab={activeTab}
        showPlusButton={false}
        colorScheme={colorScheme}
        onTabPress={(event) => {
          const tab = event.nativeEvent.tabName;
          if (tab === 'index') router.navigate('/(tabs)');
          else if (tab === 'vehicles') router.navigate('/(tabs)/vehicles');
          else if (tab === 'employees') router.navigate('/(tabs)/employees');
          else if (tab === 'profile') router.navigate('/(tabs)/profile');
        }}
        onPlusPress={() => {}}
        style={{ width: '100%', height: 49 + 34, backgroundColor: 'transparent' }}
      />
    </View>
  );
}

import { useThemeStore } from '../../stores/themeStore';

export default function TabLayout() {
  const { themeMode } = useThemeStore();
  const colorScheme = themeMode;
  const c = Colors[colorScheme];

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="vehicles" options={{ animation: 'none' }} />
        <Stack.Screen name="employees" options={{ animation: 'none' }} />
        <Stack.Screen name="profile" options={{ animation: 'none' }} />
        <Stack.Screen name="finance" options={{ animation: 'none' }} />
        <Stack.Screen name="works" options={{ animation: 'none' }} />
        <Stack.Screen name="customers" options={{ animation: 'none' }} />
        <Stack.Screen name="meal-tickets" options={{ animation: 'none' }} />
        <Stack.Screen name="employees-list" />
        <Stack.Screen name="vehicles-list" />
        <Stack.Screen name="assignment-list" />
        <Stack.Screen name="maintenance-list" />
        <Stack.Screen name="inspection-list" />
        <Stack.Screen name="insurance-list" />
        <Stack.Screen name="service-list" />
        <Stack.Screen name="payroll-list" />
        <Stack.Screen name="leaves-list" />
        <Stack.Screen name="overtimes-list" />
        <Stack.Screen name="finance-list" />
        <Stack.Screen name="finance-dashboard" />
        <Stack.Screen name="personel-dashboard" />
      </Stack>
      <CustomTabBar c={c} colorScheme={colorScheme} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarOuterWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  menuOverlayOuter: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  menuOverlayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  menuOverlayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
});
