import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAllTrips, deleteTrip } from '../../services/api';
import type { Trip } from '../../types/api';
import { useCurrentTrip } from '../../contexts/TripContext';
import { useAuth } from '../../contexts/AuthContext';
import ActionMenu from '../../components/ActionMenu';
import Toast from '../../components/Toast';
import { colors, typography, spacing, borderRadius, shadows, componentStyles } from '../../theme';

// Emoji flags for common destinations
const DESTINATION_EMOJIS: { [key: string]: string } = {
  'france': '🇫🇷', 'paris': '🇫🇷', 'italie': '🇮🇹', 'italy': '🇮🇹', 'rome': '🇮🇹',
  'espagne': '🇪🇸', 'spain': '🇪🇸', 'barcelone': '🇪🇸', 'japon': '🇯🇵', 'japan': '🇯🇵',
  'tokyo': '🇯🇵', 'portugal': '🇵🇹', 'lisbonne': '🇵🇹', 'grèce': '🇬🇷', 'greece': '🇬🇷',
  'mexique': '🇲🇽', 'mexico': '🇲🇽', 'maroc': '🇲🇦', 'morocco': '🇲🇦',
  'thaïlande': '🇹🇭', 'thailand': '🇹🇭', 'bangkok': '🇹🇭',
  'états-unis': '🇺🇸', 'usa': '🇺🇸', 'new york': '🇺🇸', 'canada': '🇨🇦',
  'allemagne': '🇩🇪', 'germany': '🇩🇪', 'berlin': '🇩🇪',
  'royaume-uni': '🇬🇧', 'angleterre': '🇬🇧', 'london': '🇬🇧', 'londres': '🇬🇧',
  'cuba': '🇨🇺', 'colombie': '🇨🇴', 'pérou': '🇵🇪', 'brésil': '🇧🇷', 'brazil': '🇧🇷',
  'australie': '🇦🇺', 'australia': '🇦🇺',
  'croatie': '🇭🇷', 'croatia': '🇭🇷',
  'islande': '🇮🇸', 'iceland': '🇮🇸',
  'turquie': '🇹🇷', 'turkey': '🇹🇷', 'istanbul': '🇹🇷',
};

function getDestinationEmoji(destination: string): string {
  const lower = destination.toLowerCase();
  for (const [key, emoji] of Object.entries(DESTINATION_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '✈️';
}

// Color palette for card accents
const CARD_COLORS = ['#1B6B93', '#E8735A', '#2EAF6E', '#F5A623', '#9B59B6', '#3498DB'];

function getCardColor(index: number): string {
  return CARD_COLORS[index % CARD_COLORS.length];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  return new Date(year, month, day).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

function getDaysUntil(startDate: string): string | null {
  const now = new Date();
  const start = new Date(startDate);
  const diff = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  if (diff === 0) return "Aujourd'hui !";
  if (diff === 1) return 'Demain !';
  return `Dans ${diff} jours`;
}

export default function TripsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentTrip, setCurrentTrip } = useCurrentTrip();
  const { user, logout } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({ visible: false, message: '', type: 'success' });
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [])
  );

  const loadTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllTrips();
      setTrips(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const handleSelectTrip = (trip: Trip) => {
    setCurrentTrip(trip);
    showToast(`${trip.destination} sélectionné`, 'success');
  };

  const handleDeleteTrip = (trip: Trip) => {
    // Close swipeable first
    swipeableRefs.current.get(trip.id)?.close();

    Alert.alert(
      'Supprimer le voyage',
      `Voulez-vous vraiment supprimer "${trip.destination}" ?\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrip(trip.id);
              if (currentTrip?.id === trip.id) {
                setCurrentTrip(null);
              }
              await loadTrips();
              showToast('Voyage supprimé', 'info');
            } catch (err) {
              showToast('Impossible de supprimer le voyage', 'error');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const renderRightActions = (trip: Trip) => {
    return (
      <TouchableOpacity
        style={styles.swipeDeleteAction}
        onPress={() => handleDeleteTrip(trip)}
      >
        <Ionicons name="trash-outline" size={24} color={colors.textInverse} />
        <Text style={styles.swipeDeleteText}>Supprimer</Text>
      </TouchableOpacity>
    );
  };

  const renderTripItem = ({ item, index }: { item: Trip; index: number }) => {
    const isSelected = currentTrip?.id === item.id;
    const cardColor = getCardColor(index);
    const emoji = getDestinationEmoji(item.destination);
    const daysUntil = item.startDate ? getDaysUntil(item.startDate) : null;

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) swipeableRefs.current.set(item.id, ref);
        }}
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
        friction={2}
      >
        <TouchableOpacity
          style={[styles.tripCard, isSelected && styles.tripCardSelected]}
          onPress={() => handleSelectTrip(item)}
          activeOpacity={0.7}
        >
          {/* Color accent bar */}
          <View style={[styles.cardAccent, { backgroundColor: cardColor }]} />

          <View style={styles.cardContent}>
            <View style={styles.cardTopRow}>
              <View style={styles.cardInfo}>
                <View style={styles.destinationRow}>
                  <Text style={styles.destinationEmoji}>{emoji}</Text>
                  <Text style={styles.tripDestination} numberOfLines={1}>
                    {item.destination}
                  </Text>
                </View>

                {item.name && item.name !== item.destination && (
                  <Text style={styles.tripName} numberOfLines={1}>{item.name}</Text>
                )}

                {item.startDate && item.endDate && (
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
                    <Text style={styles.tripDates}>
                      {formatDate(item.startDate)} → {formatDate(item.endDate)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.cardActions}>
                {isSelected && (
                  <View style={[styles.activeBadge, { backgroundColor: cardColor }]}>
                    <Ionicons name="checkmark" size={12} color={colors.textInverse} />
                  </View>
                )}
                <ActionMenu
                  items={[
                    {
                      label: 'Réservations',
                      icon: 'receipt-outline',
                      onPress: () => {
                        setCurrentTrip(item);
                        router.push('/reservations');
                      },
                    },
                    {
                      label: 'Supprimer',
                      icon: 'trash-outline',
                      onPress: () => handleDeleteTrip(item),
                      destructive: true,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Bottom tags row */}
            <View style={styles.tagsRow}>
              {item.tripType && (
                <View style={[styles.tag, { backgroundColor: colors.primarySurface }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{item.tripType}</Text>
                </View>
              )}
              {item.travelers && item.travelers.length > 0 && (
                <View style={[styles.tag, { backgroundColor: colors.accentSurface }]}>
                  <Ionicons name="people-outline" size={12} color={colors.accent} />
                  <Text style={[styles.tagText, { color: colors.accent }]}>
                    {item.travelers.length}
                  </Text>
                </View>
              )}
              {daysUntil && (
                <View style={[styles.tag, { backgroundColor: colors.successLight }]}>
                  <Text style={[styles.tagText, { color: colors.successDark }]}>{daysUntil}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.errorTitle}>Connexion impossible</Text>
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.errorButtons}>
          <TouchableOpacity style={styles.retryButton} onPress={loadTrips}>
            <Ionicons name="refresh" size={18} color={colors.textInverse} />
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutErrorButton}
            onPress={async () => {
              await logout();
              router.replace('/auth/login');
            }}
          >
            <Text style={styles.logoutErrorButtonText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View>
          <Text style={styles.headerTitle}>Mes Voyages</Text>
          {user && <Text style={styles.headerSubtitle}>Bonjour, {user.name} 👋</Text>}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newTripButton}
            onPress={() => router.push('/new-trip')}
          >
            <Ionicons name="add" size={20} color={colors.textInverse} />
            <Text style={styles.newTripButtonText}>Nouveau</Text>
          </TouchableOpacity>
        </View>
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🌍</Text>
          <Text style={styles.emptyTitle}>Aucun voyage</Text>
          <Text style={styles.emptySubtitle}>
            Créez votre premier voyage pour commencer l'aventure !
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/new-trip')}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.textInverse} />
            <Text style={styles.emptyButtonText}>Créer un voyage</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={renderTripItem}
          contentContainerStyle={styles.listContainer}
          refreshing={loading}
          onRefresh={loadTrips}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </GestureHandlerRootView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    gap: spacing.xs,
  },
  newTripButtonText: {
    ...typography.labelMedium,
    color: colors.textInverse,
  },

  // Loading / Error
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  retryButtonText: {
    ...typography.labelMedium,
    color: colors.textInverse,
  },
  logoutErrorButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  logoutErrorButtonText: {
    ...typography.labelMedium,
    color: colors.danger,
  },

  // Trip Card
  listContainer: {
    padding: spacing.lg,
  },
  tripCard: {
    ...componentStyles.card,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  tripCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cardAccent: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: spacing.lg,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  destinationEmoji: {
    fontSize: 22,
  },
  tripDestination: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  tripName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginLeft: 30, // align with destination text
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tripDates: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    gap: spacing.xs,
  },
  tagText: {
    ...typography.caption,
    fontWeight: '600',
  },

  // Swipe delete
  swipeDeleteAction: {
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    borderTopRightRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  swipeDeleteText: {
    ...typography.caption,
    color: colors.textInverse,
    marginTop: spacing.xs,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  emptyButtonText: {
    ...typography.labelLarge,
    color: colors.textInverse,
  },
});
