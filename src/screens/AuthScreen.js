// src/screens/AuthScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Animated,
  ActivityIndicator, Alert, Dimensions, StatusBar,
} from 'react-native';
import { signIn, signUp } from '../services/authService';

const { width, height } = Dimensions.get('window');

// ── Validation helpers ────────────────────────────────────────
const validators = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Email invalide',
  password: (v) => v.length >= 6 ? null : 'Minimum 6 caractères',
  fullName: (v) => v.trim().length >= 2 ? null : 'Nom requis (min 2 caractères)',
  username: (v) => /^[a-zA-Z0-9_]{3,20}$/.test(v) ? null : '3-20 caractères alphanumériques',
  confirmPassword: (v, password) => v === password ? null : 'Les mots de passe ne correspondent pas',
};

// ── Field Component ───────────────────────────────────────────
const Field = ({ label, icon, error, ...props }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{icon} {label}</Text>
    <TextInput
      style={[styles.input, error ? styles.inputError : null]}
      placeholderTextColor="#6B7B8D"
      {...props}
    />
    {error ? <Text style={styles.fieldError}>{error}</Text> : null}
  </View>
);

export default function AuthScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState({});

  // Register fields
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regErrors, setRegErrors] = useState({});

  const switchMode = (newMode) => {
    Animated.spring(slideAnim, {
      toValue: newMode === 'login' ? 0 : 1,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
    setMode(newMode);
    setLoginErrors({});
    setRegErrors({});
  };

  // ── Login submit ────────────────────────────────────────────
  const handleLogin = async () => {
    const errors = {};
    const emailErr = validators.email(loginEmail);
    const passErr = validators.password(loginPassword);
    if (emailErr) {errors.email = emailErr;}
    if (passErr) {errors.password = passErr;}

    if (Object.keys(errors).length > 0) {
      setLoginErrors(errors);
      return;
    }
    setLoginErrors({});
    setLoading(true);

    const { error } = await signIn({ email: loginEmail, password: loginPassword });
    setLoading(false);

    if (error) {
      Alert.alert('Erreur de connexion', error.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect.' : error.message);
    }
    // Navigation handled by App.js via auth state listener
  };

  // ── Register submit ─────────────────────────────────────────
  const handleRegister = async () => {
    const errors = {};
    const nameErr = validators.fullName(regFullName);
    const userErr = validators.username(regUsername);
    const emailErr = validators.email(regEmail);
    const passErr = validators.password(regPassword);
    const confErr = validators.confirmPassword(regConfirm, regPassword);

    if (nameErr) {errors.fullName = nameErr;}
    if (userErr) {errors.username = userErr;}
    if (emailErr) {errors.email = emailErr;}
    if (passErr) {errors.password = passErr;}
    if (confErr) {errors.confirm = confErr;}

    if (Object.keys(errors).length > 0) {
      setRegErrors(errors);
      return;
    }
    setRegErrors({});
    setLoading(true);

    const { error } = await signUp({
      email: regEmail,
      password: regPassword,
      fullName: regFullName,
      username: regUsername,
      studentId: regStudentId,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Erreur d\'inscription', error.message);
    } else {
      Alert.alert(
        'Compte créé !',
        'Vérifiez votre email pour confirmer votre compte, puis connectez-vous.',
        [{ text: 'OK', onPress: () => switchMode('login') }]
      );
    }
  };

  const indicatorLeft = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '50%'],
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />

      {/* Background decorations */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>⚽</Text>
          </View>
          <Text style={styles.appName}>ISIFOOT</Text>
          <Text style={styles.tagline}>Terrain de l'ISIMA — Mahdia</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>

          {/* Tab Switcher */}
          <View style={styles.tabs}>
            <Animated.View style={[styles.tabIndicator, { left: indicatorLeft }]} />
            <TouchableOpacity
              style={styles.tab}
              onPress={() => switchMode('login')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                Connexion
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => switchMode('register')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
                Inscription
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── LOGIN FORM ── */}
          {mode === 'login' && (
            <View style={styles.form}>
              <Field
                label="Email"
                icon="📧"
                value={loginEmail}
                onChangeText={setLoginEmail}
                placeholder="votre@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={loginErrors.email}
              />
              <Field
                label="Mot de passe"
                icon="🔒"
                value={loginPassword}
                onChangeText={setLoginPassword}
                placeholder="••••••••"
                secureTextEntry
                error={loginErrors.password}
              />

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Se connecter →</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={() => switchMode('register')}>
                <Text style={styles.switchText}>
                  Pas encore de compte ?{' '}
                  <Text style={styles.switchLink}>S'inscrire</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── REGISTER FORM ── */}
          {mode === 'register' && (
            <View style={styles.form}>
              <Field
                label="Nom complet"
                icon="👤"
                value={regFullName}
                onChangeText={setRegFullName}
                placeholder="Prénom Nom"
                autoCapitalize="words"
                error={regErrors.fullName}
              />
              <Field
                label="Nom d'utilisateur"
                icon="🏷️"
                value={regUsername}
                onChangeText={(t) => setRegUsername(t.toLowerCase().replace(/\s/g, '_'))}
                placeholder="nom_utilisateur"
                autoCapitalize="none"
                autoCorrect={false}
                error={regErrors.username}
              />
              <Field
                label="Email"
                icon="📧"
                value={regEmail}
                onChangeText={setRegEmail}
                placeholder="votre@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={regErrors.email}
              />
              <Field
                label="N° Étudiant (optionnel)"
                icon="🎓"
                value={regStudentId}
                onChangeText={setRegStudentId}
                placeholder="ex: 2024ISIMA001"
                autoCapitalize="characters"
              />
              <Field
                label="Mot de passe"
                icon="🔒"
                value={regPassword}
                onChangeText={setRegPassword}
                placeholder="••••••••  (min 6 caractères)"
                secureTextEntry
                error={regErrors.password}
              />
              <Field
                label="Confirmer le mot de passe"
                icon="🔑"
                value={regConfirm}
                onChangeText={setRegConfirm}
                placeholder="••••••••"
                secureTextEntry
                error={regErrors.confirm}
              />

              <TouchableOpacity
                style={[styles.btn, styles.btnGreen, loading && styles.btnDisabled]}
                onPress={handleRegister}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Créer mon compte →</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={() => switchMode('login')}>
                <Text style={styles.switchText}>
                  Déjà un compte ?{' '}
                  <Text style={styles.switchLink}>Se connecter</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.footer}>ISIMA Mahdia © 2025</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const BLUE  = '#0066FF';
const GREEN = '#00C896';
const DARK  = '#0A1628';
const CARD  = '#111E33';
const BORDER = '#1E2D44';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },

  // Background decorations
  bgCircle1: {
    position: 'absolute', width: 300, height: 300,
    borderRadius: 150, backgroundColor: '#0066FF18',
    top: -80, right: -80,
  },
  bgCircle2: {
    position: 'absolute', width: 200, height: 200,
    borderRadius: 100, backgroundColor: '#00C89610',
    bottom: 100, left: -60,
  },
  bgCircle3: {
    position: 'absolute', width: 150, height: 150,
    borderRadius: 75, backgroundColor: '#0066FF0A',
    top: height * 0.35, left: width * 0.6,
  },

  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },

  // Header
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 32 },
  logoBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#0066FF22', borderWidth: 2,
    borderColor: '#0066FF55', alignItems: 'center',
    justifyContent: 'center', marginBottom: 14,
  },
  logoEmoji: { fontSize: 38 },
  appName: {
    fontSize: 36, fontWeight: '900', color: '#FFFFFF',
    letterSpacing: 6, fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-black',
  },
  tagline: { fontSize: 12, color: '#5A7A9A', marginTop: 6, letterSpacing: 1.5 },

  // Card
  card: {
    backgroundColor: CARD, borderRadius: 24,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4, shadowRadius: 24, elevation: 16,
  },

  // Tabs
  tabs: {
    flexDirection: 'row', position: 'relative',
    borderBottomWidth: 1, borderBottomColor: BORDER,
    height: 52,
  },
  tabIndicator: {
    position: 'absolute', bottom: 0, height: 3,
    width: '48%', backgroundColor: BLUE, borderRadius: 2,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#5A7A9A' },
  tabTextActive: { color: '#FFFFFF' },

  // Form
  form: { padding: 24, gap: 4 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#8AACCC', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#0A1628', borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#E8F0FE',
  },
  inputError: { borderColor: '#FF4D4D' },
  fieldError: { fontSize: 11, color: '#FF6B6B', marginTop: 4, marginLeft: 4 },

  // Buttons
  btn: {
    backgroundColor: BLUE, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 8, marginBottom: 16,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  btnGreen: { backgroundColor: GREEN, shadowColor: GREEN },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  switchText: { textAlign: 'center', fontSize: 13, color: '#5A7A9A' },
  switchLink: { color: BLUE, fontWeight: '700' },

  footer: { textAlign: 'center', color: '#2A3A55', fontSize: 11, marginTop: 28, letterSpacing: 1 },
});
