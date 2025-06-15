import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../services/auth';

export default function WelcomeScreen() {
  const navigation = useNavigation();

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await authService.signInWithGoogle();
      if (error) {
        Alert.alert('Sign In Error', error.message);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to sign in with Google');
    }
  };

  // TODO: Implement Facebook Sign In later
  // const handleFacebookSignIn = async () => {
  //   try {
  //     const { error } = await authService.signInWithFacebook();
  //     if (error) {
  //       Alert.alert('Sign In Error', error.message);
  //     }
  //   } catch (error: any) {
  //     Alert.alert('Error', 'Failed to sign in with Facebook');
  //   }
  // };

  // TODO: Implement Apple Sign In later
  // const handleAppleSignIn = async () => {
  //   try {
  //     const { error } = await authService.signInWithApple();
  //     if (error) {
  //       Alert.alert('Sign In Error', error.message);
  //     }
  //   } catch (error: any) {
  //     Alert.alert('Error', 'Failed to sign in with Apple');
  //   }
  // };

  const handleEmailSignIn = () => {
    navigation.navigate('Login' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Placemarks</Text>
          <Text style={styles.subtitle}>
            Your AI-powered location assistant for Bangkok
          </Text>
          <Text style={styles.description}>
            Discover amazing places, save your favorites, and get personalized recommendations
          </Text>
        </View>

        {/* Social Login Buttons */}
        <View style={styles.socialButtons}>
          {/* Google Sign In */}
          <TouchableOpacity
            style={[styles.socialButton, styles.googleButton]}
            onPress={handleGoogleSignIn}
          >
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* TODO: Implement Facebook Sign In later */}
          {/* <TouchableOpacity
            style={[styles.socialButton, styles.facebookButton]}
            onPress={handleFacebookSignIn}
          >
            <Text style={styles.socialButtonText}>Continue with Facebook</Text>
          </TouchableOpacity> */}

          {/* TODO: Implement Apple Sign In later */}
          {/* {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialButton, styles.appleButton]}
              onPress={handleAppleSignIn}
            >
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </TouchableOpacity>
          )} */}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Sign In */}
          <TouchableOpacity
            style={[styles.socialButton, styles.emailButton]}
            onPress={handleEmailSignIn}
          >
            <Text style={styles.emailButtonText}>Continue with Email</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  socialButtons: {
    gap: 16,
  },
  socialButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  googleButtonText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '600',
  },
  facebookButton: {
    backgroundColor: '#1877f2',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  socialButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emailButton: {
    backgroundColor: '#2563eb',
  },
  emailButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#64748b',
    fontSize: 14,
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
}); 