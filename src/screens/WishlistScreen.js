import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

const WishlistScreen = ({ onBack }) => {
  // Dados de exemplo para teste
  const mockWishlist = [
    {
      id: '1',
      title: 'Curso de Python Avançado',
      date: '25/10/2025',
      location: 'Online',
      type: 'event'
    },
    {
      id: '2',
      title: 'Hackathon de Inovação',
      date: '30/10/2025', 
      location: 'Belo Horizonte, MG',
      type: 'event'
    }
  ];

  const handleRemoveFromWishlist = (itemId) => {
    // Por enquanto só mostrar no console
    console.log('Remover item da wishlist:', itemId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Lista de Desejos</Text>
      </View>

      <ScrollView style={styles.content}>
        {mockWishlist.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Sua lista de desejos está vazia</Text>
            <Text style={styles.emptySubtext}>
              Conecte-se à internet para adicionar eventos
            </Text>
          </View>
        ) : (
          mockWishlist.map(item => (
            <View key={item.id} style={styles.wishlistCard}>
              <View style={styles.cardContent}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDate}>{item.date}</Text>
                <Text style={styles.itemLocation}>{item.location}</Text>
              </View>
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => handleRemoveFromWishlist(item.id)}
              >
                <Text style={styles.removeText}>Remover</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {mockWishlist.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Conecte-se à internet para se inscrever nos eventos
          </Text>
        </View>
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  backText: {
    color: 'white',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  wishlistCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  itemLocation: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  removeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    backgroundColor: '#e9ecef',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default WishlistScreen;