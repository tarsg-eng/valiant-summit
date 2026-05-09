import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ActivityIndicator, ScrollView, Alert, Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { supabase } from '../supabase';

const ORANGE = '#FF6B00';
const BG = '#0d0d0d';
const CARD = '#1a1a1a';
const TEXT = '#ffffff';
const DIM = '#888888';
const BORDER = '#2a2a2a';

type Preview = { generatedVoiceId: string; audioBase64: string; duration: number };

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: (voice: { voice_id: string; name: string; description: string }) => void;
};

export default function VoiceDesignModal({ visible, onClose, onSaved }: Props) {
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [voiceName, setVoiceName] = useState('');
  const [saving, setSaving] = useState(false);
  const currentSound = useRef<Audio.Sound | null>(null);

  const reset = () => {
    setDescription('');
    setPreviews([]);
    setSelected(null);
    setVoiceName('');
    setPlayingIdx(null);
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setGenerating(true);
    setPreviews([]);
    setSelected(null);

    const { data, error } = await supabase.functions.invoke('design-voice', {
      body: { description },
    });

    setGenerating(false);
    if (error || !data?.previews) {
      Alert.alert('Error', error?.message ?? 'Failed to generate previews');
      return;
    }
    setPreviews(data.previews);
  };

  const handlePlay = async (idx: number) => {
    if (playingIdx !== null) return;
    const preview = previews[idx];
    setPlayingIdx(idx);

    try {
      // Stop any previous preview sound
      if (currentSound.current) {
        await currentSound.current.unloadAsync();
        currentSound.current = null;
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
      });

      // Write base64 to a temp file
      const path = FileSystem.cacheDirectory + `vs_preview_${idx}.mp3`;
      await FileSystem.writeAsStringAsync(path, preview.audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: path },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 }
      );
      currentSound.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          sound.setOnPlaybackStatusUpdate(null);
          sound.unloadAsync();
          currentSound.current = null;
          setPlayingIdx(null);
        }
      });
    } catch (e: unknown) {
      Alert.alert('Playback error', String(e));
      setPlayingIdx(null);
    }
  };

  const handleSave = async () => {
    if (selected === null || !voiceName.trim()) {
      Alert.alert('Name required', 'Give your voice a name before saving.');
      return;
    }
    setSaving(true);

    const notSelectedIds = previews
      .filter((_, i) => i !== selected)
      .map((p) => p.generatedVoiceId);

    const { data, error } = await supabase.functions.invoke('save-voice', {
      body: {
        generatedVoiceId: previews[selected].generatedVoiceId,
        name: voiceName.trim(),
        description,
        notSelectedIds,
      },
    });

    setSaving(false);
    if (error || !data?.voice) {
      Alert.alert('Error', error?.message ?? 'Failed to save voice');
      return;
    }

    onSaved({ voice_id: data.voice.voice_id, name: voiceName.trim(), description });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>DESIGN A VOICE</Text>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>DESCRIBE THE VOICE</Text>
          <TextInput
            style={styles.input}
            placeholder={'e.g. "Aggressive 50-year-old male coach, deep gravel voice, American, intense"'}
            placeholderTextColor={DIM}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.button, (!description.trim() || generating) && styles.buttonDisabled]}
            onPress={handleGenerate}
            disabled={!description.trim() || generating}
          >
            {generating
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.buttonText}>GENERATE 3 PREVIEWS</Text>
            }
          </TouchableOpacity>

          {previews.length > 0 && (
            <>
              <Text style={styles.label}>PICK YOUR VOICE</Text>
              {previews.map((p, idx) => (
                <TouchableOpacity
                  key={p.generatedVoiceId}
                  style={[styles.previewCard, selected === idx && styles.previewCardSelected]}
                  onPress={() => setSelected(idx)}
                >
                  <View style={styles.previewLeft}>
                    <Text style={[styles.previewNum, selected === idx && styles.previewNumSelected]}>
                      Voice {idx + 1}
                    </Text>
                    <Text style={styles.previewDuration}>{p.duration}s sample</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.playBtn, playingIdx === idx && styles.playBtnActive]}
                    onPress={() => handlePlay(idx)}
                    disabled={playingIdx !== null}
                  >
                    <Text style={styles.playIcon}>{playingIdx === idx ? '▐▐' : '▶'}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}

              {selected !== null && (
                <>
                  <Text style={styles.label}>NAME THIS VOICE</Text>
                  <TextInput
                    style={styles.input}
                    placeholder='e.g. "The Coach"'
                    placeholderTextColor={DIM}
                    value={voiceName}
                    onChangeText={setVoiceName}
                  />
                  <TouchableOpacity
                    style={[styles.button, (!voiceName.trim() || saving) && styles.buttonDisabled]}
                    onPress={handleSave}
                    disabled={!voiceName.trim() || saving}
                  >
                    {saving
                      ? <ActivityIndicator color="#000" />
                      : <Text style={styles.buttonText}>SAVE & USE THIS VOICE</Text>
                    }
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 20 : 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  title: { color: ORANGE, fontSize: 16, fontWeight: '900', letterSpacing: 5 },
  close: { color: DIM, fontSize: 20 },
  scroll: { padding: 20, gap: 12 },
  label: { color: DIM, fontSize: 10, letterSpacing: 4, fontWeight: '700', marginTop: 8 },
  input: {
    backgroundColor: CARD, color: TEXT,
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
  },
  button: {
    backgroundColor: ORANGE, borderRadius: 50,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  buttonDisabled: { backgroundColor: '#2a2a2a' },
  buttonText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 3 },
  previewCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: CARD, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  previewCardSelected: { borderColor: ORANGE, backgroundColor: '#1a0d00' },
  previewLeft: { gap: 2 },
  previewNum: { color: DIM, fontWeight: '700', fontSize: 14 },
  previewNumSelected: { color: ORANGE },
  previewDuration: { color: '#555', fontSize: 11 },
  playBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
  },
  playBtnActive: { backgroundColor: ORANGE },
  playIcon: { color: ORANGE, fontSize: 12 },
});
