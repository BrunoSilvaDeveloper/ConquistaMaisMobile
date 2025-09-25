import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const OfflineHomeScreen = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Completa+ (Offline)</Text>
        <Text style={styles.subtitle}>Modo offline</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={() => onNavigate('events')}
        >
          <Text style={styles.navigationIcon}>📅</Text>
          <Text style={styles.navigationText}>Ver Eventos Salvos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navigationButton}
          onPress={() => onNavigate('wishlist')}
        >
          <Text style={styles.navigationIcon}>❤️</Text>
          <Text style={styles.navigationText}>Lista de Desejos</Text>
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
    backgroundColor: '#007AFF',
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
    justifyContent: 'center',
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
});

export default OfflineHomeScreen;