import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableWithoutFeedback,
  SafeAreaView,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Button, Input } from 'react-native-elements';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../services/auth-context';
import { DarkTheme } from '../constants/theme';

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
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 px-6 py-8 justify-center">
            {/* Header Section */}
            <View className="items-center mb-12">
              <View 
                className="w-20 h-20 rounded-full items-center justify-center mb-6"
                style={{ backgroundColor: DarkTheme.colors.bangkok.gold }}
              >
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
                Sign in to your account
              </Text>
            </View>

            {/* Form Section */}
            <View 
              className="p-6 rounded-2xl mb-8"
              style={{ 
                backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
                ...DarkTheme.shadows.medium 
              }}
            >
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
                title={loading ? 'Signing In...' : 'Sign In'}
                loading={loading}
                disabled={loading}
                icon={
                  !loading ? (
                    <Icon 
                      name="login" 
                      size={20} 
                      color={DarkTheme.colors.system.white}
                      style={{ marginRight: DarkTheme.spacing.sm }}
                    />
                  ) : undefined
                }
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
            <View className="items-center">
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

            {/* Bangkok Branding */}
            <View className="items-center mt-12">
              <View className="flex-row items-center">
                <Text style={DarkTheme.typography.caption1}>🏛️</Text>
                <Text 
                  style={[
                    DarkTheme.typography.caption1,
                    { 
                      color: DarkTheme.colors.bangkok.gold,
                      marginHorizontal: DarkTheme.spacing.xs 
                    }
                  ]}
                >
                  Discover Bangkok's Hidden Gems
                </Text>
                <Text style={DarkTheme.typography.caption1}>🍜</Text>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 