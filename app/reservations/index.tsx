import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCurrentTrip } from '../../contexts/TripContext';
import { getReservationsForTrip, createReservation, deleteReservation } from '../../services/api';
import type { Reservation, ReservationType, CreateReservationInput } from '../../types/api';
import { colors, typography, spacing, borderRadius, componentStyles } from '../../theme';

const RESERVATION_TYPES: { value: ReservationType; label: string; icon: string }[] = [
  { value: 'flight', label: 'Vol', icon: '✈️' },
  { value: 'hotel', label: 'Hôtel', icon: '🏨' },
  { value: 'car', label: 'Location auto', icon: '🚗' },
  { value: 'activity', label: 'Activité', icon: '🎯' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'transport', label: 'Transport', icon: '🚌' },
  { value: 'other', label: 'Autre', icon: '📋' },
];

function getTypeConfig(type: ReservationType) {
  return RESERVATION_TYPES.find(t => t.value === type) || RESERVATION_TYPES[6];
}

export default function ReservationsScreen() {
  const { currentTrip } = useCurrentTrip();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [newType, setNewType] = useState<ReservationType>('flight');
  const [newTitle, setNewTitle] = useState('');
  const [newConfirmation, setNewConfirmation] = useState('');
  const [newProvider, setNewProvider] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentTrip) loadReservations();
  }, [currentTrip]);

  const loadReservations = async () => {
    if (!currentTrip) return;
    try {
      setLoading(true);
      const data = await getReservationsForTrip(currentTrip.id);
      setReservations(data);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les réservations');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!currentTrip || !newTitle.trim()) return;
    try {
      setSaving(true);
      const data: CreateReservationInput = {
        type: newType,
        title: newTitle.trim(),
        confirmationNumber: newConfirmation.trim() || undefined,
        provider: newProvider.trim() || undefined,
        notes: newNotes.trim() || undefined,
      };
      await createReservation(currentTrip.id, data);
      resetForm();
      setShowAddModal(false);
      loadReservations();
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de créer la réservation');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (reservation: Reservation) => {
    Alert.alert('Supprimer', `Supprimer "${reservation.title}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await deleteReservation(reservation.id);
            loadReservations();
          } catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
        },
      },
    ]);
  };

  const resetForm = () => {
    setNewType('flight');
    setNewTitle('');
    setNewConfirmation('');
    setNewProvider('');
    setNewNotes('');
  };

  if (!currentTrip) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>Aucun voyage sélectionné</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Réservations</Text>
          <Text style={styles.headerSubtitle}>{currentTrip.destination}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : reservations.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={{ fontSize: 48 }}>📋</Text>
          <Text style={styles.emptyTitle}>Aucune réservation</Text>
          <Text style={styles.emptySubtitle}>Ajoutez vos confirmations de vol, hôtel, etc.</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add-circle-outline" size={20} color={colors.textInverse} />
            <Text style={styles.emptyButtonText}>Ajouter une réservation</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {reservations.map((res) => {
            const config = getTypeConfig(res.type);
            return (
              <View key={res.id} style={styles.resCard}>
                <View style={styles.resHeader}>
                  <Text style={styles.resIcon}>{config?.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resTitle}>{res.title}</Text>
                    <Text style={styles.resType}>{config?.label}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(res)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
                {res.confirmationNumber && (
                  <View style={styles.resDetail}>
                    <Ionicons name="document-text-outline" size={14} color={colors.textTertiary} />
                    <Text style={styles.resDetailText}>N° {res.confirmationNumber}</Text>
                  </View>
                )}
                {res.provider && (
                  <View style={styles.resDetail}>
                    <Ionicons name="business-outline" size={14} color={colors.textTertiary} />
                    <Text style={styles.resDetailText}>{res.provider}</Text>
                  </View>
                )}
                {res.notes && (
                  <View style={styles.resDetail}>
                    <Ionicons name="chatbubble-outline" size={14} color={colors.textTertiary} />
                    <Text style={styles.resDetailText}>{res.notes}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { paddingTop: insets.top + spacing.lg }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nouvelle réservation</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Type *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
              {RESERVATION_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeChip, newType === t.value && styles.typeChipActive]}
                  onPress={() => setNewType(t.value)}
                >
                  <Text style={styles.typeChipIcon}>{t.icon}</Text>
                  <Text style={[styles.typeChipText, newType === t.value && styles.typeChipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Titre *</Text>
            <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} placeholder="Ex: Vol Air France Paris → Rome" placeholderTextColor={colors.textTertiary} />

            <Text style={styles.label}>N° de confirmation</Text>
            <TextInput style={styles.input} value={newConfirmation} onChangeText={setNewConfirmation} placeholder="Ex: ABC123" placeholderTextColor={colors.textTertiary} />

            <Text style={styles.label}>Fournisseur</Text>
            <TextInput style={styles.input} value={newProvider} onChangeText={setNewProvider} placeholder="Ex: Air France" placeholderTextColor={colors.textTertiary} />

            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={newNotes} onChangeText={setNewNotes} placeholder="Détails supplémentaires..." placeholderTextColor={colors.textTertiary} multiline />

            <TouchableOpacity style={styles.submitButton} onPress={handleAdd} disabled={saving || !newTitle.trim()}>
              {saving ? <ActivityIndicator color={colors.textInverse} /> : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={colors.textInverse} />
                  <Text style={styles.submitButtonText}>Ajouter</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxxl },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.surface, gap: spacing.md },
  headerBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSubtitle: { ...typography.caption, color: colors.textSecondary },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },

  backButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  backButtonText: { ...typography.labelMedium, color: colors.textInverse },

  emptyTitle: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm, textAlign: 'center' },
  emptySubtitle: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xxl },
  emptyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md, gap: spacing.sm },
  emptyButtonText: { ...typography.labelMedium, color: colors.textInverse },

  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxxl },

  resCard: { ...componentStyles.card, padding: spacing.lg, marginBottom: spacing.md },
  resHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  resIcon: { fontSize: 28 },
  resTitle: { ...typography.h3, color: colors.textPrimary },
  resType: { ...typography.caption, color: colors.textTertiary },
  resDetail: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, paddingLeft: 44 },
  resDetailText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: colors.surface },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  modalTitle: { ...typography.h2, color: colors.textPrimary },
  modalContent: { padding: spacing.lg },

  label: { ...typography.labelMedium, color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.lg },
  input: { ...componentStyles.input },

  typeRow: { marginBottom: spacing.sm },
  typeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.pill, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm, gap: spacing.xs },
  typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  typeChipIcon: { fontSize: 18 },
  typeChipText: { ...typography.labelSmall, color: colors.textSecondary },
  typeChipTextActive: { color: colors.primary },

  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: spacing.lg, borderRadius: borderRadius.md, marginTop: spacing.xxl, gap: spacing.sm },
  submitButtonText: { ...typography.labelLarge, color: colors.textInverse },
});
