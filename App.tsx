import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import TimerScreen from './src/components/TimerScreen';
import QuotesScreen from './src/components/QuotesScreen';
import AudioPlayer from './src/AudioPlayer';

const ORANGE = '#FF6B00';
const BG = '#0a0a0a';
const BORDER = '#1e1e1e';
const DIM = '#555555';

type Tab = 'timer' | 'quotes';

export default function App() {
  const [tab, setTab] = useState<Tab>('timer');
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    AudioPlayer.init().then(() => setAudioReady(true));
    return () => { AudioPlayer.unload(); };
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        {tab === 'timer' ? (
          <TimerScreen audioReady={audioReady} />
        ) : (
          <QuotesScreen audioReady={audioReady} />
        )}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('timer')}>
          <Text style={styles.tabIcon}>⏱</Text>
          <Text style={[styles.tabLabel, tab === 'timer' && styles.tabLabelActive]}>
            TIMER
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('quotes')}>
          <Text style={styles.tabIcon}>💬</Text>
          <Text style={[styles.tabLabel, tab === 'quotes' && styles.tabLabelActive]}>
            QUOTES
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  screen: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: BG,
    paddingBottom: 28,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabIcon: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: DIM,
  },
  tabLabelActive: {
    color: ORANGE,
  },
});
