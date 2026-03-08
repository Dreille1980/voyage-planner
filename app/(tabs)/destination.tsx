import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCurrentTrip } from '../../contexts/TripContext';
import { getDestinationInfo, regenerateDestinationInfo } from '../../services/api';
import type { DestinationInfo } from '../../types/api';
import { colors, typography, spacing, borderRadius, shadows, componentStyles } from '../../theme';

const SECTION_ICONS: { [key: string]: string } = {
  'Choses importantes à savoir': '🔔',
  'Choses à éviter': '⚠️',
  'Faits intéressants': '💡',
  'Météo habituelle': '🌤️',
  'Coutumes locales': '🤝',
  'Lois locales et règlements': '⚖️',
  'Sécurité': '🛡️',
  'Transport': '🚌',
  'Paiement et pourboires': '💰',
};

export default function DestinationScreen() {
  const { currentTrip } = useCurrentTrip();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [destinationInfo, setDestinationInfo] = useState<DestinationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (currentTrip) {
      loadDestinationInfo();
    }
  }, [currentTrip]);

  const loadDestinationInfo = async () => {
    if (!currentTrip) return;

    try {
      setLoading(true);
      const data = await getDestinationInfo(currentTrip.id);
      setDestinationInfo(data);
    } catch (err) {
      const errorMessage = (err as Error).message;
      if (!errorMessage.includes('404')) {
        Alert.alert('Erreur', 'Impossible de charger les informations de destination');
      }
      setDestinationInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!currentTrip) return;

    Alert.alert(
      'Régénérer les informations',
      'Voulez-vous régénérer les informations de destination ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Régénérer',
          onPress: async () => {
            try {
              setRegenerating(true);
              const data = await regenerateDestinationInfo(currentTrip.id);
              setDestinationInfo(data);
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de régénérer les informations');
            } finally {
              setRegenerating(false);
            }
          },
        },
      ]
    );
  };

  if (!currentTrip) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Ionicons name="briefcase-outline" size={56} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>Aucun voyage sélectionné</Text>
        <Text style={styles.emptySubtitle}>
          Sélectionnez un voyage dans l'onglet Voyages pour voir les infos destination
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

  if (!destinationInfo) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.emptyTitle}>Génération en cours...</Text>
        <Text style={styles.emptySubtitle}>
          Les informations sont en train d'être générées par l'IA. Rafraîchissez dans quelques secondes.
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadDestinationInfo}>
          <Ionicons name="refresh" size={18} color={colors.textInverse} />
          <Text style={styles.refreshButtonText}>Rafraîchir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Destination</Text>
          <View style={styles.tripBadge}>
            <Ionicons name="location" size={14} color={colors.primary} />
            <Text style={styles.tripBadgeText}>{currentTrip.destination}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.regenerateButton}
          onPress={handleRegenerate}
          disabled={regenerating}
        >
          {regenerating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh" size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {destinationInfo.sections.map((section, index) => {
          const icon = SECTION_ICONS[section.title] || '📍';

          return (
            <View key={index} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>{icon}</Text>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <View style={styles.sectionContent}>
                {section.bullets.map((bullet, bulletIndex) => (
                  <View key={bulletIndex} style={styles.bulletItem}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        <View style={styles.footer}>
          <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.footerText}>
            Mis à jour le {new Date(destinationInfo.updatedAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
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
  regenerateButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxxl,
  },

  // Loading & Empty
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
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

  // Section card
  sectionCard: {
    ...componentStyles.card,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sectionIcon: {
    fontSize: 22,
    marginRight: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  sectionContent: {
    padding: spacing.lg,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
    marginRight: spacing.md,
  },
  bulletText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  footerText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
});
