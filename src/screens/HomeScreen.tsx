import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../services/auth-context';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Placemarks</Text>
      <Text style={styles.subtitle}>Hello, {user?.email}!</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Map')}
        >
          <Text style={styles.buttonText}>View Map</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('AddPlace')}
        >
          <Text style={styles.buttonText}>Add Place</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Lists')}
        >
          <Text style={styles.buttonText}>My Lists</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.buttonText}>Profile</Text>
        </TouchableOpacity>
        
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
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#2563eb',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButton: {
    backgroundColor: '#dc2626',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 