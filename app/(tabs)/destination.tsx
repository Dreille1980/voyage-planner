import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCurrentTrip } from '../../contexts/TripContext';
import { getDestinationInfo, regenerateDestinationInfo, getItinerary, regenerateItinerary, getWeather } from '../../services/api';
import type { DestinationInfo, Itinerary, ItineraryDay, ItineraryActivity, WeatherData } from '../../types/api';
import { colors, typography, spacing, borderRadius, shadows, componentStyles } from '../../theme';

type SubTab = 'infos' | 'itinerary';

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

const ACTIVITY_ICONS: Record<string, string> = {
  visit: '🏛️',
  food: '🍽️',
  transport: '🚕',
  leisure: '🎯',
  shopping: '🛍️',
  other: '📌',
};

const WEATHER_ICONS: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '🌨️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

function getWeatherIcon(code: number): string {
  return WEATHER_ICONS[code] || '🌡️';
}

export default function DestinationScreen() {
  const { currentTrip } = useCurrentTrip();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SubTab>('infos');
  const [destinationInfo, setDestinationInfo] = useState<DestinationInfo | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));

  useEffect(() => {
    if (currentTrip) {
      loadData();
    }
  }, [currentTrip]);

  const loadData = async () => {
    if (!currentTrip) return;
    try {
      setLoading(true);
      const [destData, itinData] = await Promise.all([
        getDestinationInfo(currentTrip.id).catch(() => null),
        getItinerary(currentTrip.id).catch(() => null),
      ]);
      setDestinationInfo(destData);
      setItinerary(itinData);

      // Load weather
      getWeather(currentTrip.destination)
        .then(setWeather)
        .catch(() => setWeather(null));
    } catch (err) {
      const msg = (err as Error).message;
      if (!msg.includes('404')) {
        Alert.alert('Erreur', 'Impossible de charger les données');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateInfo = async () => {
    if (!currentTrip) return;
    Alert.alert('Régénérer les informations', 'Voulez-vous régénérer les informations de destination ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Régénérer',
        onPress: async () => {
          try {
            setRegenerating(true);
            const data = await regenerateDestinationInfo(currentTrip.id);
            setDestinationInfo(data);
          } catch { Alert.alert('Erreur', 'Impossible de régénérer'); }
          finally { setRegenerating(false); }
        },
      },
    ]);
  };

  const handleRegenerateItinerary = async () => {
    if (!currentTrip) return;
    Alert.alert('Régénérer l\'itinéraire', 'Voulez-vous régénérer l\'itinéraire complet ? Les modifications seront perdues.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Régénérer',
        style: 'destructive',
        onPress: async () => {
          try {
            setItineraryLoading(true);
            const data = await regenerateItinerary(currentTrip.id);
            setItinerary(data);
          } catch { Alert.alert('Erreur', 'Impossible de régénérer l\'itinéraire'); }
          finally { setItineraryLoading(false); }
        },
      },
    ]);
  };

  const toggleDay = (dayNumber: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayNumber)) next.delete(dayNumber);
      else next.add(dayNumber);
      return next;
    });
  };

  // === EMPTY / LOADING STATES ===

  if (!currentTrip) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Ionicons name="briefcase-outline" size={56} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>Aucun voyage sélectionné</Text>
        <Text style={styles.emptySubtitle}>Sélectionnez un voyage dans l'onglet Voyages</Text>
        <TouchableOpacity style={styles.goToTripsButton} onPress={() => router.navigate('/(tabs)/trips')}>
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

  // === WEATHER WIDGET ===
  const renderWeatherWidget = () => {
    if (!weather?.current) return null;
    const icon = getWeatherIcon(weather.current.weathercode);
    return (
      <View style={styles.weatherCard}>
        <View style={styles.weatherMain}>
          <Text style={styles.weatherIcon}>{icon}</Text>
          <View>
            <Text style={styles.weatherTemp}>{Math.round(weather.current.temperature_2m)}°C</Text>
            <Text style={styles.weatherCity}>{weather.city}, {weather.country}</Text>
          </View>
        </View>
        <View style={styles.weatherDetails}>
          <View style={styles.weatherDetail}>
            <Ionicons name="thermometer-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.weatherDetailText}>Ressenti {Math.round(weather.current.apparent_temperature)}°C</Text>
          </View>
          <View style={styles.weatherDetail}>
            <Ionicons name="water-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.weatherDetailText}>{weather.current.relative_humidity_2m}%</Text>
          </View>
          <View style={styles.weatherDetail}>
            <Ionicons name="speedometer-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.weatherDetailText}>{Math.round(weather.current.wind_speed_10m)} km/h</Text>
          </View>
        </View>
        {weather.daily && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastRow}>
            {weather.daily.time.slice(0, 7).map((date, i) => (
              <View key={date} style={styles.forecastDay}>
                <Text style={styles.forecastDayName}>
                  {new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                </Text>
                <Text style={styles.forecastIcon}>{getWeatherIcon(weather.daily!.weathercode[i]!)}</Text>
                <Text style={styles.forecastTemp}>
                  {Math.round(weather.daily!.temperature_2m_max[i]!)}°
                </Text>
                <Text style={styles.forecastTempMin}>
                  {Math.round(weather.daily!.temperature_2m_min[i]!)}°
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  // === INFO TAB ===
  const renderInfosTab = () => {
    if (!destinationInfo) {
      return (
        <View style={styles.emptyTabContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyTabTitle}>Génération en cours...</Text>
          <Text style={styles.emptyTabSubtitle}>Rafraîchissez dans quelques secondes.</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
            <Ionicons name="refresh" size={18} color={colors.textInverse} />
            <Text style={styles.refreshButtonText}>Rafraîchir</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {destinationInfo.sections.map((section, index) => {
          const icon = SECTION_ICONS[section.title] || '📍';
          return (
            <View key={index} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>{icon}</Text>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <View style={styles.sectionContent}>
                {section.bullets.map((bullet, bi) => (
                  <View key={bi} style={styles.bulletItem}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </>
    );
  };

  // === ITINERARY TAB ===
  const renderItineraryTab = () => {
    if (itineraryLoading) {
      return (
        <View style={styles.emptyTabContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyTabTitle}>Génération de l'itinéraire...</Text>
        </View>
      );
    }

    if (!itinerary || !itinerary.days || itinerary.days.length === 0) {
      return (
        <View style={styles.emptyTabContainer}>
          <Text style={{ fontSize: 48 }}>🗺️</Text>
          <Text style={styles.emptyTabTitle}>Pas encore d'itinéraire</Text>
          <Text style={styles.emptyTabSubtitle}>Générez un itinéraire jour par jour avec l'IA</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => {
            if (!currentTrip) return;
            setItineraryLoading(true);
            regenerateItinerary(currentTrip.id)
              .then(setItinerary)
              .catch(() => Alert.alert('Erreur', 'Impossible de générer l\'itinéraire'))
              .finally(() => setItineraryLoading(false));
          }}>
            <Ionicons name="sparkles" size={18} color={colors.textInverse} />
            <Text style={styles.refreshButtonText}>Générer l'itinéraire</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.refreshButton, { backgroundColor: colors.surfaceSecondary, marginTop: spacing.sm }]} onPress={loadData}>
            <Ionicons name="refresh" size={18} color={colors.textPrimary} />
            <Text style={[styles.refreshButtonText, { color: colors.textPrimary }]}>Rafraîchir</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {itinerary.days.map((day) => {
          const isExpanded = expandedDays.has(day.dayNumber);
          return (
            <View key={day.dayNumber} style={styles.dayCard}>
              <TouchableOpacity style={styles.dayHeader} onPress={() => toggleDay(day.dayNumber)} activeOpacity={0.7}>
                <View style={styles.dayNumberBadge}>
                  <Text style={styles.dayNumberText}>J{day.dayNumber}</Text>
                </View>
                <Text style={styles.dayTitle} numberOfLines={1}>{day.title}</Text>
                <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textTertiary} />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.dayContent}>
                  {day.activities.map((activity, ai) => (
                    <View key={activity.id || ai} style={styles.activityRow}>
                      <View style={styles.activityTimeline}>
                        <Text style={styles.activityTime}>{activity.time}</Text>
                        {ai < day.activities.length - 1 && <View style={styles.timelineLine} />}
                      </View>
                      <View style={styles.activityCard}>
                        <View style={styles.activityHeader}>
                          <Text style={styles.activityIcon}>{ACTIVITY_ICONS[activity.type] || '📌'}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.activityTitle}>{activity.title}</Text>
                            {activity.duration && (
                              <Text style={styles.activityDuration}>⏱️ {activity.duration}</Text>
                            )}
                          </View>
                        </View>
                        <Text style={styles.activityDescription}>{activity.description}</Text>
                        {activity.tips && (
                          <View style={styles.activityTip}>
                            <Ionicons name="bulb-outline" size={14} color={colors.warning} />
                            <Text style={styles.activityTipText}>{activity.tips}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </>
    );
  };

  // === MAIN RENDER ===
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
          style={styles.regenerateBtn}
          onPress={activeTab === 'infos' ? handleRegenerateInfo : handleRegenerateItinerary}
          disabled={regenerating || itineraryLoading}
        >
          {regenerating || itineraryLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh" size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Sub-tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'infos' && styles.tabActive]}
          onPress={() => setActiveTab('infos')}
        >
          <Ionicons name="information-circle-outline" size={18} color={activeTab === 'infos' ? colors.primary : colors.textTertiary} />
          <Text style={[styles.tabText, activeTab === 'infos' && styles.tabTextActive]}>Infos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'itinerary' && styles.tabActive]}
          onPress={() => setActiveTab('itinerary')}
        >
          <Ionicons name="map-outline" size={18} color={activeTab === 'itinerary' ? colors.primary : colors.textTertiary} />
          <Text style={[styles.tabText, activeTab === 'itinerary' && styles.tabTextActive]}>Itinéraire</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderWeatherWidget()}
        {activeTab === 'infos' ? renderInfosTab() : renderItineraryTab()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxxl, backgroundColor: colors.background },

  // Header
  header: { ...componentStyles.screenHeader, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: spacing.sm },
  headerLeft: { flex: 1 },
  headerTitle: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm },
  tripBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySurface, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.pill, alignSelf: 'flex-start', gap: spacing.xs },
  tripBadgeText: { ...typography.labelSmall, color: colors.primary },
  regenerateBtn: { width: 44, height: 44, borderRadius: borderRadius.pill, backgroundColor: colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },

  // Sub-tabs
  tabBar: { flexDirection: 'row', paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.surface },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, gap: spacing.xs, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.labelMedium, color: colors.textTertiary },
  tabTextActive: { color: colors.primary },

  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxxl },

  // Weather
  weatherCard: { ...componentStyles.card, padding: spacing.lg, marginBottom: spacing.lg },
  weatherMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  weatherIcon: { fontSize: 40 },
  weatherTemp: { ...typography.h1, color: colors.textPrimary },
  weatherCity: { ...typography.caption, color: colors.textSecondary },
  weatherDetails: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.md },
  weatherDetail: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  weatherDetailText: { ...typography.caption, color: colors.textSecondary },
  forecastRow: { marginTop: spacing.sm },
  forecastDay: { alignItems: 'center', marginRight: spacing.lg, minWidth: 48 },
  forecastDayName: { ...typography.caption, color: colors.textTertiary, marginBottom: 4, textTransform: 'capitalize' },
  forecastIcon: { fontSize: 20, marginBottom: 2 },
  forecastTemp: { ...typography.labelSmall, color: colors.textPrimary },
  forecastTempMin: { ...typography.caption, color: colors.textTertiary },

  // Loading / empty
  loadingText: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.md },
  emptyTitle: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm, textAlign: 'center' },
  emptySubtitle: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xxl },
  goToTripsButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  goToTripsText: { ...typography.labelMedium, color: colors.textInverse },
  emptyTabContainer: { alignItems: 'center', paddingVertical: spacing.xxxxl },
  emptyTabTitle: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  emptyTabSubtitle: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xxl },
  refreshButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md, gap: spacing.sm },
  refreshButtonText: { ...typography.labelMedium, color: colors.textInverse },

  // Section cards (infos tab)
  sectionCard: { ...componentStyles.card, marginBottom: spacing.md, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  sectionIcon: { fontSize: 22, marginRight: spacing.md },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, flex: 1 },
  sectionContent: { padding: spacing.lg },
  bulletItem: { flexDirection: 'row', marginBottom: spacing.md, alignItems: 'flex-start' },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 8, marginRight: spacing.md },
  bulletText: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },

  // Itinerary day cards
  dayCard: { ...componentStyles.card, marginBottom: spacing.md, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  dayNumberBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  dayNumberText: { ...typography.labelMedium, color: colors.textInverse, fontWeight: '700' },
  dayTitle: { ...typography.h3, color: colors.textPrimary, flex: 1 },
  dayContent: { borderTopWidth: 1, borderTopColor: colors.borderLight, padding: spacing.lg },

  // Activity
  activityRow: { flexDirection: 'row', marginBottom: spacing.lg },
  activityTimeline: { width: 50, alignItems: 'center' },
  activityTime: { ...typography.caption, color: colors.primary, fontWeight: '700', marginBottom: spacing.xs },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.borderLight, marginTop: spacing.xs },
  activityCard: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, padding: spacing.md, marginLeft: spacing.sm },
  activityHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  activityIcon: { fontSize: 20 },
  activityTitle: { ...typography.labelMedium, color: colors.textPrimary },
  activityDuration: { ...typography.caption, color: colors.textTertiary },
  activityDescription: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xs },
  activityTip: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, backgroundColor: colors.warningLight, borderRadius: borderRadius.sm, padding: spacing.sm, marginTop: spacing.xs },
  activityTipText: { ...typography.caption, color: colors.warningDark, flex: 1 },
});
