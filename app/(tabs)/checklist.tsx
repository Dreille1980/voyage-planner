import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useCurrentTrip } from '../../contexts/TripContext';
import { getAllChecklistsForTrip, regenerateChecklist, updateChecklistItem } from '../../services/api';
import type { Checklist, ChecklistType, ChecklistItem } from '../../types/api';

const CHECKLIST_CONFIG = {
  preparatifs: {
    title: '📋 Préparatifs du voyage',
    icon: '📋',
  },
  bagage_soute: {
    title: '🧳 Bagage en soute',
    icon: '🧳',
  },
  bagage_main: {
    title: '🎒 Bagage à main',
    icon: '🎒',
  },
};

export default function ChecklistScreen() {
  const { currentTrip } = useCurrentTrip();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set(['preparatifs']));
  const [editingDeadline, setEditingDeadline] = useState<string | null>(null);
  const [tempDeadline, setTempDeadline] = useState('');

  useEffect(() => {
    if (currentTrip) {
      loadChecklists();
    }
  }, [currentTrip]);

  const loadChecklists = async () => {
    if (!currentTrip) return;

    try {
      setLoading(true);
      const data = await getAllChecklistsForTrip(currentTrip.id);
      setChecklists(data);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les checklists');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (type: ChecklistType) => {
    const newExpanded = new Set(expandedLists);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedLists(newExpanded);
  };

  const handleCheckItem = async (itemId: string, checked: boolean) => {
    try {
      await updateChecklistItem(itemId, { checked });
      loadChecklists();
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de mettre à jour l\'item');
    }
  };

  const handleRegenerateChecklist = async (type: ChecklistType) => {
    if (!currentTrip) return;

    Alert.alert(
      'Régénérer la checklist',
      `Voulez-vous régénérer la checklist "${CHECKLIST_CONFIG[type].title}" ? Les modifications seront perdues.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Régénérer',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await regenerateChecklist(currentTrip.id, type);
              loadChecklists();
              Alert.alert('Succès', 'Checklist régénérée');
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de régénérer la checklist');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditDeadline = (itemId: string, currentDeadline: string | null) => {
    setEditingDeadline(itemId);
    setTempDeadline(currentDeadline || '');
  };

  const handleSaveDeadline = async (itemId: string) => {
    try {
      await updateChecklistItem(itemId, { deadline: tempDeadline || null });
      setEditingDeadline(null);
      loadChecklists();
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de mettre à jour la deadline');
    }
  };

  const getDeadlineColor = (deadline: string | null): string => {
    if (!deadline) return '#666';
    
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return '#ff3b30'; // Dépassé
    if (daysUntil < 7) return '#ff9500'; // Urgent
    if (daysUntil < 30) return '#ffcc00'; // Bientôt
    return '#34c759'; // OK
  };

  const renderItem = (item: ChecklistItem, checklistType: ChecklistType) => {
    const showDeadline = checklistType === 'preparatifs' && item.deadline;
    const isEditing = editingDeadline === item.id;

    return (
      <View key={item.id} style={styles.itemContainer}>
        <TouchableOpacity
          style={styles.itemRow}
          onPress={() => handleCheckItem(item.id, !item.checked)}
        >
          <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
            {item.checked && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.itemLabel, item.checked && styles.itemLabelChecked]}>
            {item.label}
          </Text>
        </TouchableOpacity>

        {showDeadline && (
          <View style={styles.deadlineContainer}>
            {isEditing ? (
              <View style={styles.deadlineEdit}>
                <TextInput
                  style={styles.deadlineInput}
                  value={tempDeadline}
                  onChangeText={setTempDeadline}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                />
                <TouchableOpacity onPress={() => handleSaveDeadline(item.id)} style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingDeadline(null)} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.deadline}
                onPress={() => handleEditDeadline(item.id, item.deadline)}
              >
                <Text style={[styles.deadlineText, { color: getDeadlineColor(item.deadline) }]}>
                  📅 {item.deadline ? new Date(item.deadline).toLocaleDateString() : 'Pas de deadline'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderChecklist = (checklist: Checklist) => {
    const config = CHECKLIST_CONFIG[checklist.checklistType];
    const isExpanded = expandedLists.has(checklist.checklistType);
    const totalItems = checklist.categories.reduce((sum, cat) => sum + cat.items.length, 0);
    const checkedItems = checklist.categories.reduce(
      (sum, cat) => sum + cat.items.filter(item => item.checked).length,
      0
    );

    return (
      <View key={checklist.id} style={styles.checklistCard}>
        <TouchableOpacity
          style={styles.checklistHeader}
          onPress={() => toggleExpanded(checklist.checklistType)}
        >
          <View style={styles.checklistHeaderLeft}>
            <Text style={styles.checklistIcon}>{config.icon}</Text>
            <View>
              <Text style={styles.checklistTitle}>{config.title}</Text>
              <Text style={styles.checklistProgress}>
                {checkedItems}/{totalItems} complétés
              </Text>
            </View>
          </View>
          <View style={styles.checklistHeaderRight}>
            <TouchableOpacity
              onPress={() => handleRegenerateChecklist(checklist.checklistType)}
              style={styles.regenerateButton}
            >
              <Text style={styles.regenerateButtonText}>🔄</Text>
            </TouchableOpacity>
            <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.checklistContent}>
            {checklist.categories.map((category) => (
              <View key={category.id} style={styles.category}>
                <Text style={styles.categoryName}>{category.name}</Text>
                {category.items.map((item) => renderItem(item, checklist.checklistType))}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (!currentTrip) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🌍</Text>
        <Text style={styles.emptyTitle}>Aucun voyage sélectionné</Text>
        <Text style={styles.emptySubtitle}>
          Sélectionnez un voyage dans l'onglet "Mes Voyages" pour voir ses checklists
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Checklists</Text>
          <View style={styles.tripBadge}>
            <Text style={styles.tripBadgeText}>
              🌍 {currentTrip.destination}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {checklists.length === 0 ? (
          <View style={styles.emptyListContainer}>
            <Text style={styles.emptyText}>⏳</Text>
            <Text style={styles.emptyTitle}>Checklists en cours de génération...</Text>
            <Text style={styles.emptySubtitle}>
              Les checklists sont en train d'être générées par l'IA. Rafraîchissez dans quelques secondes.
            </Text>
          </View>
        ) : (
          checklists.map(renderChecklist)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tripBadge: {
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  tripBadgeText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyListContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 60,
    marginBottom: 20,
  },
  checklistCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  checklistHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checklistIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  checklistTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  checklistProgress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  checklistHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  regenerateButton: {
    padding: 8,
    marginRight: 8,
  },
  regenerateButtonText: {
    fontSize: 20,
  },
  expandIcon: {
    fontSize: 16,
    color: '#666',
  },
  checklistContent: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 8,
  },
  category: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  itemContainer: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemLabel: {
    fontSize: 15,
    flex: 1,
  },
  itemLabelChecked: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  deadlineContainer: {
    marginLeft: 36,
    marginTop: 4,
  },
  deadline: {
    alignSelf: 'flex-start',
  },
  deadlineText: {
    fontSize: 13,
    fontWeight: '500',
  },
  deadlineEdit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 6,
    fontSize: 13,
    width: 120,
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#34c759',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#ff3b30',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
