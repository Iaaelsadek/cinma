import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ImageBackground, Dimensions, KeyboardAvoidingView, Platform, Alert, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff } from 'lucide-react-native';
import { signIn, signUp, signInWithGoogle } from '../services/auth';
import { trackEvent } from '../services/analytics';
import { CinematicLoader } from '../components/CinematicLoader';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

// Breathing glow animation using standard Animated API
const useGlowAnimation = () => {
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  return glow;
};

const AuthScreen = () => {
  const { continueAsGuest, refreshSession } = useAuth();
  const glowAnim = useGlowAnimation();
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleContinue = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      setError('يرجى إدخال بريد إلكتروني صالح');
      return;
    }
    if (!password || password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (mode === 'sign_in') {
        await signIn(normalized, password);
        await refreshSession();
        trackEvent('auth_login', { email: normalized });
      } else {
        const response = await signUp(normalized, password);
        await refreshSession();
        trackEvent('auth_register', { email: normalized });
        if (response.needsEmailVerification) {
          setMessage('يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب، ثم تسجيل الدخول.');
        } else {
          setMessage('تم إنشاء الحساب بنجاح. جاري تسجيل الدخول...');
        }
      }
    } catch (e: any) {
      const msg = e?.message || 'فشل المصادقة';
      setError(msg);
      Alert.alert('خطأ', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      await refreshSession();
      trackEvent('auth_login_google', {});
    } catch (e: any) {
      const msg = e?.message || 'فشل تسجيل الدخول عبر Google';
      if (msg.includes('ERR_CONNECTION_REFUSED') || msg.includes('Network') || msg.includes('localhost')) {
        Alert.alert('تنبيه المطور', 'يتطلب تسجيل الدخول عبر Google تكوين الواجهة الخلفية (Supabase) وعنوان إعادة التوجيه الصحيح. لا يمكن إتمامه على المضيف المحلي (Localhost) بدون إعداد مسبق.');
      } else if (msg.includes('dismiss') || msg.includes('cancel')) {
        // Silent failure for user dismissal
        console.log('Google auth dismissed by user');
      } else {
        Alert.alert('خطأ', msg);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={{ uri: 'https://image.tmdb.org/t/p/original/p1F51Lvj3sMopG948F5HsBbl43C.jpg' }}
      style={styles.container}
      resizeMode="cover"
    >
      <LinearGradient colors={['rgba(0,0,0,0.6)', '#000000']} style={styles.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
          <View style={styles.header}>
            <Animated.Text
              style={[
                styles.brandWord,
                {
                  textShadowRadius: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 28] }),
                  opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
                },
              ]}
            >
              سينما
            </Animated.Text>
            <Animated.Text
              style={[
                styles.brandWord,
                styles.brandWordAccent,
                {
                  textShadowRadius: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 28] }),
                  opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
                },
              ]}
            >
              أونلاين
            </Animated.Text>
            <View style={styles.glowBar} />
          </View>

          <View style={styles.formContainer}>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'sign_in' && styles.modeButtonActive]}
                onPress={() => setMode('sign_in')}
              >
                <Text style={[styles.modeText, mode === 'sign_in' && styles.modeTextActive]}>تسجيل الدخول</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'sign_up' && styles.modeButtonActive]}
                onPress={() => setMode('sign_up')}
              >
                <Text style={[styles.modeText, mode === 'sign_up' && styles.modeTextActive]}>إنشاء حساب</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>{mode === 'sign_in' ? 'أهلاً بك مجدداً' : 'انضم إلى التجربة'}</Text>
            
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="البريد الإلكتروني"
              placeholderTextColor="#9ca3af"
              style={[styles.input, { textAlign: 'right' }]}
            />
            
            <View style={styles.passwordContainer}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholder="كلمة المرور"
                placeholderTextColor="#9ca3af"
                style={[styles.passwordInput, { textAlign: 'right' }]}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                {showPassword ? <EyeOff color="#9ca3af" size={20} /> : <Eye color="#9ca3af" size={20} />}
              </TouchableOpacity>
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}
            {!!message && <Text style={styles.message}>{message}</Text>}

            <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={loading} activeOpacity={0.9}>
              {loading ? <CinematicLoader /> : <Text style={styles.buttonText}>{mode === 'sign_in' ? 'دخول' : 'تسجيل'}</Text>}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>أو</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn} disabled={loading} activeOpacity={0.9}>
              <Text style={styles.googleButtonText}>تسجيل الدخول عبر Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.guestButton}
              onPress={async () => {
                await continueAsGuest();
              }}
              disabled={loading}
              activeOpacity={0.9}
            >
              <Text style={styles.guestButtonText}>الدخول كضيف</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1, justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 40, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  brandWord: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#f43f5e',
    textShadowColor: 'rgba(244,63,94,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  brandWordAccent: {
    color: '#ffd700',
    textShadowColor: 'rgba(255,215,0,0.9)',
  },
  title3DContainer: {
    height: 70,
    width: width - 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBar: {
    position: 'absolute',
    bottom: -10,
    width: 80,
    height: 3,
    backgroundColor: '#e50914',
    borderRadius: 2,
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  formContainer: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modeRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 4, marginBottom: 24 },
  modeButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  modeButtonActive: { backgroundColor: '#e50914' },
  modeText: { color: '#9ca3af', fontWeight: '700' },
  modeTextActive: { color: '#fff' },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 50,
    marginBottom: 16,
  },
  passwordInput: { flex: 1, color: '#fff', height: 50, paddingHorizontal: 16 },
  eyeIcon: { padding: 10 },
  error: { color: '#ff4d4d', marginBottom: 16, fontSize: 13, textAlign: 'center' },
  message: { color: '#4ade80', marginBottom: 16, fontSize: 13, textAlign: 'center' },
  button: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#e50914',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  dividerText: { color: '#9ca3af', paddingHorizontal: 10, fontSize: 12 },
  googleButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: { color: '#000', fontSize: 16, fontWeight: '700' },
  guestButton: {
    marginTop: 12,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  guestButtonText: {
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default AuthScreen;
