import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const StatusMessage = ({ 
  type = 'info', // 'error', 'warning', 'success', 'info'
  message, 
  actionText = null, 
  onAction = null 
}) => {
  const getBackgroundColor = () => {
    switch (type) {
      case 'error': return '#ffe6e6';
      case 'warning': return '#fff3cd';
      case 'success': return '#d4edda';
      default: return '#e3f2fd';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'error': return '#721c24';
      case 'warning': return '#856404';
      case 'success': return '#155724';
      default: return '#0c5460';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <Text style={[styles.message, { color: getTextColor() }]}>
        {message}
      </Text>
      {actionText && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default StatusMessage;