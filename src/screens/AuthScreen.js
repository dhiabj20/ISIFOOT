import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { resendSignupConfirmation, signIn, signUp } from '../services/authService';
import { COLORS, GLASS } from '../theme';
import { GlassBackground } from '../components';

const validators = {
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Email invalide'),
  password: (v) => (v.length >= 6 ? null : 'Minimum 6 caracteres'),
  fullName: (v) => (v.trim().length >= 2 ? null : 'Nom requis (min 2 caracteres)'),
  username: (v) => (/^[a-zA-Z0-9_]{3,20}$/.test(v) ? null : '3-20 caracteres alphanumeriques'),
  confirmPassword: (v, password) => (v === password ? null : 'Les mots de passe ne correspondent pas'),
};

function Field({ label, error, ...props }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor={COLORS.placeholder}
        {...props}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function mapSignupError(message) {
  const value = (message || '').toLowerCase();

  if (value.includes('already registered') || value.includes('already been registered')) {
    return 'Cet email existe deja. Si vous ne trouvez pas le mail, utilisez "Renvoyer l email".';
  }
  if (value.includes('database error saving new user')) {
    return 'Inscription bloquee. Le nom utilisateur est probablement deja pris. Essayez un autre username.';
  }
  if (value.includes('invalid api key') || value.includes('apikey')) {
    return 'Configuration Supabase invalide. Verifiez SUPABASE_URL et SUPABASE_ANON_KEY dans .env.';
  }

  return message || 'Erreur inscription.';
}

export default function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState({});

  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regErrors, setRegErrors] = useState({});
  const [lastSignupEmail, setLastSignupEmail] = useState('');

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

  const handleLogin = async () => {
    const errors = {};
    const emailErr = validators.email(loginEmail);
    const passErr = validators.password(loginPassword);

    if (emailErr) {
      errors.email = emailErr;
    }
    if (passErr) {
      errors.password = passErr;
    }

    if (Object.keys(errors).length > 0) {
      setLoginErrors(errors);
      return;
    }

    setLoginErrors({});
    setLoading(true);
    const { error } = await signIn({ email: loginEmail, password: loginPassword });
    setLoading(false);

    if (error) {
      const value = (error.message || '').toLowerCase();
      if (value.includes('email not confirmed')) {
        Alert.alert(
          'Email non confirme',
          'Confirmez votre email avant de vous connecter. Vous pouvez renvoyer le mail depuis cet ecran.'
        );
        return;
      }
      Alert.alert(
        'Erreur de connexion',
        error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message
      );
    }
  };

  const handleRegister = async () => {
    const errors = {};
    const nameErr = validators.fullName(regFullName);
    const userErr = validators.username(regUsername);
    const emailErr = validators.email(regEmail);
    const passErr = validators.password(regPassword);
    const confErr = validators.confirmPassword(regConfirm, regPassword);

    if (nameErr) {
      errors.fullName = nameErr;
    }
    if (userErr) {
      errors.username = userErr;
    }
    if (emailErr) {
      errors.email = emailErr;
    }
    if (passErr) {
      errors.password = passErr;
    }
    if (confErr) {
      errors.confirm = confErr;
    }

    if (Object.keys(errors).length > 0) {
      setRegErrors(errors);
      return;
    }

    setRegErrors({});
    setLoading(true);
    setLastSignupEmail(regEmail.trim().toLowerCase());

    const { error, maybeExistingUser } = await signUp({
      email: regEmail,
      password: regPassword,
      fullName: regFullName,
      username: regUsername,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Erreur inscription', mapSignupError(error.message));
      return;
    }

    const info = maybeExistingUser
      ? 'Cet email semble deja inscrit. Si vous ne recevez rien, appuyez sur "Renvoyer l email".'
      : 'Verifiez votre email pour confirmer votre compte, puis connectez-vous.';

    Alert.alert(
      'Verification email',
      info,
      [
        {
          text: 'Renvoyer l email',
          onPress: async () => {
            const targetEmail = regEmail.trim().toLowerCase();
            if (!targetEmail) {
              return;
            }
            const { error: resendError } = await resendSignupConfirmation(targetEmail);
            if (resendError) {
              Alert.alert('Echec renvoi', resendError.message);
              return;
            }
            Alert.alert('Email renvoye', `Un nouveau mail a ete envoye a ${targetEmail}.`);
          },
        },
        { text: 'OK', onPress: () => switchMode('login') },
      ]
    );
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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <GlassBackground />

      <View style={styles.gradientTop} />
      <View style={styles.gradientBottom} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Icon name="soccer" size={40} color={COLORS.green} />
          </View>
          <Text style={styles.appName}>ISIFOOT</Text>
          <Text style={styles.tagline}>Terrain ISIMA - Mahdia</Text>
        </View>

        <View style={styles.card}>
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

          {mode === 'login' ? (
            <View style={styles.form}>
              <Field
                label="Email"
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
                value={loginPassword}
                onChangeText={setLoginPassword}
                placeholder="********"
                secureTextEntry
                error={loginErrors.password}
              />

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color={COLORS.green} /> : <Text style={styles.btnText}>Se connecter</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => switchMode('register')}>
                <Text style={styles.switchText}>
                  Pas encore de compte ? <Text style={styles.switchLink}>S'inscrire</Text>
                </Text>
              </TouchableOpacity>
              {lastSignupEmail ? (
                <TouchableOpacity
                  onPress={async () => {
                    const { error } = await resendSignupConfirmation(lastSignupEmail);
                    if (error) {
                      Alert.alert('Echec renvoi', error.message);
                      return;
                    }
                    Alert.alert('Email renvoye', `Un nouveau mail a ete envoye a ${lastSignupEmail}.`);
                  }}
                >
                  <Text style={styles.switchText}>
                    Pas recu ? <Text style={styles.switchLink}>Renvoyer l email</Text>
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.form}>
              <Field
                label="Nom complet"
                value={regFullName}
                onChangeText={setRegFullName}
                placeholder="Prenom Nom"
                autoCapitalize="words"
                error={regErrors.fullName}
              />
              <Field
                label="Nom utilisateur"
                value={regUsername}
                onChangeText={(t) => setRegUsername(t.toLowerCase().replace(/\s/g, '_'))}
                placeholder="nom_utilisateur"
                autoCapitalize="none"
                autoCorrect={false}
                error={regErrors.username}
              />
              <Field
                label="Email"
                value={regEmail}
                onChangeText={setRegEmail}
                placeholder="votre@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={regErrors.email}
              />
              <Field
                label="Mot de passe"
                value={regPassword}
                onChangeText={setRegPassword}
                placeholder="******** (min 6 caracteres)"
                secureTextEntry
                error={regErrors.password}
              />
              <Field
                label="Confirmer mot de passe"
                value={regConfirm}
                onChangeText={setRegConfirm}
                placeholder="********"
                secureTextEntry
                error={regErrors.confirm}
              />

              <TouchableOpacity
                style={[styles.btn, styles.btnGreen, loading && styles.btnDisabled]}
                onPress={handleRegister}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color={COLORS.green} /> : <Text style={styles.btnText}>Creer mon compte</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => switchMode('login')}>
                <Text style={styles.switchText}>
                  Deja un compte ? <Text style={styles.switchLink}>Se connecter</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.footer}>ISIMA Mahdia 2026</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: 'rgba(43, 230, 123, 0.05)',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(43, 230, 123, 0.02)',
  },

  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },

  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 32 },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.greenDim,
    borderWidth: 1,
    borderColor: COLORS.greenBorderActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  appName: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 6,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-black',
  },
  tagline: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6, letterSpacing: 1.5 },

  card: {
    ...GLASS.panel,
    borderRadius: 24,
    overflow: 'hidden',
  },

  tabs: {
    flexDirection: 'row',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.greenBorder,
    height: 52,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '48%',
    backgroundColor: COLORS.green,
    borderRadius: 2,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white, fontWeight: '800' },

  form: { padding: 24, gap: 4 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.inputText,
  },
  inputError: { borderColor: COLORS.red },
  fieldError: { fontSize: 11, color: COLORS.red, marginTop: 4, marginLeft: 4 },

  btn: {
    backgroundColor: COLORS.greenDim,
    borderWidth: 1,
    borderColor: COLORS.green,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  btnGreen: { backgroundColor: COLORS.greenDimStrong },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: COLORS.green, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  switchText: { textAlign: 'center', fontSize: 13, color: COLORS.textSecondary },
  switchLink: { color: COLORS.green, fontWeight: '700' },

  footer: { textAlign: 'center', color: COLORS.textTertiary, fontSize: 11, marginTop: 28, letterSpacing: 1 },
});
