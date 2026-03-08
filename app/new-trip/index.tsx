import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { createTrip } from '../../services/api';
import type { CreateTripInput, GroupType, TripGoal, Pace } from '../../types/api';
import { colors, typography, spacing, borderRadius, componentStyles, shadows } from '../../theme';

type DateMode = 'exact' | 'duration';

export default function NewTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form data
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [dateMode, setDateMode] = useState<DateMode>('exact');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [numberOfDays, setNumberOfDays] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState('');
  const [groupTypes, setGroupTypes] = useState<GroupType[]>([]);
  const [tripGoals, setTripGoals] = useState<TripGoal[]>([]);
  const [tripGoalOther, setTripGoalOther] = useState('');

  const totalSteps = 5;

  const clearError = (field: string) => {
    if (errors[field]) setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleClose = () => {
    Alert.alert(
      'Quitter la création',
      'Voulez-vous vraiment quitter ? Les données saisies seront perdues.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!name.trim()) newErrors.name = 'Nom du voyage requis';
      if (!destination.trim()) newErrors.destination = 'Destination requise';
    } else if (currentStep === 2) {
      if (dateMode === 'exact' && (!startDate || !endDate)) {
        if (!startDate) newErrors.startDate = 'Date de début requise';
        if (!endDate) newErrors.endDate = 'Date de fin requise';
      } else if (dateMode === 'duration' && !numberOfDays) {
        newErrors.numberOfDays = 'Nombre de jours requis';
      }
    } else if (currentStep === 3) {
      if (!numberOfPeople) newErrors.numberOfPeople = 'Nombre de personnes requis';
      if (groupTypes.length === 0) newErrors.groupTypes = 'Sélectionnez au moins un type';
    } else if (currentStep === 4) {
      if (tripGoals.length === 0) newErrors.tripGoals = 'Sélectionnez au moins un objectif';
      if (tripGoals.includes('autre') && !tripGoalOther.trim()) newErrors.tripGoalOther = 'Précisez l\'objectif';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setErrors({});
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleGroupType = (type: GroupType) => {
    setGroupTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
    clearError('groupTypes');
  };

  const toggleTripGoal = (goal: TripGoal) => {
    setTripGoals(prev =>
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
    clearError('tripGoals');
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const tripData: CreateTripInput = {
        name: name.trim(),
        destination: destination.trim(),
        ...(dateMode === 'exact' && startDate && endDate
          ? {
              startDate: startDate.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0],
            }
          : {}),
        ...(dateMode === 'duration' && numberOfDays
          ? { numberOfDays: parseInt(numberOfDays) }
          : {}),
        numberOfPeople: numberOfPeople ? parseInt(numberOfPeople) : undefined,
        groupType: groupTypes.length > 0 ? groupTypes : undefined,
        tripGoal: tripGoals.length > 0
          ? tripGoals.map(g => g === 'autre' ? tripGoalOther : g) as TripGoal[]
          : undefined,
      };

      await createTrip(tripData);
      Alert.alert('Succès', 'Voyage créé avec succès !', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create trip';
      Alert.alert('Erreur', `Erreur lors de la création du voyage:\n\n${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={styles.stepRow}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View key={i} style={styles.stepDotContainer}>
            <View
              style={[
                styles.stepDot,
                i + 1 <= currentStep && styles.stepDotActive,
                i + 1 < currentStep && styles.stepDotCompleted,
              ]}
            >
              {i + 1 < currentStep ? (
                <Ionicons name="checkmark" size={12} color={colors.textInverse} />
              ) : (
                <Text style={[styles.stepDotText, i + 1 <= currentStep && styles.stepDotTextActive]}>
                  {i + 1}
                </Text>
              )}
            </View>
            {i < totalSteps - 1 && (
              <View style={[styles.stepLine, i + 1 < currentStep && styles.stepLineActive]} />
            )}
          </View>
        ))}
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>📝 Informations générales</Text>

      <Text style={styles.label}>Nom du voyage *</Text>
      <TextInput
        style={[styles.input, errors.name && styles.inputError]}
        value={name}
        onChangeText={(text) => { setName(text); clearError('name'); }}
        placeholder="Ex: Italie – été 2026"
        placeholderTextColor={colors.textTertiary}
      />
      {errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}

      <Text style={styles.label}>Destination *</Text>
      <GooglePlacesAutocomplete
        placeholder="Rechercher une ville..."
        onPress={(data) => {
          setDestination(data.description);
          clearError('destination');
        }}
        query={{
          key: 'YOUR_GOOGLE_PLACES_API_KEY',
          language: 'fr',
          types: '(cities)',
        }}
        fetchDetails={false}
        styles={{
          textInputContainer: styles.autocompleteContainer,
          textInput: [styles.input, errors.destination && styles.inputError],
          listView: styles.autocompleteList,
          row: styles.autocompleteRow,
          description: styles.autocompleteDescription,
        }}
        textInputProps={{
          value: destination,
          onChangeText: (text: string) => { setDestination(text); clearError('destination'); },
          placeholderTextColor: colors.textTertiary,
        }}
        enablePoweredByContainer={false}
        debounce={300}
      />
      {errors.destination && <Text style={styles.fieldError}>{errors.destination}</Text>}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>📅 Dates du voyage</Text>

      <View style={styles.radioGroup}>
        <TouchableOpacity
          style={[styles.radioButton, dateMode === 'exact' && styles.radioButtonActive]}
          onPress={() => setDateMode('exact')}
        >
          <View style={[styles.radio, dateMode === 'exact' && styles.radioActive]}>
            {dateMode === 'exact' && <View style={styles.radioSelected} />}
          </View>
          <Text style={[styles.radioLabel, dateMode === 'exact' && styles.radioLabelActive]}>
            Dates exactes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.radioButton, dateMode === 'duration' && styles.radioButtonActive]}
          onPress={() => setDateMode('duration')}
        >
          <View style={[styles.radio, dateMode === 'duration' && styles.radioActive]}>
            {dateMode === 'duration' && <View style={styles.radioSelected} />}
          </View>
          <Text style={[styles.radioLabel, dateMode === 'duration' && styles.radioLabelActive]}>
            Nombre de jours
          </Text>
        </TouchableOpacity>
      </View>

      {dateMode === 'exact' ? (
        <>
          <Text style={styles.label}>Date de début *</Text>
          <TouchableOpacity
            style={[styles.dateButton, errors.startDate && styles.inputError]}
            onPress={() => setShowStartPicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.textTertiary} />
            <Text style={startDate ? styles.dateButtonText : styles.dateButtonPlaceholder}>
              {startDate ? formatDate(startDate) : 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
          {errors.startDate && <Text style={styles.fieldError}>{errors.startDate}</Text>}
          {showStartPicker && (
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowStartPicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setStartDate(selectedDate);
                  clearError('startDate');
                }
              }}
            />
          )}

          <Text style={styles.label}>Date de fin *</Text>
          <TouchableOpacity
            style={[styles.dateButton, errors.endDate && styles.inputError]}
            onPress={() => setShowEndPicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.textTertiary} />
            <Text style={endDate ? styles.dateButtonText : styles.dateButtonPlaceholder}>
              {endDate ? formatDate(endDate) : 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
          {errors.endDate && <Text style={styles.fieldError}>{errors.endDate}</Text>}
          {showEndPicker && (
            <DateTimePicker
              value={endDate || startDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={startDate || undefined}
              onChange={(event, selectedDate) => {
                setShowEndPicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setEndDate(selectedDate);
                  clearError('endDate');
                }
              }}
            />
          )}
        </>
      ) : (
        <>
          <Text style={styles.label}>Nombre de jours *</Text>
          <TextInput
            style={[styles.input, errors.numberOfDays && styles.inputError]}
            value={numberOfDays}
            onChangeText={(text) => { setNumberOfDays(text); clearError('numberOfDays'); }}
            placeholder="Ex: 7"
            keyboardType="numeric"
            placeholderTextColor={colors.textTertiary}
          />
          {errors.numberOfDays && <Text style={styles.fieldError}>{errors.numberOfDays}</Text>}
        </>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>👥 Participants</Text>

      <Text style={styles.label}>Nombre de personnes *</Text>
      <TextInput
        style={[styles.input, errors.numberOfPeople && styles.inputError]}
        value={numberOfPeople}
        onChangeText={(text) => { setNumberOfPeople(text); clearError('numberOfPeople'); }}
        placeholder="Ex: 2"
        keyboardType="numeric"
        placeholderTextColor={colors.textTertiary}
      />
      {errors.numberOfPeople && <Text style={styles.fieldError}>{errors.numberOfPeople}</Text>}

      <Text style={styles.label}>Type de groupe *</Text>
      <Text style={styles.hint}>Sélection multiple possible</Text>
      <View style={styles.optionGroup}>
        {[
          { value: 'solo', label: '🧍 Solo' },
          { value: 'couple', label: '💑 Couple' },
          { value: 'famille', label: '👨‍👩‍👧 Famille' },
          { value: 'amis', label: '👥 Amis' },
          { value: 'autre', label: '➕ Autre' },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              groupTypes.includes(option.value as GroupType) && styles.optionButtonSelected,
            ]}
            onPress={() => toggleGroupType(option.value as GroupType)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.optionButtonText,
                groupTypes.includes(option.value as GroupType) && styles.optionButtonTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.groupTypes && <Text style={styles.fieldError}>{errors.groupTypes}</Text>}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>🎯 Objectifs du voyage</Text>
      <Text style={styles.hint}>Sélectionnez un ou plusieurs objectifs</Text>

      <View style={styles.optionGroup}>
        {[
          { value: 'detente', label: '🏖️ Détente / repos' },
          { value: 'tourisme', label: '🗺️ Tourisme / découverte' },
          { value: 'sport', label: '⚽ Voyage sportif' },
          { value: 'gastronomie', label: '🍽️ Voyage gastronomique' },
          { value: 'culturel', label: '🎭 Voyage culturel' },
          { value: 'affaires', label: '💼 Voyage d\'affaires' },
          { value: 'autre', label: '➕ Autre' },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              tripGoals.includes(option.value as TripGoal) && styles.optionButtonSelected,
            ]}
            onPress={() => toggleTripGoal(option.value as TripGoal)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.optionButtonText,
                tripGoals.includes(option.value as TripGoal) && styles.optionButtonTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.tripGoals && <Text style={styles.fieldError}>{errors.tripGoals}</Text>}

      {tripGoals.includes('autre') && (
        <>
          <Text style={styles.label}>Précisez *</Text>
          <TextInput
            style={[styles.input, errors.tripGoalOther && styles.inputError]}
            value={tripGoalOther}
            onChangeText={(text) => { setTripGoalOther(text); clearError('tripGoalOther'); }}
            placeholder="Décrivez l'objectif de votre voyage"
            placeholderTextColor={colors.textTertiary}
          />
          {errors.tripGoalOther && <Text style={styles.fieldError}>{errors.tripGoalOther}</Text>}
        </>
      )}
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>✅ Récapitulatif</Text>

      <View style={styles.summary}>
        <SummaryItem icon="text-outline" label="Nom" value={name} />
        <SummaryItem icon="location-outline" label="Destination" value={destination} />
        {dateMode === 'exact' && startDate && endDate && (
          <SummaryItem icon="calendar-outline" label="Dates" value={`${formatDate(startDate)} → ${formatDate(endDate)}`} />
        )}
        {dateMode === 'duration' && numberOfDays && (
          <SummaryItem icon="time-outline" label="Durée" value={`${numberOfDays} jours`} />
        )}
        <SummaryItem icon="people-outline" label="Participants" value={`${numberOfPeople} personne(s)`} />
        <SummaryItem icon="grid-outline" label="Groupe" value={groupTypes.join(', ')} />
        <SummaryItem
          icon="flag-outline"
          label="Objectifs"
          value={tripGoals.map(g => g === 'autre' ? tripGoalOther : g).join(', ')}
        />
      </View>

      <TouchableOpacity
        style={styles.modifyButton}
        onPress={() => setCurrentStep(1)}
      >
        <Ionicons name="create-outline" size={18} color={colors.primary} />
        <Text style={styles.modifyButtonText}>Modifier</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nouveau voyage</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {renderStepIndicator()}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </ScrollView>

      <View style={[styles.navigation, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonSecondary]}
            onPress={handlePrevious}
          >
            <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
            <Text style={styles.navButtonTextSecondary}>Précédent</Text>
          </TouchableOpacity>
        )}

        {currentStep < totalSteps ? (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary]}
            onPress={handleNext}
          >
            <Text style={styles.navButtonText}>Suivant</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <>
                <Ionicons name="airplane" size={18} color={colors.textInverse} />
                <Text style={styles.navButtonText}>Créer le voyage</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const SummaryItem = ({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) => (
  <View style={summaryStyles.item}>
    <View style={summaryStyles.iconContainer}>
      <Ionicons name={icon} size={16} color={colors.primary} />
    </View>
    <View style={summaryStyles.textContainer}>
      <Text style={summaryStyles.label}>{label}</Text>
      <Text style={summaryStyles.value}>{value}</Text>
    </View>
  </View>
);

const summaryStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  value: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Step indicator
  stepIndicator: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepDotCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepDotText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  stepDotTextActive: {
    color: colors.textInverse,
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 2,
  },
  stepLineActive: {
    backgroundColor: colors.success,
  },

  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 0,
  },
  stepContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxxl,
  },
  stepTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xxl,
  },

  // Form
  label: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  input: {
    ...componentStyles.input,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  fieldError: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },

  // Autocomplete
  autocompleteContainer: {
    width: '100%',
  },
  autocompleteList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  autocompleteRow: {
    padding: spacing.md,
  },
  autocompleteDescription: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },

  // Date
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  dateButtonText: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  dateButtonPlaceholder: {
    ...typography.bodyLarge,
    color: colors.textTertiary,
  },

  // Radio
  radioGroup: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  radioButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  radioButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: colors.primary,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  radioLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Options (group type, goals)
  optionGroup: {
    gap: spacing.sm,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  optionButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionButtonText: {
    ...typography.bodyMedium,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  optionButtonTextSelected: {
    color: colors.textInverse,
    fontWeight: '600',
  },

  // Summary
  summary: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  modifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  modifyButtonText: {
    ...typography.labelMedium,
    color: colors.primary,
  },

  // Navigation
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  navButtonPrimary: {
    backgroundColor: colors.primary,
  },
  navButtonSecondary: {
    backgroundColor: colors.surfaceSecondary,
  },
  navButtonText: {
    ...typography.labelMedium,
    color: colors.textInverse,
  },
  navButtonTextSecondary: {
    ...typography.labelMedium,
    color: colors.textPrimary,
  },
});
