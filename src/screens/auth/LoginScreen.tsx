import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableWithoutFeedback,
  SafeAreaView,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet
} from 'react-native';
import { Button, Input } from 'react-native-elements';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../services/auth-context';
import { DarkTheme } from '../../constants/theme';

export default function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            {/* Header Section */}
            <View style={styles.headerSection}>
              <View style={styles.iconContainer}>
                <Icon 
                  name="location-on" 
                  size={40} 
                  color={DarkTheme.colors.system.black} 
                />
              </View>
              
              <Text 
                style={[
                  DarkTheme.typography.largeTitle,
                  { textAlign: 'center', marginBottom: DarkTheme.spacing.xs }
                ]}
              >
                Placemarks
              </Text>
              
              <Text 
                style={[
                  DarkTheme.typography.headline,
                  { 
                    color: DarkTheme.colors.semantic.secondaryLabel,
                    textAlign: 'center' 
                  }
                ]}
              >
                Log in or sign up
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <Input
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={
                  <Icon 
                    name="email" 
                    size={20} 
                    color={DarkTheme.colors.semantic.placeholderText} 
                  />
                }
                inputStyle={[
                  DarkTheme.componentStyles.Input.inputStyle,
                  { marginLeft: DarkTheme.spacing.sm }
                ]}
                inputContainerStyle={[
                  DarkTheme.componentStyles.Input.inputContainerStyle,
                  { borderBottomWidth: 0 }
                ]}
                placeholderTextColor={DarkTheme.colors.semantic.placeholderText}
                containerStyle={{ paddingHorizontal: 0 }}
              />
              
              <Input
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                leftIcon={
                  <Icon 
                    name="lock" 
                    size={20} 
                    color={DarkTheme.colors.semantic.placeholderText} 
                  />
                }
                rightIcon={
                  <Icon 
                    name={showPassword ? "visibility-off" : "visibility"} 
                    size={20} 
                    color={DarkTheme.colors.semantic.placeholderText}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                inputStyle={[
                  DarkTheme.componentStyles.Input.inputStyle,
                  { marginLeft: DarkTheme.spacing.sm, marginRight: DarkTheme.spacing.sm }
                ]}
                inputContainerStyle={[
                  DarkTheme.componentStyles.Input.inputContainerStyle,
                  { borderBottomWidth: 0 }
                ]}
                placeholderTextColor={DarkTheme.colors.semantic.placeholderText}
                containerStyle={{ paddingHorizontal: 0 }}
              />

              <Button
                title={loading ? 'Signing In...' : 'Continue'}
                loading={loading}
                disabled={loading}
                buttonStyle={[
                  DarkTheme.componentStyles.Button.buttonStyle,
                  { 
                    backgroundColor: DarkTheme.colors.accent.blue,
                    marginTop: DarkTheme.spacing.md,
                  }
                ]}
                titleStyle={DarkTheme.componentStyles.Button.titleStyle}
                onPress={handleSignIn}
              />
            </View>

            {/* Sign Up Link */}
            <View style={styles.signUpSection}>
              <Text 
                style={[
                  DarkTheme.typography.callout,
                  { color: DarkTheme.colors.semantic.secondaryLabel }
                ]}
              >
                Don't have an account?{' '}
                <Text 
                  style={[
                    DarkTheme.typography.callout,
                    { 
                      color: DarkTheme.colors.accent.blue,
                      fontWeight: '600' 
                    }
                  ]}
                  onPress={() => navigation.navigate('SignUp' as never)}
                >
                  Sign Up
                </Text>
              </Text>
            </View>

          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DarkTheme.colors.system.black,
  },
  keyboardView: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: DarkTheme.colors.bangkok.gold,
  },
  formSection: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 32,
    backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
    ...DarkTheme.shadows.medium,
  },
  signUpSection: {
    alignItems: 'center',
  },
}); 