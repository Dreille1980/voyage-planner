import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createTrip } from '../../services/api';
import type { CreateTripInput, GroupType, TripGoal, Pace } from '../../types/api';

type DateMode = 'exact' | 'duration';

export default function NewTripScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form data
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [dateMode, setDateMode] = useState<DateMode>('exact');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [numberOfDays, setNumberOfDays] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState('');
  const [groupType, setGroupType] = useState<GroupType | ''>('');
  const [tripGoal, setTripGoal] = useState<TripGoal | ''>('');
  const [tripGoalOther, setTripGoalOther] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [pace, setPace] = useState<Pace | ''>('');
  const [hasChildren, setHasChildren] = useState(false);
  const [specialRequirements, setSpecialRequirements] = useState('');

  const totalSteps = 6;

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
    // Validation par étape
    if (currentStep === 1) {
      if (!name.trim() || !destination.trim()) {
        Alert.alert('Erreur', 'Veuillez remplir le nom du voyage et la destination');
        return;
      }
    } else if (currentStep === 2) {
      if (dateMode === 'exact' && (!startDate || !endDate)) {
        Alert.alert('Erreur', 'Veuillez saisir les dates de début et de fin');
        return;
      } else if (dateMode === 'duration' && !numberOfDays) {
        Alert.alert('Erreur', 'Veuillez saisir le nombre de jours');
        return;
      }
    } else if (currentStep === 3) {
      if (!numberOfPeople || !groupType) {
        Alert.alert('Erreur', 'Veuillez remplir le nombre de personnes et le type de groupe');
        return;
      }
    } else if (currentStep === 4) {
      if (!tripGoal) {
        Alert.alert('Erreur', 'Veuillez sélectionner un objectif de voyage');
        return;
      }
      if (tripGoal === 'autre' && !tripGoalOther.trim()) {
        Alert.alert('Erreur', 'Veuillez préciser l\'objectif du voyage');
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const tripData: CreateTripInput = {
        name: name.trim(),
        destination: destination.trim(),
        ...(dateMode === 'exact' && startDate && endDate
          ? { startDate, endDate }
          : {}),
        ...(dateMode === 'duration' && numberOfDays
          ? { numberOfDays: parseInt(numberOfDays) }
          : {}),
        numberOfPeople: numberOfPeople ? parseInt(numberOfPeople) : undefined,
        groupType: groupType || undefined,
        tripGoal: (tripGoal === 'autre' ? tripGoalOther : tripGoal) as TripGoal | undefined,
        budgetRange: budgetRange || undefined,
        pace: pace || undefined,
        hasChildren,
        specialRequirements: specialRequirements.trim() || undefined,
      };

      const newTrip = await createTrip(tripData);
      Alert.alert('Succès', 'Voyage créé avec succès !', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error creating trip:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create trip';
      Alert.alert('Erreur', `Erreur lors de la création du voyage:\n\n${errorMessage}\n\nVérifiez que le backend est accessible.`);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <Text style={styles.stepText}>
        Étape {currentStep} / {totalSteps}
      </Text>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${(currentStep / totalSteps) * 100}%` },
          ]}
        />
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>📝 Informations générales</Text>
      <Text style={styles.label}>Nom du voyage *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ex: Italie – été 2026"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Destination *</Text>
      <TextInput
        style={styles.input}
        value={destination}
        onChangeText={setDestination}
        placeholder="Ex: Italie"
        placeholderTextColor="#999"
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>📅 Dates du voyage</Text>

      <View style={styles.radioGroup}>
        <TouchableOpacity
          style={styles.radioButton}
          onPress={() => setDateMode('exact')}
        >
          <View style={styles.radio}>
            {dateMode === 'exact' && <View style={styles.radioSelected} />}
          </View>
          <Text style={styles.radioLabel}>Dates exactes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.radioButton}
          onPress={() => setDateMode('duration')}
        >
          <View style={styles.radio}>
            {dateMode === 'duration' && <View style={styles.radioSelected} />}
          </View>
          <Text style={styles.radioLabel}>Nombre de jours</Text>
        </TouchableOpacity>
      </View>

      {dateMode === 'exact' ? (
        <>
          <Text style={styles.label}>Date de début *</Text>
          <TextInput
            style={styles.input}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Date de fin *</Text>
          <TextInput
            style={styles.input}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#999"
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>Nombre de jours *</Text>
          <TextInput
            style={styles.input}
            value={numberOfDays}
            onChangeText={setNumberOfDays}
            placeholder="Ex: 7"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>👥 Participants</Text>

      <Text style={styles.label}>Nombre de personnes *</Text>
      <TextInput
        style={styles.input}
        value={numberOfPeople}
        onChangeText={setNumberOfPeople}
        placeholder="Ex: 2"
        keyboardType="numeric"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Type de groupe *</Text>
      <View style={styles.buttonGroup}>
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
              groupType === option.value && styles.optionButtonSelected,
            ]}
            onPress={() => setGroupType(option.value as GroupType)}
          >
            <Text
              style={[
                styles.optionButtonText,
                groupType === option.value && styles.optionButtonTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>🎯 Objectif du voyage</Text>
      <Text style={styles.subtitle}>Quel est le but principal de ce voyage ?</Text>

      <View style={styles.buttonGroup}>
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
              tripGoal === option.value && styles.optionButtonSelected,
            ]}
            onPress={() => setTripGoal(option.value as TripGoal)}
          >
            <Text
              style={[
                styles.optionButtonText,
                tripGoal === option.value && styles.optionButtonTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tripGoal === 'autre' && (
        <>
          <Text style={styles.label}>Précisez *</Text>
          <TextInput
            style={styles.input}
            value={tripGoalOther}
            onChangeText={setTripGoalOther}
            placeholder="Décrivez l'objectif de votre voyage"
            placeholderTextColor="#999"
          />
        </>
      )}
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>🏷️ Contraintes et préférences</Text>
      <Text style={styles.subtitle}>Ces informations sont optionnelles</Text>

      <Text style={styles.label}>Budget approximatif</Text>
      <TextInput
        style={styles.input}
        value={budgetRange}
        onChangeText={setBudgetRange}
        placeholder="Ex: 1000-2000€"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Rythme souhaité</Text>
      <View style={styles.buttonGroup}>
        {[
          { value: 'relax', label: '🛋️ Relax' },
          { value: 'equilibre', label: '⚖️ Équilibré' },
          { value: 'intensif', label: '🏃 Intensif' },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              pace === option.value && styles.optionButtonSelected,
            ]}
            onPress={() => setPace(option.value as Pace)}
          >
            <Text
              style={[
                styles.optionButtonText,
                pace === option.value && styles.optionButtonTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setHasChildren(!hasChildren)}
      >
        <View style={styles.checkbox}>
          {hasChildren && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>Présence d'enfants</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Restrictions particulières</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={specialRequirements}
        onChangeText={setSpecialRequirements}
        placeholder="Mobilité, alimentation, etc."
        placeholderTextColor="#999"
        multiline
        numberOfLines={4}
      />
    </View>
  );

  const renderStep6 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>✅ Récapitulatif</Text>

      <View style={styles.summary}>
        <SummaryItem label="Nom" value={name} />
        <SummaryItem label="Destination" value={destination} />
        {dateMode === 'exact' && startDate && endDate && (
          <SummaryItem label="Dates" value={`${startDate} → ${endDate}`} />
        )}
        {dateMode === 'duration' && numberOfDays && (
          <SummaryItem label="Durée" value={`${numberOfDays} jours`} />
        )}
        <SummaryItem label="Participants" value={`${numberOfPeople} personne(s)`} />
        <SummaryItem label="Type de groupe" value={groupType} />
        <SummaryItem
          label="Objectif"
          value={tripGoal === 'autre' ? tripGoalOther : tripGoal}
        />
        {budgetRange && <SummaryItem label="Budget" value={budgetRange} />}
        {pace && <SummaryItem label="Rythme" value={pace} />}
        {hasChildren && <SummaryItem label="Enfants" value="Oui" />}
        {specialRequirements && (
          <SummaryItem label="Restrictions" value={specialRequirements} />
        )}
      </View>

      <TouchableOpacity
        style={styles.modifyButton}
        onPress={() => setCurrentStep(1)}
      >
        <Text style={styles.modifyButtonText}>✏️ Modifier</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Créer un nouveau voyage</Text>
        <TouchableOpacity onPress={handleClose}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      {renderStepIndicator()}

      <ScrollView style={styles.content}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
        {currentStep === 6 && renderStep6()}
      </ScrollView>

      <View style={styles.navigation}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonSecondary]}
            onPress={handlePrevious}
          >
            <Text style={styles.navButtonTextSecondary}>← Précédent</Text>
          </TouchableOpacity>
        )}

        {currentStep < totalSteps ? (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary]}
            onPress={handleNext}
          >
            <Text style={styles.navButtonText}>Suivant →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.navButtonText}>Créer le voyage</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.summaryItem}>
    <Text style={styles.summaryLabel}>{label}:</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  stepIndicator: {
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  stepText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  radioGroup: {
    marginBottom: 16,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  radioLabel: {
    fontSize: 16,
  },
  buttonGroup: {
    marginTop: 8,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionButtonText: {
    fontSize: 16,
    textAlign: 'center',
  },
  optionButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  summary: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 120,
  },
  summaryValue: {
    fontSize: 14,
    flex: 1,
  },
  modifyButton: {
    marginTop: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  modifyButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  navButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  navButtonSecondary: {
    backgroundColor: '#f0f0f0',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextSecondary: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
