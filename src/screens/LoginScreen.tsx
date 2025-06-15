import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  StyleSheet, 
  Alert,
  Keyboard 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../services/auth-context';

export default function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading } = useAuth();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Trim whitespace and log for debugging
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    
    console.log('Attempting sign in with email:', trimmedEmail);
    console.log('Email length:', trimmedEmail.length);

    const { error } = await signIn('email', trimmedEmail, trimmedPassword);

    if (error) {
      console.error('Auth error:', error);
      
      // Handle specific error cases
      if (error.message.includes('invalid format')) {
        Alert.alert('Email Error', 'Please check your email format. Make sure it\'s a valid email address.');
      } else if (error.message.includes('email not confirmed')) {
        Alert.alert('Email Confirmation Required', 'Please check your email and click the confirmation link before signing in.');
      } else if (error.message.includes('Invalid login credentials')) {
        Alert.alert('Sign In Failed', 'Invalid email or password. Please check your credentials and try again.');
      } else {
        Alert.alert('Sign In Error', `${error.message}\n\nEmail: ${trimmedEmail}`);
      }
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.title}>Placemarks</Text>
        <Text style={styles.subtitle}>
          Sign in to your account
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

                  <TouchableOpacity
          style={styles.button}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

                  <TouchableOpacity
          style={styles.switchButton}
          onPress={() => navigation.navigate('SignUp' as never)}
        >
          <Text style={styles.switchText}>
            Don't have an account? <Text style={styles.switchTextBold}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
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
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#2563eb',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  form: {
    gap: 15,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#64748b',
    fontSize: 14,
  },
  switchTextBold: {
    color: '#2563eb',
    fontWeight: '600',
  },
}); 