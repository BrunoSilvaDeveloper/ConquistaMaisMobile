import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';

const EventDetailScreen = ({ event, onBack }) => {
  const formatDateTime = (start, end) => {
    if (!start) return 'Data não informada';

    try {
      const convertBrazilianDate = (dateStr) => {
        if (!dateStr) return null;
        if (dateStr instanceof Date) return dateStr;
        if (typeof dateStr === 'string' && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const [day, month, year] = dateStr.split('/');
          return new Date(`${month}/${day}/${year}`);
        }
        return new Date(dateStr);
      };

      const startDate = convertBrazilianDate(start);
      if (!startDate || isNaN(startDate.getTime())) {
        return start;
      }

      const dateStr = startDate.toLocaleDateString('pt-BR');

      if (end) {
        const endDate = convertBrazilianDate(end);
        if (endDate && !isNaN(endDate.getTime())) {
          const endDateStr = endDate.toLocaleDateString('pt-BR');
          if (dateStr === endDateStr) {
            return dateStr;
          }
          return `${dateStr} - ${endDateStr}`;
        }
      }

      return dateStr;
    } catch {
      return start;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Detalhes do Evento</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Imagem do evento */}
        {event.img && (
          <View style={styles.imageContainer}>
            {event.imgBase64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${event.imgBase64}` }}
                style={styles.eventImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>📷</Text>
                <Text style={styles.placeholderSubtext}>Imagem disponível apenas online</Text>
              </View>
            )}
          </View>
        )}

        {/* Informações do evento */}
        <View style={styles.infoContainer}>
          <Text style={styles.eventTitle}>{event.title}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <Text style={styles.infoText}>{formatDateTime(event.start, event.end)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <Text style={styles.infoText}>{event.loc || 'Local não informado'}</Text>
          </View>

          {event.cat && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🏷️</Text>
              <Text style={styles.infoText}>{event.cat}</Text>
            </View>
          )}

          {event.desc && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionTitle}>Descrição</Text>
              <Text style={styles.descriptionText}>{event.desc}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer com aviso */}
      <View style={styles.footer}>
        <View style={styles.offlineNotice}>
          <Text style={styles.offlineNoticeIcon}>📱</Text>
          <Text style={styles.offlineNoticeText}>
            Para se inscrever neste evento, é necessário estar conectado à internet
          </Text>
        </View>
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
  },
  imageContainer: {
    backgroundColor: 'white',
    margin: 20,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventImage: {
    width: '100%',
    height: 200,
  },
  placeholderImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    color: '#666',
    marginBottom: 10,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    lineHeight: 30,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    flex: 1,
    lineHeight: 22,
  },
  descriptionContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
  footer: {
    padding: 20,
  },
  offlineNotice: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  offlineNoticeIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  offlineNoticeText: {
    fontSize: 14,
    color: '#856404',
    flex: 1,
    lineHeight: 20,
  },
});

export default EventDetailScreen;