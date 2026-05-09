import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/supabase';
import AuthScreen from './src/components/AuthScreen';
import TimerScreen from './src/components/TimerScreen';
import QuotesScreen from './src/components/QuotesScreen';
import GenerateScreen from './src/components/GenerateScreen';
import AudioPlayer from './src/AudioPlayer';

const ORANGE = '#FF6B00';
const BG = '#0a0a0a';
const BORDER = '#1e1e1e';
const DIM = '#555555';

type Tab = 'timer' | 'quotes' | 'generate';

export default function App() {
  const [tab, setTab] = useState<Tab>('timer');
  const [audioReady, setAudioReady] = useState(false);
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    AudioPlayer.init().then(() => setAudioReady(true));
    return () => { AudioPlayer.unload(); };
  }, []);

  // Still loading session
  if (session === undefined) return <View style={styles.root} />;

  // Not signed in
  if (!session) return <AuthScreen />;

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        {tab === 'timer'    && <TimerScreen audioReady={audioReady} />}
        {tab === 'quotes'   && <QuotesScreen audioReady={audioReady} />}
        {tab === 'generate' && <GenerateScreen audioReady={audioReady} />}
      </View>

      <View style={styles.tabBar}>
        {([
          { key: 'timer',    icon: '⏱', label: 'TIMER' },
          { key: 'quotes',   icon: '💬', label: 'QUOTES' },
          { key: 'generate', icon: '⚡', label: 'GENERATE' },
        ] as { key: Tab; icon: string; label: string }[]).map(({ key, icon, label }) => (
          <TouchableOpacity key={key} style={styles.tab} onPress={() => setTab(key)}>
            <Text style={styles.tabIcon}>{icon}</Text>
            <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  screen: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: BORDER,
    backgroundColor: BG,
    paddingBottom: 28, paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: DIM },
  tabLabelActive: { color: ORANGE },
});
