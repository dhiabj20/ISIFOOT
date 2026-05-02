// src/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { supabase } from '../services/supabase';
import { signOut } from '../services/authService';
import { getUserReservations } from '../services/reservationService';

const DARK = '#06120C';
const CARD = '#10231A';
const BLUE = '#2BE67B';
const GREEN = '#2BE67B';
const PURPLE = '#94D9A8';
const BORDER = '#1A3628';

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
    if (error) {Alert.alert('Erreur', error.message);}
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
      <View style={[styles.root, styles.loadingContainer]}>
        <ActivityIndicator color={BLUE} size="large" />
      </View>
    );
  }

  const initial = (profile?.full_name || 'U')[0].toUpperCase();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={DARK} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mon Profil</Text>
        <TouchableOpacity onPress={() => setEditMode(!editMode)}>
          <Text style={styles.editBtn}>{editMode ? 'Annuler' : '✏️ Modifier'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          {!editMode ? (
            <>
              <Text style={styles.profileName}>{profile?.full_name}</Text>
              <Text style={styles.profileUsername}>@{profile?.username}</Text>
            </>
          ) : null}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Réservations', value: stats.total, color: BLUE },
            { label: 'Confirmées', value: stats.confirmed, color: GREEN },
            { label: 'Annulées', value: stats.cancelled, color: '#FF4D4D' },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Info / Edit */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Informations</Text>

          {editMode ? (
            <>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>👤 Nom complet</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholderTextColor="#6B7B8D"
                />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>📞 Téléphone</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor="#6B7B8D"
                  placeholder="ex: +216 XX XXX XXX"
                />
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.savingButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Enregistrer les modifications ✅</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {[
                { icon: '👤', label: 'Nom', value: profile?.full_name },
                { icon: '🏷️', label: 'Nom d\'utilisateur', value: '@' + profile?.username },
                { icon: '📧', label: 'Email', value: profile?.id ? '(voir compte)' : '—' },
                { icon: '🎓', label: 'N° Étudiant', value: profile?.student_id || '—' },
                { icon: '📞', label: 'Téléphone', value: profile?.phone || '—' },
              ].map((item) => (
                <View key={item.label} style={styles.infoRow}>
                  <Text style={styles.infoIcon}>{item.icon}</Text>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{item.label}</Text>
                    <Text style={styles.infoValue}>{item.value}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <Text style={styles.logoutText}>⏏ Se déconnecter</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  loadingContainer: { alignItems: 'center', justifyContent: 'center' },
  savingButton: { opacity: 0.6 },
  bottomSpacer: { height: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  backText: { color: BLUE, fontWeight: '700', fontSize: 14 },
  title: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  editBtn: { color: PURPLE, fontWeight: '700', fontSize: 13 },

  scroll: { paddingHorizontal: 20 },

  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: BLUE + '33', borderWidth: 3, borderColor: BLUE,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '900', color: BLUE },
  profileName: { fontSize: 22, fontWeight: '900', color: '#FFF' },
  profileUsername: { color: '#5A7A9A', fontSize: 14, marginTop: 4 },

  statsRow: {
    flexDirection: 'row', backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 16,
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { color: '#5A7A9A', fontSize: 11, marginTop: 4 },

  infoCard: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 20, marginBottom: 16,
  },
  infoTitle: { color: '#FFF', fontWeight: '800', fontSize: 16, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  infoIcon: { fontSize: 18, marginRight: 12 },
  infoContent: {},
  infoLabel: { color: '#5A7A9A', fontSize: 11, fontWeight: '600' },
  infoValue: { color: '#FFF', fontSize: 14, fontWeight: '700', marginTop: 2 },

  fieldWrap: { marginBottom: 14 },
  fieldLabel: { color: '#8AACCC', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: {
    backgroundColor: '#0A1628', borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, color: '#E8F0FE',
  },
  saveBtn: {
    backgroundColor: GREEN, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  logoutBtn: {
    borderWidth: 1, borderColor: '#FF4D4D', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  logoutText: { color: '#FF4D4D', fontWeight: '800', fontSize: 15 },
});
