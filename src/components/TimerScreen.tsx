import React, { useState, useCallback } from 'react';
import { BUILD_ID } from '../buildId';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import Svg, { Circle } from 'react-native-svg';
import AudioPlayer from '../AudioPlayer';
import TimerManager from '../TimerManager';

const ORANGE = '#FF6B00';
const BG = '#0a0a0a';
const GRAY = '#2a2a2a';
const TEXT = '#ffffff';
const DIM = '#888888';

const DURATIONS = [15, 20, 25, 30, 45];

type IntervalPreset = { label: string; min: number; max: number };
const INTERVAL_PRESETS: IntervalPreset[] = [
  { label: '30s',   min: 30,  max: 30  },
  { label: '1m',    min: 60,  max: 60  },
  { label: '2–3m',  min: 120, max: 180 },
  { label: '5m',    min: 300, max: 300 },
  { label: 'custom', min: -1, max: -1  },
];
const DEFAULT_PRESET = INTERVAL_PRESETS[2]; // 2–3m

const { width } = Dimensions.get('window');
const RING_SIZE = width * 0.72;
const STROKE = 12;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function intervalHint(min: number, max: number): string {
  if (min === max) return `Every ${min}s`;
  const fmt = (s: number) => s >= 60 ? `${s / 60}m` : `${s}s`;
  return `Every ${fmt(min)}–${fmt(max)}`;
}

export default function TimerScreen({ audioReady }: { audioReady: boolean }) {
  const [running, setRunning] = useState(false);
  const [duration, setDuration] = useState(25);
  const [elapsed, setElapsed] = useState(0);
  const [nextQuoteIn, setNextQuoteIn] = useState(0);
  const [flashCount, setFlashCount] = useState(0);
  const [preset, setPreset] = useState<IntervalPreset>(DEFAULT_PRESET);
  const [customSecs, setCustomSecs] = useState('45');

  useKeepAwake();

  const resolvedMin = preset.min === -1 ? (parseInt(customSecs, 10) || 45) : preset.min;
  const resolvedMax = preset.max === -1 ? (parseInt(customSecs, 10) || 45) : preset.max;

  const handleStart = useCallback(() => {
    if (!audioReady) return;
    setElapsed(0);
    setRunning(true);

    TimerManager.onTick = (e, n) => {
      setElapsed(e);
      setNextQuoteIn(n);
    };
    TimerManager.onQuoteFired = () => {
      AudioPlayer.playRandom();
      setFlashCount((c) => c + 1);
    };
    TimerManager.onComplete = () => {
      setRunning(false);
      setElapsed(duration * 60 * 1000);
    };
    TimerManager.start(duration * 60, resolvedMin * 1000, resolvedMax * 1000);
  }, [audioReady, duration, resolvedMin, resolvedMax]);

  const handleStop = useCallback(() => {
    TimerManager.stop();
    setRunning(false);
    setElapsed(0);
    setNextQuoteIn(0);
  }, []);

  const totalMs = duration * 60 * 1000;
  const progress = running ? Math.min(elapsed / totalMs, 1) : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const remaining = Math.max(0, totalMs - elapsed);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Text style={styles.title}>VALIANT SUMMIT</Text>

      {!running && (
        <>
          {/* Duration picker */}
          <View style={styles.pickerRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, duration === d && styles.chipActive]}
                onPress={() => setDuration(d)}
              >
                <Text style={[styles.chipText, duration === d && styles.chipTextActive]}>
                  {d}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Interval picker */}
          <View style={styles.intervalSection}>
            <Text style={styles.sectionLabel}>QUOTES EVERY</Text>
            <View style={styles.pickerRow}>
              {INTERVAL_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.chip, preset.label === p.label && styles.chipActive]}
                  onPress={() => setPreset(p)}
                >
                  <Text style={[styles.chipText, preset.label === p.label && styles.chipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {preset.min === -1 && (
              <View style={styles.customRow}>
                <TextInput
                  style={styles.customInput}
                  value={customSecs}
                  onChangeText={(t) => setCustomSecs(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={4}
                  selectTextOnFocus
                  placeholderTextColor={DIM}
                  placeholder="45"
                />
                <Text style={styles.customUnit}>seconds</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Progress ring */}
      <View style={styles.ringWrapper}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={GRAY}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={ORANGE}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={styles.timeText}>{formatTime(running ? remaining : totalMs)}</Text>
          <Text style={styles.timeLabel}>{running ? 'remaining' : 'duration'}</Text>
        </View>
      </View>

      {/* Next quote countdown */}
      {running && (
        <View style={styles.nextRow}>
          <Text style={styles.nextLabel}>NEXT QUOTE IN</Text>
          <Text style={styles.nextTime}>{formatTime(nextQuoteIn)}</Text>
          {flashCount > 0 && (
            <Text style={styles.quotesFired}>{flashCount} fired</Text>
          )}
        </View>
      )}

      {/* Start / Stop */}
      <TouchableOpacity
        style={[styles.button, !audioReady && styles.buttonDisabled]}
        onPress={running ? handleStop : handleStart}
        disabled={!audioReady}
      >
        <Text style={styles.buttonText}>
          {!audioReady ? 'LOADING…' : running ? 'STOP' : 'START'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.hint}>{intervalHint(resolvedMin, resolvedMax)} over your music</Text>
      <Text style={styles.buildId}>build {BUILD_ID}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  title: {
    color: ORANGE,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 6,
    marginBottom: 20,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  intervalSection: {
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 4,
  },
  sectionLabel: {
    color: DIM,
    fontSize: 10,
    letterSpacing: 4,
    fontWeight: '700',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GRAY,
  },
  chipActive: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  chipText: {
    color: DIM,
    fontWeight: '700',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#000',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customInput: {
    color: TEXT,
    fontSize: 22,
    fontWeight: '300',
    borderBottomWidth: 1,
    borderBottomColor: ORANGE,
    minWidth: 60,
    textAlign: 'center',
    paddingVertical: 2,
  },
  customUnit: {
    color: DIM,
    fontSize: 13,
  },
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  timeText: {
    color: TEXT,
    fontSize: 52,
    fontWeight: '200',
    letterSpacing: 2,
  },
  timeLabel: {
    color: DIM,
    fontSize: 12,
    letterSpacing: 3,
    marginTop: 4,
  },
  nextRow: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 4,
  },
  nextLabel: {
    color: DIM,
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: '700',
  },
  nextTime: {
    color: ORANGE,
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 2,
  },
  quotesFired: {
    color: DIM,
    fontSize: 12,
    marginTop: 2,
  },
  button: {
    backgroundColor: ORANGE,
    paddingHorizontal: 56,
    paddingVertical: 18,
    borderRadius: 50,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: GRAY,
  },
  buttonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 4,
  },
  hint: {
    color: DIM,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  buildId: {
    color: '#333333',
    fontSize: 10,
    marginTop: 8,
    letterSpacing: 2,
  },
});
