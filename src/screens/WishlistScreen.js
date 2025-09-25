import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import StorageService from '../storage/StorageService';

const WishlistScreen = ({ onBack, onEventSelect }) => {
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
      // Converter formato brasileiro DD/MM/YYYY para formato Date válido
      const convertBrazilianDate = (dateStr) => {
        if (!dateStr) return null;

        // Se já for um objeto Date
        if (dateStr instanceof Date) return dateStr;

        // Se for string no formato DD/MM/YYYY, converter para MM/DD/YYYY
        if (typeof dateStr === 'string' && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const [day, month, year] = dateStr.split('/');
          return new Date(`${month}/${day}/${year}`);
        }

        // Tentar converter diretamente
        return new Date(dateStr);
      };

      const startDate = convertBrazilianDate(start);

      // Verificar se a data é válida
      if (!startDate || isNaN(startDate.getTime())) {
        return start; // Retorna o valor original se não conseguir converter
      }

      const dateStr = startDate.toLocaleDateString('pt-BR');

      if (end) {
        const endDate = convertBrazilianDate(end);
        if (endDate && !isNaN(endDate.getTime())) {
          const endDateStr = endDate.toLocaleDateString('pt-BR');
          if (dateStr === endDateStr) {
            return dateStr; // Se for o mesmo dia, mostra só a data
          }
          return `${dateStr} - ${endDateStr}`;
        }
      }

      return dateStr;
    } catch {
      return start; // Retorna o valor original em caso de erro
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
              <TouchableOpacity
                key={item.wishlist_id}
                style={styles.wishlistCard}
                onPress={() => onEventSelect && onEventSelect(item.event)}
              >
                <Text style={styles.itemTitle}>{item.event.title}</Text>
                <Text style={styles.itemDate}>{formatDateTime(item.event.start, item.event.end)}</Text>
                <Text style={styles.itemLocation}>{item.event.loc}</Text>
              </TouchableOpacity>
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