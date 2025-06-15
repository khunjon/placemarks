import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../services/auth-context';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.userId}>User ID: {user?.id}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.signOutButton]}
          onPress={signOut}
        >
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  profileSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2563eb',
  },
  email: {
    fontSize: 18,
    marginBottom: 10,
    color: '#333',
  },
  userId: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 