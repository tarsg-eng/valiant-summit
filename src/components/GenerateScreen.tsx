import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Platform, Alert, ScrollView,
} from 'react-native';
import { supabase } from '../supabase';
import AudioPlayer from '../AudioPlayer';
import VoiceDesignModal from './VoiceDesignModal';

const ORANGE = '#FF6B00';
const BG = '#0a0a0a';
const CARD = '#141414';
const TEXT = '#ffffff';
const DIM = '#888888';
const BORDER = '#222222';

const PRESET_VOICES = [
  { id: 'SOYHLrjzK2X1ezoPC6cr', name: 'Harry',   desc: 'Fierce Warrior' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie',  desc: 'Deep & Energetic' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian',    desc: 'Deep & Resonant' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel',   desc: 'Broadcaster' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',     desc: 'Dominant & Firm' },
];

type Voice = { id: string; name: string; desc: string };
type Quote = { id: string; text: string; voice_name: string; audio_url: string; created_at: string };

export default function GenerateScreen({ audioReady }: { audioReady: boolean }) {
  const [voices, setVoices] = useState<Voice[]>(PRESET_VOICES);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(PRESET_VOICES[0]);
  const [generating, setGenerating] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [designModalVisible, setDesignModalVisible] = useState(false);

  const loadCustomVoices = useCallback(async () => {
    const { data } = await supabase
      .from('custom_voices')
      .select('voice_id, name, description')
      .order('created_at', { ascending: false });
    if (data?.length) {
      const custom = data.map((v) => ({ id: v.voice_id, name: v.name, desc: v.description.slice(0, 24) + '…' }));
      setVoices([...PRESET_VOICES, ...custom]);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from('quotes')
      .select('id, text, voice_name, audio_url, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    setQuotes(data ?? []);
    setLoadingHistory(false);
  }, []);

  useEffect(() => {
    loadCustomVoices();
    loadHistory();
  }, [loadCustomVoices, loadHistory]);

  const handleGenerate = async () => {
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke('generate-quote', {
      body: { voiceId: selectedVoice.id, voiceName: selectedVoice.name },
    });
    setGenerating(false);
    if (error || !data?.quote) {
      Alert.alert('Error', error?.message ?? 'Generation failed');
      return;
    }
    const newQuote: Quote = data.quote;
    setQuotes((prev) => [newQuote, ...prev]);
    handlePlay(newQuote);
  };

  const handlePlay = async (quote: Quote) => {
    if (playingId) return;
    setPlayingId(quote.id);
    await AudioPlayer.playUrl(quote.audio_url, () => setPlayingId(null));
  };

  const handleVoiceSaved = (voice: { voice_id: string; name: string; description: string }) => {
    const newVoice: Voice = { id: voice.voice_id, name: voice.name, desc: voice.description.slice(0, 24) + '…' };
    setVoices((prev) => [...prev, newVoice]);
    setSelectedVoice(newVoice);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GENERATE</Text>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Voice picker */}
        <Text style={styles.sectionLabel}>CHOOSE VOICE</Text>
        <View style={styles.voiceRow}>
          {voices.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[styles.voiceChip, selectedVoice.id === v.id && styles.voiceChipActive]}
              onPress={() => setSelectedVoice(v)}
            >
              <Text style={[styles.voiceName, selectedVoice.id === v.id && styles.voiceNameActive]}>
                {v.name}
              </Text>
              <Text style={[styles.voiceDesc, selectedVoice.id === v.id && styles.voiceDescActive]}>
                {v.desc}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Design a voice button */}
          <TouchableOpacity
            style={styles.designChip}
            onPress={() => setDesignModalVisible(true)}
          >
            <Text style={styles.designChipText}>+ Design</Text>
            <Text style={styles.voiceDesc}>AI voice lab</Text>
          </TouchableOpacity>
        </View>

        {/* Generate button */}
        <TouchableOpacity
          style={[styles.genButton, (generating || !audioReady) && styles.genButtonDisabled]}
          onPress={handleGenerate}
          disabled={generating || !audioReady}
        >
          {generating
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.genButtonText}>⚡ GENERATE</Text>
          }
        </TouchableOpacity>

        {/* History */}
        <Text style={styles.sectionLabel}>YOUR QUOTES</Text>
        {loadingHistory ? (
          <ActivityIndicator color={ORANGE} style={{ marginTop: 20 }} />
        ) : quotes.length === 0 ? (
          <Text style={styles.empty}>No quotes yet — hit Generate.</Text>
        ) : (
          quotes.map((item) => (
            <View key={item.id}>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.quoteText}>{item.text}</Text>
                  <Text style={styles.voiceMeta}>{item.voice_name}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.playBtn, playingId === item.id && styles.playBtnActive]}
                  onPress={() => handlePlay(item)}
                  disabled={playingId !== null || !audioReady}
                >
                  <Text style={styles.playIcon}>{playingId === item.id ? '▐▐' : '▶'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.separator} />
            </View>
          ))
        )}
      </ScrollView>

      <VoiceDesignModal
        visible={designModalVisible}
        onClose={() => setDesignModalVisible(false)}
        onSaved={handleVoiceSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  title: { color: ORANGE, fontSize: 18, fontWeight: '900', letterSpacing: 6, textAlign: 'center', marginBottom: 8 },
  scroll: { padding: 16, gap: 12 },
  sectionLabel: { color: DIM, fontSize: 10, letterSpacing: 4, fontWeight: '700', marginTop: 8 },
  voiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  voiceChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a2a', backgroundColor: CARD },
  voiceChipActive: { borderColor: ORANGE, backgroundColor: '#1a0d00' },
  voiceName: { color: DIM, fontWeight: '700', fontSize: 13 },
  voiceNameActive: { color: ORANGE },
  voiceDesc: { color: '#444', fontSize: 10, marginTop: 2 },
  voiceDescActive: { color: '#cc5500' },
  designChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: ORANGE, borderStyle: 'dashed', backgroundColor: CARD },
  designChipText: { color: ORANGE, fontWeight: '700', fontSize: 13 },
  genButton: { backgroundColor: ORANGE, borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  genButtonDisabled: { backgroundColor: '#2a2a2a' },
  genButtonText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 3 },
  empty: { color: DIM, textAlign: 'center', marginTop: 20, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, backgroundColor: CARD, gap: 10 },
  separator: { height: 1, backgroundColor: BORDER },
  rowText: { flex: 1 },
  quoteText: { color: TEXT, fontSize: 13, lineHeight: 18 },
  voiceMeta: { color: DIM, fontSize: 10, marginTop: 4, letterSpacing: 1 },
  playBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  playBtnActive: { backgroundColor: ORANGE },
  playIcon: { color: ORANGE, fontSize: 12 },
});
