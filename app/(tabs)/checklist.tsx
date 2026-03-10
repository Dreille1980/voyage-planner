import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCurrentTrip } from '../../contexts/TripContext';
import { getAllChecklistsForTrip, regenerateChecklist, updateChecklistItem, addChecklistItem } from '../../services/api';
import type { Checklist, ChecklistType, ChecklistItem } from '../../types/api';
import ProgressBar from '../../components/ProgressBar';
import { colors, typography, spacing, borderRadius, shadows, componentStyles } from '../../theme';

const CHECKLIST_CONFIG: Record<ChecklistType, { title: string; icon: string; color: string }> = {
  preparatifs: {
    title: 'Préparatifs du voyage',
    icon: '📋',
    color: colors.primary,
  },
  bagage_soute: {
    title: 'Bagage en soute',
    icon: '🧳',
    color: colors.accent,
  },
  bagage_main: {
    title: 'Bagage à main',
    icon: '🎒',
    color: colors.success,
  },
};

export default function ChecklistScreen() {
  const { currentTrip } = useCurrentTrip();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set(['preparatifs']));
  const [editingDeadline, setEditingDeadline] = useState<string | null>(null);
  const [tempDeadline, setTempDeadline] = useState('');
  const [addingItemCategory, setAddingItemCategory] = useState<string | null>(null);
  const [newItemLabel, setNewItemLabel] = useState('');

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
      const errorMessage = (err as Error).message;
      if (!errorMessage.includes('404')) {
        Alert.alert('Erreur', 'Impossible de charger les checklists');
      }
      setChecklists([]);
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
      Alert.alert('Erreur', "Impossible de mettre à jour l'item");
    }
  };

  const handleRegenerateChecklist = async (type: ChecklistType) => {
    if (!currentTrip) return;

    Alert.alert(
      'Régénérer la checklist',
      `Voulez-vous régénérer "${CHECKLIST_CONFIG[type].title}" ? Les modifications seront perdues.`,
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

  const handleAddItem = async (categoryId: string) => {
    if (!newItemLabel.trim()) return;
    try {
      await addChecklistItem(categoryId, newItemLabel.trim());
      setNewItemLabel('');
      setAddingItemCategory(null);
      loadChecklists();
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'ajouter l'item");
    }
  };

  const getDeadlineColor = (deadline: string | null): string => {
    if (!deadline) return colors.textTertiary;

    const deadlineDate = new Date(deadline);
    const today = new Date();
    const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return colors.danger;
    if (daysUntil < 7) return colors.warning;
    if (daysUntil < 30) return colors.warningDark;
    return colors.success;
  };

  const renderItem = (item: ChecklistItem, checklistType: ChecklistType) => {
    const showDeadline = checklistType === 'preparatifs' && item.deadline;
    const isEditing = editingDeadline === item.id;

    return (
      <View key={item.id} style={styles.itemContainer}>
        <TouchableOpacity
          style={styles.itemRow}
          onPress={() => handleCheckItem(item.id, !item.checked)}
          activeOpacity={0.6}
        >
          <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
            {item.checked && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
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
                  placeholderTextColor={colors.textTertiary}
                />
                <TouchableOpacity onPress={() => handleSaveDeadline(item.id)} style={styles.saveButton}>
                  <Ionicons name="checkmark" size={14} color={colors.textInverse} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingDeadline(null)} style={styles.cancelButton}>
                  <Ionicons name="close" size={14} color={colors.textInverse} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.deadline}
                onPress={() => handleEditDeadline(item.id, item.deadline)}
              >
                <Ionicons name="calendar-outline" size={13} color={getDeadlineColor(item.deadline)} />
                <Text style={[styles.deadlineText, { color: getDeadlineColor(item.deadline) }]}>
                  {item.deadline ? new Date(item.deadline).toLocaleDateString('fr-FR') : 'Pas de deadline'}
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
          activeOpacity={0.7}
        >
          <View style={styles.checklistHeaderLeft}>
            <Text style={styles.checklistIcon}>{config.icon}</Text>
            <View style={styles.checklistHeaderInfo}>
              <Text style={styles.checklistTitle}>{config.title}</Text>
              <View style={styles.progressContainer}>
                <ProgressBar
                  current={checkedItems}
                  total={totalItems}
                  height={4}
                  color={config.color}
                  showLabel={false}
                />
                <Text style={styles.checklistProgress}>
                  {checkedItems}/{totalItems}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.checklistHeaderRight}>
            <TouchableOpacity
              onPress={() => handleRegenerateChecklist(checklist.checklistType)}
              style={styles.regenerateButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="refresh" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
            <Ionicons
              name={isExpanded ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={colors.textTertiary}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.checklistContent}>
            {checklist.categories.map((category) => (
              <View key={category.id} style={styles.category}>
                <Text style={styles.categoryName}>{category.name}</Text>
                {category.items.map((item) => renderItem(item, checklist.checklistType))}

                {/* Add item UI */}
                {addingItemCategory === category.id ? (
                  <View style={styles.addItemRow}>
                    <TextInput
                      style={styles.addItemInput}
                      value={newItemLabel}
                      onChangeText={setNewItemLabel}
                      placeholder="Nouvel item..."
                      placeholderTextColor={colors.textTertiary}
                      autoFocus
                      onSubmitEditing={() => handleAddItem(category.id)}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      onPress={() => handleAddItem(category.id)}
                      style={styles.addItemConfirm}
                    >
                      <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setAddingItemCategory(null); setNewItemLabel(''); }}
                      style={styles.addItemCancel}
                    >
                      <Ionicons name="close" size={16} color={colors.textInverse} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addItemButton}
                    onPress={() => { setAddingItemCategory(category.id); setNewItemLabel(''); }}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                    <Text style={styles.addItemButtonText}>Ajouter un item</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (!currentTrip) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Ionicons name="briefcase-outline" size={56} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>Aucun voyage sélectionné</Text>
        <Text style={styles.emptySubtitle}>
          Sélectionnez un voyage dans l'onglet Voyages pour voir ses checklists
        </Text>
        <TouchableOpacity
          style={styles.goToTripsButton}
          onPress={() => router.navigate('/(tabs)/trips')}
        >
          <Text style={styles.goToTripsText}>Aller aux voyages</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.headerTitle}>Checklists</Text>
        <View style={styles.tripBadge}>
          <Ionicons name="location" size={14} color={colors.primary} />
          <Text style={styles.tripBadgeText}>{currentTrip.destination}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {checklists.length === 0 ? (
          <View style={styles.emptyListContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.emptyListTitle}>Génération en cours...</Text>
            <Text style={styles.emptyListSubtitle}>
              Les checklists sont en train d'être générées par l'IA. Rafraîchissez dans quelques secondes.
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={loadChecklists}>
              <Ionicons name="refresh" size={18} color={colors.textInverse} />
              <Text style={styles.refreshButtonText}>Rafraîchir</Text>
            </TouchableOpacity>
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
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxxl,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    ...componentStyles.screenHeader,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  tripBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  tripBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxxl,
  },

  // Loading
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  // Empty states
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  goToTripsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  goToTripsText: {
    ...typography.labelMedium,
    color: colors.textInverse,
  },
  emptyListContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxxl,
  },
  emptyListTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyListSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  refreshButtonText: {
    ...typography.labelMedium,
    color: colors.textInverse,
  },

  // Checklist card
  checklistCard: {
    ...componentStyles.card,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  checklistHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checklistIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  checklistHeaderInfo: {
    flex: 1,
  },
  checklistTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checklistProgress: {
    ...typography.caption,
    color: colors.textTertiary,
    minWidth: 35,
  },
  checklistHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  regenerateButton: {
    padding: spacing.xs,
  },

  // Checklist content
  checklistContent: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingBottom: spacing.sm,
  },
  category: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  categoryName: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  // Item
  itemContainer: {
    marginBottom: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  itemLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  itemLabelChecked: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },

  // Deadline
  deadlineContainer: {
    marginLeft: 38,
    marginTop: spacing.xs,
  },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  deadlineText: {
    ...typography.caption,
    fontWeight: '500',
  },
  deadlineEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deadlineInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...typography.caption,
    width: 120,
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.success,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.danger,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Add item
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  addItemButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  addItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  addItemConfirm: {
    backgroundColor: colors.success,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addItemCancel: {
    backgroundColor: colors.textTertiary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
