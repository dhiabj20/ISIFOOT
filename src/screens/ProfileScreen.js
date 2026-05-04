import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { supabase } from '../services/supabase';
import { signOut } from '../services/authService';
import { getUserReservations } from '../services/reservationService';
import { COLORS } from '../theme';
import { GlassBackground, ScreenHeader } from '../components';

export default function ProfileScreen({ navigation }) {
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
    if (!fullName.trim()) { Alert.alert('Erreur', 'Le nom ne peut pas être vide.'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    setSaving(false);
    if (error) Alert.alert('Erreur', error.message);
    else {
      setEditMode(false);
      loadProfile();
    }
  };

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui', style: 'destructive', onPress: signOut },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={COLORS.green} size="large" />
      </View>
    );
  }

  const initial = (profile?.full_name || 'U')[0].toUpperCase();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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
            { label: 'Réservations', value: stats.total, color: COLORS.green },
            { label: 'Confirmées', value: stats.confirmed, color: COLORS.green },
            { label: 'Annulées', value: stats.cancelled, color: COLORS.red },
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
                  placeholderTextColor={COLORS.placeholder}
                />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Téléphone</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor={COLORS.placeholder}
                  placeholder="ex: +216 XX XXX XXX"
                />
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.savingButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color={COLORS.green} /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {[
                { icon: 'Nom', value: profile?.full_name },
                { icon: 'Utilisateur', value: '@' + profile?.username },
                { icon: 'Téléphone', value: profile?.phone || '—' },
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

        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  savingButton: { opacity: 0.5 },
  bottomSpacer: { height: 40 },
  scroll: { paddingHorizontal: 20 },

  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.greenDim,
    borderWidth: 1.5, borderColor: COLORS.greenBorderActive,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '900', color: COLORS.green },
  profileName: { fontSize: 22, fontWeight: '900', color: COLORS.white },
  profileUsername: { color: COLORS.textSecondary, fontSize: 14, marginTop: 4 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    overflow: 'hidden',
    marginBottom: 16,
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },

  glassCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    padding: 20,
    marginBottom: 16,
  },
  infoTitle: { color: COLORS.white, fontWeight: '800', fontSize: 16, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  infoContent: { flex: 1 },
  infoLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  infoValue: { color: COLORS.white, fontSize: 14, fontWeight: '700', marginTop: 2 },

  fieldWrap: { marginBottom: 14 },
  fieldLabel: { color: COLORS.fieldLabel, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: COLORS.inputText,
  },
  saveBtn: {
    backgroundColor: COLORS.greenDimStrong,
    borderWidth: 1,
    borderColor: COLORS.green,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: COLORS.green, fontWeight: '800', fontSize: 14 },

  logoutBtn: {
    borderWidth: 1,
    borderColor: COLORS.redBorder,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.redDim,
  },
  logoutText: { color: COLORS.red, fontWeight: '800', fontSize: 15 },
});
