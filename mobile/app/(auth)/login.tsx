import { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
  Pressable,
} from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import MovingBackground from '../../components/ui/MovingBackground';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';

export default function LoginScreen() {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = Colors[colorScheme];
  const { login, apiUrl, updateApiUrl } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Kullanıcı adı ve şifre gerekli');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await login({ username: username.trim(), password });
      if (!result.success) {
        setError(result.error || 'Giriş başarısız');
      }
    } catch (e: any) {
      setError('Sunucuya bağlanılamadı. API adresini kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiUrl = async () => {
    let url = tempApiUrl.trim();
    if (url.endsWith('/')) url = url.slice(0, -1);
    if (!url.startsWith('http')) url = `http://${url}`;
    await updateApiUrl(url);
    setShowSettings(false);
  };

  return (
    <View style={styles.container}>
      <MovingBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInUp.delay(100).duration(600)} style={styles.headerSection}>
            <View style={[styles.logoContainer, { backgroundColor: c.primaryContainer + '30', borderColor: c.primary + '30', borderWidth: 1 }]}>
              <Ionicons name="car-sport" size={48} color={c.primary} />
            </View>
            <Text style={[styles.title, { color: c.text }]}>Kontrol</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              Filo Yönetim Sistemi
            </Text>
          </Animated.View>

          {/* Login Form wrapped in GlassCard */}
          <Animated.View entering={FadeInDown.delay(300).duration(600)}>
            <GlassCard style={styles.formCard}>
              <Text style={[styles.formTitle, { color: c.text }]}>Giriş Yap</Text>

              <GlassInput
                label="Kullanıcı Adı veya E-posta"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Kullanıcı adı"
              />

              <View style={styles.passwordWrapper}>
                <GlassInput
                  label="Şifre"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Şifre"
                  onSubmitEditing={handleLogin}
                />
                <IconButton
                  icon={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  iconColor={c.textSecondary}
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                />
              </View>

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: c.errorContainer + '40', borderColor: c.error + '30', borderWidth: 1 }]}>
                  <Ionicons name="alert-circle" size={16} color={c.error} />
                  <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
                </View>
              ) : null}

              <GlassButton
                title={loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                variant="primary"
                style={styles.loginButton}
              />
            </GlassCard>
          </Animated.View>

          {/* Server Settings */}
          <Animated.View entering={FadeInDown.delay(500).duration(600)}>
            <Pressable
              onPress={() => setShowSettings(!showSettings)}
              style={styles.settingsToggle}
            >
              <Ionicons name="settings-outline" size={16} color={c.textSecondary} />
              <Text style={[styles.settingsToggleText, { color: c.textSecondary }]}>
                Sunucu Ayarları
              </Text>
              <Ionicons
                name={showSettings ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={c.textSecondary}
              />
            </Pressable>

            {showSettings && (
              <GlassCard style={styles.settingsCard}>
                <Text style={[styles.settingsLabel, { color: c.textSecondary }]}>
                  Bilgisayar IP Adresi (Electron çalışırken)
                </Text>
                <GlassInput
                  value={tempApiUrl}
                  onChangeText={setTempApiUrl}
                  placeholder="http://192.168.1.100:9999"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <GlassButton
                  title="Kaydet"
                  onPress={handleSaveApiUrl}
                  variant="glass"
                  style={styles.saveButton}
                />
              </GlassCard>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  formCard: {
    padding: 24,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  passwordWrapper: {
    position: 'relative',
    width: '100%',
  },
  eyeIcon: {
    position: 'absolute',
    right: 4,
    top: 30,
    zIndex: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  loginButton: {
    marginTop: 10,
  },
  settingsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  settingsToggleText: {
    fontSize: 13,
  },
  settingsCard: {
    padding: 20,
    marginBottom: 20,
  },
  settingsLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 4,
  },
});
