import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { supabase } from '../services/supabase';
import { signOut } from '../services/authService';
import { getUserReservations } from '../services/reservationService';
import { useTheme } from '../context/ThemeContext';
import { useTopMessage } from '../context/TopMessageContext';
import { THEME_MODES } from '../theme';
import { GlassBackground, ScreenHeader } from '../components';

export default function ProfileScreen({ navigation }) {
  const { colors, isDark, mode, setThemeMode } = useTheme();
  const { showError, showSuccess } = useTopMessage();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [stats, setStats] = useState({ total: 0, confirmed: 0, cancelled: 0 });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
      }
      const { data: reservations } = await getUserReservations(user.id);
      if (reservations) {
        setStats({
          total: reservations.length,
          confirmed: reservations.filter((r) => r.status === 'confirmed').length,
          cancelled: reservations.filter((r) => r.status === 'cancelled').length,
        });
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      showError({ title: 'Erreur', message: 'Le nom ne peut pas etre vide.' });
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    setSaving(false);

    if (error) {
      showError({ title: 'Erreur', message: error.message });
    } else {
      setEditMode(false);
      showSuccess({ title: 'Succes', message: 'Profil mis a jour.' });
      loadProfile();
    }
  };

  const handleSignOut = () => {
    Alert.alert('Deconnexion', 'Voulez-vous vraiment vous deconnecter ?', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui', style: 'destructive', onPress: signOut },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  const initial = (profile?.full_name || 'U')[0].toUpperCase();

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <GlassBackground />
      <ScreenHeader
        title="Mon Profil"
        showBack={false}
        rightAction={() => setEditMode(!editMode)}
        rightText={editMode ? 'Annuler' : 'Modifier'}
        navigation={navigation}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          {!editMode && (
            <>
              <Text style={styles.profileName}>{profile?.full_name}</Text>
              <Text style={styles.profileUsername}>@{profile?.username}</Text>
            </>
          )}
        </View>

        <View style={styles.statsRow}>
          {[
            { label: 'Reservations', value: stats.total, color: colors.green },
            { label: 'Confirmees', value: stats.confirmed, color: colors.green },
            { label: 'Annulees', value: stats.cancelled, color: colors.red },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.glassCard}>
          <Text style={styles.infoTitle}>Informations</Text>

          {editMode ? (
            <>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Nom complet</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholderTextColor={colors.placeholder}
                />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Telephone</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.placeholder}
                  placeholder="ex: +216 XX XXX XXX"
                />
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.savingButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color={colors.green} /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {[
                { icon: 'Nom', value: profile?.full_name },
                { icon: 'Utilisateur', value: `@${profile?.username}` },
                { icon: 'Telephone', value: profile?.phone || '-' },
              ].map((item) => (
                <View key={item.icon} style={styles.infoRow}>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{item.icon}</Text>
                    <Text style={styles.infoValue}>{item.value}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

        <View style={styles.glassCard}>
          <Text style={styles.infoTitle}>Theme</Text>
          <View style={styles.themeRow}>
            <TouchableOpacity
              style={[styles.themeBtn, mode === THEME_MODES.dark && styles.themeBtnActive]}
              onPress={() => setThemeMode(THEME_MODES.dark)}
            >
              <Text style={[styles.themeBtnText, mode === THEME_MODES.dark && styles.themeBtnTextActive]}>Sombre</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeBtn, mode === THEME_MODES.light && styles.themeBtnActive]}
              onPress={() => setThemeMode(THEME_MODES.light)}
            >
              <Text style={[styles.themeBtnText, mode === THEME_MODES.light && styles.themeBtnTextActive]}>Clair</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <Text style={styles.logoutText}>Se deconnecter</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    savingButton: { opacity: 0.5 },
    bottomSpacer: { height: 120 },
    scroll: { paddingHorizontal: 20 },

    avatarSection: { alignItems: 'center', paddingVertical: 24 },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.greenDim,
      borderWidth: 1.5,
      borderColor: colors.greenBorderActive,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    avatarText: { fontSize: 32, fontWeight: '900', color: colors.green },
    profileName: { fontSize: 22, fontWeight: '900', color: colors.white },
    profileUsername: { color: colors.textSecondary, fontSize: 14, marginTop: 4, letterSpacing: 0.2 },

    statsRow: {
      flexDirection: 'row',
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.greenBorder,
      overflow: 'hidden',
      marginBottom: 16,
    },
    statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
    statValue: { fontSize: 24, fontWeight: '900' },
    statLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 4, letterSpacing: 0.2 },

    glassCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.greenBorder,
      padding: 20,
      marginBottom: 16,
    },
    infoTitle: { color: colors.white, fontWeight: '800', fontSize: 17, marginBottom: 16, letterSpacing: 0.2 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    infoContent: { flex: 1 },
    infoLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
    infoValue: { color: colors.white, fontSize: 14, fontWeight: '700', marginTop: 2 },

    fieldWrap: { marginBottom: 14 },
    fieldLabel: { color: colors.fieldLabel, fontSize: 13, fontWeight: '700', marginBottom: 8 },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.greenBorder,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 13,
      fontSize: 14,
      color: colors.inputText,
    },
    saveBtn: {
      backgroundColor: colors.greenDimStrong,
      borderWidth: 1,
      borderColor: colors.green,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    saveBtnText: { color: colors.green, fontWeight: '800', fontSize: 14 },

    themeRow: { flexDirection: 'row', gap: 10 },
    themeBtn: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.greenBorder,
      backgroundColor: colors.inputBg,
      alignItems: 'center',
    },
    themeBtnActive: {
      borderColor: colors.green,
      backgroundColor: colors.greenDimStrong,
    },
    themeBtnText: {
      color: colors.fieldLabel,
      fontWeight: '700',
      fontSize: 13,
    },
    themeBtnTextActive: {
      color: colors.green,
      fontWeight: '800',
    },

    logoutBtn: {
      borderWidth: 1,
      borderColor: colors.redBorder,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.redDim,
    },
    logoutText: { color: colors.red, fontWeight: '800', fontSize: 15 },
  });
}

