import { Tabs, useRouter } from 'expo-router';
import { useColorScheme, Platform, StyleSheet, View, Pressable, useWindowDimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Text } from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import Animated, { LinearTransition, FadeInRight, FadeOutRight } from 'react-native-reanimated';

// Custom Tab Bar Component to bypass React Navigation container style limits
function CustomTabBar({ state, descriptors, navigation, c, colorScheme }: any) {
  const { width } = useWindowDimensions();
  const router = useRouter();

  const currentRouteName = state.routes[state.index].name;
  const showPlusButton = currentRouteName === 'vehicles' || currentRouteName === 'employees' || currentRouteName === 'finance';

  // Set the tab bar to 70% of the screen width for a clean, narrow pill look
  const tabWidth = width * 0.70;
  const plusButtonWidth = 54;
  const gap = 10;
  
  const totalWidth = showPlusButton ? (tabWidth + gap + plusButtonWidth) : tabWidth;
  const leftOffset = (width - totalWidth) / 2;

  const shadowStyle = {
    shadowColor: '#000000',
    shadowOpacity: colorScheme === 'dark' ? 0.45 : 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 12,
  };

  const innerStyle = [
    styles.tabBarInner,
    {
      borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.45)',
      backgroundColor: Platform.OS === 'web'
        ? (colorScheme === 'dark' ? 'rgba(26, 26, 46, 0.85)' : 'rgba(255, 255, 255, 0.85)')
        : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.35)'),
    },
  ];

  const handlePlusPress = () => {
    if (currentRouteName === 'finance' || currentRouteName === 'vehicles' || currentRouteName === 'employees') {
      router.setParams({ openAdd: 'true' });
    }
  };

  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      style={[
        styles.tabBarOuter,
        shadowStyle,
        {
          width: totalWidth,
          left: leftOffset,
        },
      ]}
    >
      {/* TAB BAR PILL */}
      <View style={[innerStyle, { width: tabWidth }]}>
        {Platform.OS !== 'web' && (
          <BlurView
            intensity={Platform.OS === 'ios' ? 75 : 85}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}
        
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          // Icon mapping based on focus state
          let iconName = '';
          if (route.name === 'index') iconName = isFocused ? 'grid' : 'grid-outline';
          else if (route.name === 'vehicles') iconName = isFocused ? 'car' : 'car-outline';
          else if (route.name === 'employees') iconName = isFocused ? 'people' : 'people-outline';
          else if (route.name === 'finance') iconName = isFocused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'more') iconName = isFocused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline';

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabButton}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: true }}
            >
              <Ionicons
                name={iconName as any}
                size={20}
                color={isFocused ? c.primary : c.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? c.primary : c.textSecondary },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showPlusButton && (
        <Animated.View
          style={{ flexDirection: 'row', alignItems: 'center' }}
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
            <Ionicons name="add" size={26} color={c.primary} />
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
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
        name="finance"
        options={{
          title: 'Finans',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Diğer',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    bottom: 24,
    height: 64,
    backgroundColor: 'transparent',
    overflow: 'visible',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    height: '100%',
  },
  plusButtonOuter: {
    width: 54,
    height: 54,
    borderRadius: 27,
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
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
});
