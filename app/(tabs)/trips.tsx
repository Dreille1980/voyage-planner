import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { getAllTrips } from '../../services/api';
import type { Trip } from '../../types/api';

export default function TripsScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrips();
  }, []);

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

  const renderTripItem = ({ item }: { item: Trip }) => (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => {
        // TODO: Navigate to trip details
        Alert.alert('Voyage', `${item.destination}`);
      }}
    >
      <Text style={styles.tripDestination}>{item.destination}</Text>
      {item.startDate && item.endDate && (
        <Text style={styles.tripDates}>
          {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
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
  );

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes Voyages</Text>
        <Button 
          title="+ Nouveau" 
          onPress={() => router.push('/new-trip')}
        />
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
