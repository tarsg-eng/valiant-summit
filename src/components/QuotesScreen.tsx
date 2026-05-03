import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import AudioPlayer from '../AudioPlayer';

const ORANGE = '#FF6B00';
const BG = '#0a0a0a';
const CARD = '#141414';
const TEXT = '#ffffff';
const DIM = '#888888';
const BORDER = '#222222';

const quotes: string[] = require('../../assets/quotes.json');

export default function QuotesScreen({ audioReady }: { audioReady: boolean }) {
  const [playing, setPlaying] = useState<number | null>(null);

  const handlePlay = async (index: number) => {
    if (playing !== null) return;
    setPlaying(index);
    await AudioPlayer.playByIndex(index, () => setPlaying(null));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.title}>THE QUOTES</Text>
      <FlatList
        data={quotes}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
            <Text style={styles.quote}>{item}</Text>
            <TouchableOpacity
              style={[styles.playBtn, playing === index && styles.playBtnActive]}
              onPress={() => handlePlay(index)}
              disabled={!audioReady || playing !== null}
            >
              <Text style={styles.playIcon}>
                {playing === index ? '▐▐' : '▶'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  title: {
    color: ORANGE,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 20,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  separator: {
    height: 1,
    backgroundColor: BORDER,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: CARD,
    paddingHorizontal: 12,
    gap: 10,
  },
  number: {
    color: ORANGE,
    fontSize: 12,
    fontWeight: '700',
    width: 24,
    letterSpacing: 1,
  },
  quote: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnActive: {
    backgroundColor: ORANGE,
  },
  playIcon: {
    color: ORANGE,
    fontSize: 12,
  },
});
