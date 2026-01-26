import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Button, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllTrips, deleteTrip } from '../../services/api';
import type { Trip } from '../../types/api';
import { useCurrentTrip } from '../../contexts/TripContext';
import { useAuth } from '../../contexts/AuthContext';

// Format date without timezone issues
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  // Force UTC interpretation to avoid timezone offset
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  return new Date(year, month, day).toLocaleDateString();
}

export default function TripsScreen() {
  const router = useRouter();
  const { currentTrip, setCurrentTrip } = useCurrentTrip();
  const { user, logout } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reload trips every time screen comes into focus
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
      Alert.alert('Erreur', 'Impossible de charger les voyages');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (trip: Trip) => {
    Alert.alert(
      'Supprimer le voyage',
      `Voulez-vous vraiment supprimer "${trip.destination}"?\n\nCette action est irréversible.`,
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
              Alert.alert('Succès', 'Voyage supprimé');
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de supprimer le voyage');
            }
          },
        },
      ]
    );
  };

  const renderTripItem = ({ item }: { item: Trip }) => {
    const isSelected = currentTrip?.id === item.id;
    
    return (
      <View style={[styles.tripCard, isSelected && styles.tripCardSelected]}>
        <TouchableOpacity
          style={styles.tripContent}
          onPress={() => {
            setCurrentTrip(item);
            Alert.alert('Voyage sélectionné', `${item.destination} est maintenant le voyage actif`);
          }}
        >
          {isSelected && <View style={styles.selectedBadge}><Text style={styles.selectedBadgeText}>✓ Actif</Text></View>}
          <Text style={styles.tripDestination}>{item.destination}</Text>
          {item.startDate && item.endDate && (
            <Text style={styles.tripDates}>
              {formatDate(item.startDate)} - {formatDate(item.endDate)}
            </Text>
          )}
          {item.tripType && (
            <Text style={styles.tripType}>{item.tripType}</Text>
          )}
          {item.travelers && item.travelers.length > 0 && (
            <Text style={styles.tripTravelers}>
              {item.travelers.length} voyageur{item.travelers.length > 1 ? 's' : ''}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteTrip(item)}
        >
          <Text style={styles.deleteButtonText}>🗑️ Supprimer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <Button title="Réessayer" onPress={loadTrips} />
      </View>
    );
  }

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vous déconnecter?',
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mes Voyages</Text>
          {user && <Text style={styles.userEmail}>{user.name}</Text>}
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
          <Button 
            title="+ Nouveau" 
            onPress={() => router.push('/new-trip')}
          />
        </View>
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🌍</Text>
          <Text style={styles.emptyTitle}>Aucun voyage</Text>
          <Text style={styles.emptySubtitle}>
            Créez votre premier voyage pour commencer
          </Text>
          <Button 
            title="Créer un voyage" 
            onPress={() => router.push('/new-trip')}
          />
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={renderTripItem}
          contentContainerStyle={styles.listContainer}
          refreshing={loading}
          onRefresh={loadTrips}
        />
      )}
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  logoutText: {
    fontSize: 14,
    color: '#ff3b30',
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorText: {
    color: '#ff3b30',
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  listContainer: {
    padding: 16,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  tripCardSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  tripContent: {
    padding: 16,
    position: 'relative',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    padding: 12,
    alignItems: 'center',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tripDestination: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tripDates: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  tripType: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  tripTravelers: {
    fontSize: 12,
    color: '#999',
  },
});
