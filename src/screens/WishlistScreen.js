import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import StorageService from '../storage/StorageService';

const WishlistScreen = ({ onBack }) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const wishlistData = await StorageService.getWishlist();
      setWishlist(wishlistData || []);
    } catch (err) {
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (start, end) => {
    if (!start) return 'Data não informada';

    try {
      // Verificar se start é uma data válida
      let startDate;
      if (typeof start === 'string') {
        startDate = new Date(start);
      } else {
        startDate = start;
      }

      // Verificar se a data é válida
      if (isNaN(startDate.getTime())) {
        return 'Data não informada';
      }

      const dateStr = startDate.toLocaleDateString('pt-BR');
      const timeStr = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      if (end) {
        try {
          let endDate;
          if (typeof end === 'string') {
            endDate = new Date(end);
          } else {
            endDate = end;
          }

          if (!isNaN(endDate.getTime())) {
            const endTimeStr = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            return `${dateStr} ${timeStr} - ${endTimeStr}`;
          }
        } catch {
          // Se end der erro, continua sem ele
        }
      }

      return `${dateStr} ${timeStr}`;
    } catch {
      return 'Data não informada';
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Nenhum item na lista de desejos</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Lista de Desejos</Text>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Carregando...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {wishlist.length === 0 ? renderEmptyState() : (
            wishlist.map(item => (
              <View key={item.wishlist_id} style={styles.wishlistCard}>
                <Text style={styles.itemTitle}>{item.event.title}</Text>
                <Text style={styles.itemDate}>{formatDateTime(item.event.start, item.event.end)}</Text>
                <Text style={styles.itemLocation}>{item.event.loc}</Text>
              </View>
            ))
          )}
        </ScrollView>
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
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  wishlistCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default WishlistScreen;