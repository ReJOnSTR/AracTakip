import { useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useColorScheme, Platform, StyleSheet, View, Pressable, useWindowDimensions, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Text, Portal, Modal, Button } from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import Animated, { LinearTransition, FadeInRight, FadeOutRight, FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useAuthStore } from '../../stores/authStore';
import GlassInput from '../../components/ui/GlassInput';
import GlassCard from '../../components/ui/GlassCard';

// Custom Tab Bar Component to bypass React Navigation container style limits
function CustomTabBar({ state, descriptors, navigation, c, colorScheme }: any) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { apiUrl, updateApiUrl } = useAuthStore();

  const currentRouteName = state.routes[state.index].name;
  const showPlusButton = currentRouteName === 'vehicles' || currentRouteName === 'employees' || currentRouteName === 'finance';

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isIpModalVisible, setIsIpModalVisible] = useState(false);
  const [ipInput, setIpInput] = useState(apiUrl);
  const [isUpdatingIp, setIsUpdatingIp] = useState(false);

  // Sleek compact tab bar width (70% of screen) for icons-only look
  const tabWidth = width * 0.70;
  const plusButtonWidth = 46;
  const gap = 10;
  
  const totalWidth = showPlusButton ? (tabWidth + gap + plusButtonWidth) : tabWidth;

  const shadowStyle = {
    shadowColor: '#000000',
    shadowOpacity: colorScheme === 'dark' ? 0.45 : 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 12,
  };

  const handlePlusPress = () => {
    if (currentRouteName === 'finance' || currentRouteName === 'vehicles' || currentRouteName === 'employees') {
      router.setParams({ openAdd: 'true' });
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

  // Compile active buttons array (Manually inject Diğer/More between employees and profile)
  const buttons: any[] = [];
  
  // 1. Panel
  const panelRoute = state.routes.find((r: any) => r.name === 'index');
  if (panelRoute) {
    buttons.push({
      key: panelRoute.key,
      name: 'index',
      label: 'Panel',
      iconName: currentRouteName === 'index' ? 'grid' : 'grid-outline',
      isFocused: currentRouteName === 'index',
      onPress: () => {
        setIsMenuVisible(false);
        navigation.navigate('index');
      }
    });
  }

  // 2. Araçlar
  const vehiclesRoute = state.routes.find((r: any) => r.name === 'vehicles');
  if (vehiclesRoute) {
    buttons.push({
      key: vehiclesRoute.key,
      name: 'vehicles',
      label: 'Araçlar',
      iconName: currentRouteName === 'vehicles' ? 'car' : 'car-outline',
      isFocused: currentRouteName === 'vehicles',
      onPress: () => {
        setIsMenuVisible(false);
        navigation.navigate('vehicles');
      }
    });
  }

  // 3. Personel
  const employeesRoute = state.routes.find((r: any) => r.name === 'employees');
  if (employeesRoute) {
    buttons.push({
      key: employeesRoute.key,
      name: 'employees',
      label: 'Personel',
      iconName: currentRouteName === 'employees' ? 'people' : 'people-outline',
      isFocused: currentRouteName === 'employees',
      onPress: () => {
        setIsMenuVisible(false);
        navigation.navigate('employees');
      }
    });
  }

  // 4. Diğer (Custom Action Button - toggles overlay)
  buttons.push({
    key: 'custom-more-button',
    name: 'more_custom',
    label: 'Diğer',
    iconName: isMenuVisible ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline',
    isFocused: isMenuVisible || currentRouteName === 'finance',
    onPress: () => {
      setIsMenuVisible(!isMenuVisible);
    }
  });

  // 5. Profil
  const profileRoute = state.routes.find((r: any) => r.name === 'profile');
  if (profileRoute) {
    buttons.push({
      key: profileRoute.key,
      name: 'profile',
      label: 'Profil',
      iconName: currentRouteName === 'profile' ? 'person' : 'person-outline',
      isFocused: currentRouteName === 'profile',
      onPress: () => {
        setIsMenuVisible(false);
        navigation.navigate('profile');
      }
    });
  }

  return (
    <View style={styles.tabBarOuterWrapper}>
      {/* FLOATING DIĞER MENU OVERLAY (Directly above the Diğer button - matched to same width as pill) */}
      {isMenuVisible && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOutDown.duration(150)}
          style={[
            shadowStyle,
            styles.menuOverlayOuter,
            {
              width: tabWidth,
              borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.45)',
              backgroundColor: Platform.OS === 'web'
                ? (colorScheme === 'dark' ? 'rgba(26, 26, 46, 0.92)' : 'rgba(255, 255, 255, 0.92)')
                : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.45)'),
            }
          ]}
        >
          {Platform.OS !== 'web' && (
            <BlurView
              intensity={Platform.OS === 'ios' ? 85 : 95}
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          )}

          <Pressable
            onPress={() => {
              setIsMenuVisible(false);
              navigation.navigate('finance');
            }}
            style={styles.menuOverlayItem}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.08)' }}
          >
            <Ionicons name="wallet-outline" size={20} color={c.primary} />
            <Text style={[styles.menuOverlayText, { color: c.text }]}>Finans</Text>
          </Pressable>
          <View style={[styles.menuDivider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }]} />

          <Pressable
            onPress={() => {
              setIsMenuVisible(false);
              router.push('/works');
            }}
            style={styles.menuOverlayItem}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.08)' }}
          >
            <Ionicons name="briefcase-outline" size={20} color={c.primary} />
            <Text style={[styles.menuOverlayText, { color: c.text }]}>İş Takibi</Text>
          </Pressable>
          <View style={[styles.menuDivider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }]} />

          <Pressable
            onPress={() => {
              setIsMenuVisible(false);
              router.push('/customers');
            }}
            style={styles.menuOverlayItem}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.08)' }}
          >
            <Ionicons name="people-outline" size={20} color={c.primary} />
            <Text style={[styles.menuOverlayText, { color: c.text }]}>Müşteriler (Cari)</Text>
          </Pressable>
          <View style={[styles.menuDivider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }]} />

          <Pressable
            onPress={() => {
              setIsMenuVisible(false);
              router.push('/meal-tickets');
            }}
            style={styles.menuOverlayItem}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.08)' }}
          >
            <Ionicons name="receipt-outline" size={20} color={c.primary} />
            <Text style={[styles.menuOverlayText, { color: c.text }]}>Yemek Fişleri</Text>
          </Pressable>
          <View style={[styles.menuDivider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }]} />

          <Pressable
            onPress={() => {
              setIsMenuVisible(false);
              setIsIpModalVisible(true);
            }}
            style={styles.menuOverlayItem}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.08)' }}
          >
            <Ionicons name="settings-outline" size={20} color={c.primary} />
            <Text style={[styles.menuOverlayText, { color: c.text }]}>Sunucu Ayarları</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* PRIMARY TAB BAR PILL ROW */}
      <View
        style={{
          width: totalWidth,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={[
            shadowStyle,
            {
              width: tabWidth,
              height: 56,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.45)',
              backgroundColor: Platform.OS === 'web'
                ? (colorScheme === 'dark' ? 'rgba(26, 26, 46, 0.85)' : 'rgba(255, 255, 255, 0.85)')
                : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.35)'),
              overflow: 'hidden',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-around',
            }
          ]}
        >
          {Platform.OS !== 'web' && (
            <BlurView
              intensity={Platform.OS === 'ios' ? 75 : 85}
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          )}

          {buttons.map((btn: any) => (
            <Pressable
              key={btn.key}
              onPress={btn.onPress}
              style={styles.tabButton}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: true }}
            >
              <Ionicons
                name={btn.iconName as any}
                size={22}
                color={btn.isFocused ? c.primary : c.textSecondary}
              />
            </Pressable>
          ))}
        </View>

        {/* PLUS BUTTON (Shown alongside primary bar at bottom) */}
        {showPlusButton && (
          <Animated.View
            style={{ flexDirection: 'row', alignItems: 'center', height: 56 }}
            entering={FadeInRight.duration(150)}
            exiting={FadeOutRight.duration(150)}
            layout={LinearTransition.duration(200)}
          >
            {/* GAP */}
            <View style={{ width: gap }} />

            {/* CIRCULAR PLUS BUTTON */}
            <Pressable
              onPress={handlePlusPress}
              style={[
                styles.plusButtonOuter,
                {
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.45)',
                  backgroundColor: Platform.OS === 'web'
                    ? (colorScheme === 'dark' ? 'rgba(26, 26, 46, 0.85)' : 'rgba(255, 255, 255, 0.85)')
                    : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.35)'),
                }
              ]}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: true }}
            >
              {Platform.OS !== 'web' && (
                <BlurView
                  intensity={Platform.OS === 'ios' ? 75 : 85}
                  tint={colorScheme === 'dark' ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Ionicons name="add" size={24} color={c.primary} />
            </Pressable>
          </Animated.View>
        )}
      </View>

      {/* PORTAL FOR DYNAMIC IP SETTINGS SHEET */}
      <Portal>
        <Modal
          visible={isIpModalVisible}
          onDismiss={() => setIsIpModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <GlassCard intensity={85} style={styles.modalGlassCard}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Sunucu Ayarları</Text>
            <ScrollView style={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
              <GlassInput
                label="Sunucu API Adresi"
                value={ipInput}
                onChangeText={setIpInput}
                placeholder="http://192.168.1.X:9999"
              />
              <View style={styles.modalButtons}>
                <Button
                  mode="text"
                  onPress={() => setIsIpModalVisible(false)}
                  textColor={c.textSecondary}
                >
                  İptal
                </Button>
                <Button
                  mode="contained"
                  onPress={handleUpdateIp}
                  loading={isUpdatingIp}
                  disabled={isUpdatingIp || !ipInput.trim()}
                  buttonColor={c.primary}
                  textColor="#ffffff"
                >
                  Güncelle
                </Button>
              </View>
            </ScrollView>
          </GlassCard>
        </Modal>
      </Portal>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} c={c} colorScheme={colorScheme} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Panel',
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Araçlar',
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Personel',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Finans',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOuterWrapper: {
    position: 'absolute',
    bottom: 24,
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
  plusButtonOuter: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
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
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
});
