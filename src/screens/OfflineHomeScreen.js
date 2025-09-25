import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import StorageService from '../storage/StorageService';

const OfflineHomeScreen = ({ onNavigate }) => {
  const [eventsCount, setEventsCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    loadCounts();

    // Recarregar a cada 5 segundos para pegar dados atualizados
    const interval = setInterval(loadCounts, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadCounts = async () => {
    try {
      const [eventsData, wishlistData] = await Promise.all([
        StorageService.getEvents(),
        StorageService.getWishlist()
      ]);

      setEventsCount(eventsData ? eventsData.length : 0);
      setWishlistCount(wishlistData ? wishlistData.length : 0);
    } catch (err) {
      setEventsCount(0);
      setWishlistCount(0);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Completa+ (Offline)</Text>
        <Text style={styles.subtitle}>Modo offline</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{eventsCount}</Text>
            <Text style={styles.statLabel}>Eventos Salvos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{wishlistCount}</Text>
            <Text style={styles.statLabel}>Lista de Desejos</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.navigationButton}
          onPress={() => onNavigate('events')}
        >
          <Text style={styles.navigationIcon}>📅</Text>
          <Text style={styles.navigationText}>Ver Eventos Salvos</Text>
          {eventsCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{eventsCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navigationButton}
          onPress={() => onNavigate('wishlist')}
        >
          <Text style={styles.navigationIcon}>❤️</Text>
          <Text style={styles.navigationText}>Lista de Desejos</Text>
          {wishlistCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{wishlistCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#677DE9',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: 'white',
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#677DE9',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  navigationButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navigationIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  navigationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  badge: {
    backgroundColor: '#677DE9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default OfflineHomeScreen;