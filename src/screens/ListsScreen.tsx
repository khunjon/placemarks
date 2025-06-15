import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ListsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Lists</Text>
      <Text style={styles.subtitle}>
        User's place lists will be displayed here
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