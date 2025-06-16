import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/services/auth-context';
import Navigation from './src/components/Navigation';
import './global.css';

export default function App() {
  return (
    <AuthProvider>
      <Navigation />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
