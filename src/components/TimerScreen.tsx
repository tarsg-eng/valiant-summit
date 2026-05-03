import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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

export default function TimerScreen({ audioReady }: { audioReady: boolean }) {
  const [running, setRunning] = useState(false);
  const [duration, setDuration] = useState(25);
  const [elapsed, setElapsed] = useState(0);
  const [nextQuoteIn, setNextQuoteIn] = useState(0);
  const [flashCount, setFlashCount] = useState(0);

  useKeepAwake();

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
    TimerManager.start(duration * 60);
  }, [audioReady, duration]);

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

      {/* Duration picker */}
      {!running && (
        <View style={styles.durationRow}>
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

      <Text style={styles.hint}>Quotes fire every 2–3 min over your music</Text>
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
    marginBottom: 28,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
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
    fontSize: 14,
  },
  chipTextActive: {
    color: '#000',
  },
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
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
    marginBottom: 36,
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
    marginBottom: 20,
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
});
