import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useCurrentTrip } from '../../contexts/TripContext';
import { getDestinationInfo, regenerateDestinationInfo } from '../../services/api';
import type { DestinationInfo } from '../../types/api';

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
      // Ne pas afficher d'erreur si les infos n'existent pas encore (404)
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
      'Voulez-vous régénérer les informations de destination ? Cela peut prendre quelques secondes.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Régénérer',
          onPress: async () => {
            try {
              setRegenerating(true);
              const data = await regenerateDestinationInfo(currentTrip.id);
              setDestinationInfo(data);
              Alert.alert('Succès', 'Informations régénérées');
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
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🌍</Text>
        <Text style={styles.emptyTitle}>Aucun voyage sélectionné</Text>
        <Text style={styles.emptySubtitle}>
          Sélectionnez un voyage dans l'onglet "Mes Voyages" pour voir les informations sur la destination
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

  if (!destinationInfo) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>⏳</Text>
        <Text style={styles.emptyTitle}>Informations en cours de génération...</Text>
        <Text style={styles.emptySubtitle}>
          Les informations sur la destination sont en train d'être générées par l'IA. Rafraîchissez dans quelques secondes.
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadDestinationInfo}>
          <Text style={styles.refreshButtonText}>🔄 Rafraîchir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Informations Destination</Text>
          <View style={styles.tripBadge}>
            <Text style={styles.tripBadgeText}>
              🌍 {currentTrip.destination}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.regenerateButton}
          onPress={handleRegenerate}
          disabled={regenerating}
        >
          {regenerating ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.regenerateButtonText}>🔄</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
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
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Dernière mise à jour: {new Date(destinationInfo.updatedAt).toLocaleString()}
          </Text>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
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
  regenerateButton: {
    padding: 12,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  regenerateButtonText: {
    fontSize: 24,
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
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  sectionContent: {
    padding: 16,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    marginRight: 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  bulletText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
    color: '#333',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});
