import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { supabase } from '../supabase';

const ORANGE = '#FF6B00';
const BG = '#0a0a0a';
const CARD = '#141414';
const TEXT = '#ffffff';
const DIM = '#888888';
const BORDER = '#2a2a2a';

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) { setError('Email and password required.'); return; }
    setLoading(true);
    const { error: err } = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) setError(err.message);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>VALIANT SUMMIT</Text>
      <Text style={styles.subtitle}>
        {mode === 'signin' ? 'Sign in to continue' : 'Create your account'}
      </Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={DIM}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={DIM}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.buttonText}>
                {mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); }}>
          <Text style={styles.toggle}>
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: BG,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    color: ORANGE, fontSize: 22, fontWeight: '900',
    letterSpacing: 6, marginBottom: 8,
  },
  subtitle: {
    color: DIM, fontSize: 13, marginBottom: 40, letterSpacing: 1,
  },
  form: { width: '100%', gap: 12 },
  input: {
    backgroundColor: CARD, color: TEXT,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15,
  },
  error: { color: '#ff4444', fontSize: 13, textAlign: 'center' },
  button: {
    backgroundColor: ORANGE, borderRadius: 50,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  buttonText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 3 },
  toggle: { color: DIM, fontSize: 13, textAlign: 'center', marginTop: 8 },
});
