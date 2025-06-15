import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AddPlaceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add New Place</Text>
      <Text style={styles.subtitle}>
        Form to add new places will be implemented here
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2563eb',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
}); 