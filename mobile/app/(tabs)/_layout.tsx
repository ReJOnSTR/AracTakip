import { useState, useEffect } from 'react';
import GlassModal from '../../components/ui/GlassModal';
import { Stack, useRouter, useSegments, useLocalSearchParams } from 'expo-router';
import { useColorScheme, Platform, StyleSheet, View, Pressable, useWindowDimensions, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Text, Button } from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import Animated, { 
  LinearTransition, 
  FadeInRight, 
  FadeOutRight, 
  FadeInDown, 
  FadeOutDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useAuthStore } from '../../stores/authStore';
import GlassInput from '../../components/ui/GlassInput';
import GlassCard from '../../components/ui/GlassCard';
import { NativeUiTabBar } from '../../modules/native-ui';

// Custom Tab Bar Component to bypass React Navigation container style limits
function CustomTabBar({ c, colorScheme }: any) {
  const { width } = useWindowDimensions();
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

  const listScreens = [
    'works', 
    'customers', 
    'meal-tickets', 
    'employees-list', 
    'vehicles-list', 
    'finance-list'
  ];
  const showPlusButton = false; // Plus buttons moved to top header next to filters

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isIpModalVisible, setIsIpModalVisible] = useState(false);
  const [ipInput, setIpInput] = useState(apiUrl);
  const [isUpdatingIp, setIsUpdatingIp] = useState(false);

  // Sleek compact tab bar width (70% of screen) for icons-only look
  const tabWidth = width * 0.70;
  const plusButtonWidth = 46;
  const gap = 10;

  const glassBorderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.5)';
  const glassBgColor = Platform.OS === 'web'
    ? (colorScheme === 'dark' ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.75)')
    : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.2)');

  const gradientColors: readonly [string, string, ...string[]] = colorScheme === 'dark'
    ? ['rgba(255, 255, 255, 0.07)', 'rgba(255, 255, 255, 0.01)']
    : ['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.2)'];

  const shadowStyle = {
    shadowColor: '#000000',
    shadowOpacity: colorScheme === 'dark' ? 0.45 : 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 12,
  };

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const handlePlusPress = () => {
    triggerHaptic();
    if (listScreens.includes(currentRouteName)) {
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

  const getActiveTab = () => {
    if (currentRouteName === 'index' || (isInTabs && segments.length === 1)) return 'index';
    if (['vehicles', 'vehicles-list', 'assignment-list', 'maintenance-list', 'inspection-list', 'insurance-list', 'service-list'].includes(currentRouteName)) return 'vehicles';
    if (['employees', 'employees-list', 'leaves-list', 'overtimes-list', 'payroll-list', 'personel-dashboard'].includes(currentRouteName)) return 'employees';
    if (['profile'].includes(currentRouteName)) return 'profile';
    if (['finance', 'finance-list', 'finance-dashboard', 'works', 'customers', 'meal-tickets'].includes(currentRouteName)) return 'more';
    return 'index';
  };

  const activeTab = getActiveTab();

  const buttons = [
    {
      name: 'index',
      label: 'Panel',
      iconName: activeTab === 'index' ? 'grid' : 'grid-outline',
      isFocused: activeTab === 'index',
      onPress: () => {
        triggerHaptic();
        setIsMenuVisible(false);
        router.navigate('/(tabs)');
      }
    },
    {
      name: 'vehicles',
      label: 'Araçlar',
      iconName: activeTab === 'vehicles' ? 'car' : 'car-outline',
      isFocused: activeTab === 'vehicles',
      onPress: () => {
        triggerHaptic();
        setIsMenuVisible(false);
        router.navigate('/(tabs)/vehicles');
      }
    },
    {
      name: 'employees',
      label: 'Personel',
      iconName: activeTab === 'employees' ? 'people' : 'people-outline',
      isFocused: activeTab === 'employees',
      onPress: () => {
        triggerHaptic();
        setIsMenuVisible(false);
        router.navigate('/(tabs)/employees');
      }
    },
    {
      name: 'more_custom',
      label: 'Diğer',
      iconName: isMenuVisible ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline',
      isFocused: activeTab === 'more',
      onPress: () => {
        triggerHaptic();
        setIsMenuVisible(!isMenuVisible);
      }
    },
    {
      name: 'profile',
      label: 'Profil',
      iconName: activeTab === 'profile' ? 'person' : 'person-outline',
      isFocused: activeTab === 'profile',
      onPress: () => {
        triggerHaptic();
        setIsMenuVisible(false);
        router.navigate('/(tabs)/profile');
      }
    }
  ];

  const activeIndex = buttons.findIndex((btn) => btn.isFocused);
  const numButtons = buttons.length;
  const buttonWidth = tabWidth / numButtons;
  const indicatorWidth = 53;

  const initialIndex = activeIndex !== -1 ? activeIndex : 0;
  const initialX = numButtons > 0 
    ? (initialIndex * buttonWidth + (buttonWidth - indicatorWidth) / 2)
    : 0;

  const translateX = useSharedValue(initialX);
  const opacity = useSharedValue(activeIndex !== -1 ? 1 : 0);

  useEffect(() => {
    if (activeIndex !== -1 && numButtons > 0) {
      const targetX = activeIndex * buttonWidth + (buttonWidth - indicatorWidth) / 2;
      if (!isNaN(targetX) && isFinite(targetX)) {
        translateX.value = withSpring(targetX, {
          damping: 18,
          stiffness: 150,
          mass: 0.5,
        });
        opacity.value = withTiming(1, { duration: 150 });
      }
    } else {
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [activeIndex, buttonWidth, numButtons]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  const indicatorGradientColors: readonly [string, string, ...string[]] = colorScheme === 'dark'
    ? ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.03)']
    : ['rgba(99, 102, 241, 0.25)', 'rgba(99, 102, 241, 0.05)'];

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
                    width: tabWidth,
                    borderColor: glassBorderColor,
                    borderWidth: 1.5,
                    backgroundColor: glassBgColor,
                    marginBottom: 10,
                  }
                ]}
              >
                {Platform.OS !== 'web' && (
                  <BlurView intensity={75} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                )}
                <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />

                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    setIsMenuVisible(false);
                    router.push('/(tabs)/finance');
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
                    triggerHaptic();
                    setIsMenuVisible(false);
                    router.push('/(tabs)/works');
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
                    triggerHaptic();
                    setIsMenuVisible(false);
                    router.push('/(tabs)/customers');
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
                    triggerHaptic();
                    setIsMenuVisible(false);
                    router.push('/(tabs)/meal-tickets');
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
                    triggerHaptic();
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
            </View>
          )}

          {/* SWIFTUI NATIVE TAB BAR */}
          <NativeUiTabBar
            activeTab={activeTab}
            showPlusButton={showPlusButton}
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
            onPlusPress={handlePlusPress}
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
      {/* Outer row to align pill + plus button at the bottom */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', overflow: 'visible' }}>
        {/* Column container for floating menu overlay + primary tab bar pill */}
        <View style={{ width: tabWidth, alignItems: 'center', overflow: 'visible' }}>
          {/* FLOATING DIĞER MENU OVERLAY */}
          {isMenuVisible && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              exiting={FadeOutDown.duration(150)}
              style={[
                shadowStyle,
                styles.menuOverlayOuter,
                {
                  width: tabWidth,
                  borderColor: glassBorderColor,
                  borderWidth: 1.5,
                  backgroundColor: glassBgColor,
                }
              ]}
            >
              {Platform.OS !== 'web' && (
                <BlurView intensity={75} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              )}
              <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />

              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setIsMenuVisible(false);
                  router.push('/(tabs)/finance');
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
                  triggerHaptic();
                  setIsMenuVisible(false);
                  router.push('/(tabs)/works');
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
                  triggerHaptic();
                  setIsMenuVisible(false);
                  router.push('/(tabs)/customers');
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
                  triggerHaptic();
                  setIsMenuVisible(false);
                  router.push('/(tabs)/meal-tickets');
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
                  triggerHaptic();
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

          {/* PRIMARY TAB BAR PILL */}
          <View
            style={[
              shadowStyle,
              {
                width: tabWidth,
                height: 56,
                borderRadius: 28,
                borderWidth: 1.5,
                borderColor: glassBorderColor,
                backgroundColor: glassBgColor,
                overflow: 'hidden',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-around',
              }
            ]}
          >
            {Platform.OS !== 'web' && (
              <BlurView intensity={75} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            )}
            <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />

            {/* SLIDING ACTIVE INDICATOR */}
            <Animated.View
              style={[
                styles.slidingIndicator,
                {
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(99, 102, 241, 0.3)',
                  backgroundColor: 'transparent',
                },
                animatedStyle,
              ]}
            >
              <LinearGradient colors={indicatorGradientColors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
            </Animated.View>

            {buttons.map((btn: any) => {
              const isSelected = btn.isFocused;
              return (
                <Pressable
                  key={btn.name}
                  onPress={btn.onPress}
                  style={styles.tabButton}
                  android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: true }}
                >
                  <View style={styles.tabIconWrapper}>
                    <Ionicons name={btn.iconName as any} size={22} color={isSelected ? c.primary : c.textSecondary} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* PLUS BUTTON */}
        {showPlusButton && (
          <Animated.View
            style={{ flexDirection: 'row', alignItems: 'center', height: 56 }}
            entering={FadeInRight.duration(150)}
            exiting={FadeOutRight.duration(150)}
            layout={LinearTransition.duration(200)}
          >
            <View style={{ width: gap }} />
            <Pressable
              onPress={handlePlusPress}
              style={[
                styles.plusButtonOuter,
                {
                  borderColor: glassBorderColor,
                  borderWidth: 1.5,
                  backgroundColor: glassBgColor,
                }
              ]}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: true }}
            >
              {Platform.OS !== 'web' && (
                <BlurView intensity={75} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              )}
              <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
              <Ionicons name="add" size={24} color={c.primary} />
            </Pressable>
          </Animated.View>
        )}
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

export default function TabLayout() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: Platform.OS === 'ios' ? 'slide_from_right' : 'slide_from_right',
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
    zIndex: 2,
  },
  tabIconWrapper: {
    width: 53,
    height: 53,
    borderRadius: 26.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slidingIndicator: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -26.5,
    width: 53,
    height: 53,
    borderRadius: 26.5,
    borderWidth: 1.2,
    overflow: 'hidden',
    zIndex: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
});
