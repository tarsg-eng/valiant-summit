import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

const AUDIO_SOURCES = [
  require('../assets/audio/quote_01.mp3'),
  require('../assets/audio/quote_02.mp3'),
  require('../assets/audio/quote_03.mp3'),
  require('../assets/audio/quote_04.mp3'),
  require('../assets/audio/quote_05.mp3'),
  require('../assets/audio/quote_06.mp3'),
  require('../assets/audio/quote_07.mp3'),
  require('../assets/audio/quote_08.mp3'),
  require('../assets/audio/quote_09.mp3'),
  require('../assets/audio/quote_10.mp3'),
  require('../assets/audio/quote_11.mp3'),
  require('../assets/audio/quote_12.mp3'),
  require('../assets/audio/quote_13.mp3'),
  require('../assets/audio/quote_14.mp3'),
  require('../assets/audio/quote_15.mp3'),
  require('../assets/audio/quote_16.mp3'),
  require('../assets/audio/quote_17.mp3'),
  require('../assets/audio/quote_18.mp3'),
  require('../assets/audio/quote_19.mp3'),
  require('../assets/audio/quote_20.mp3'),
  require('../assets/audio/quote_21.mp3'),
];

const ACTIVE_MODE = {
  playsInSilentModeIOS: true,
  staysActiveInBackground: true,
  interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
  interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
  shouldDuckAndroid: false,
};

class AudioPlayer {
  private sounds: Audio.Sound[] = [];
  private initialized = false;

  async init(): Promise<void> {
    await Audio.setAudioModeAsync(ACTIVE_MODE);

    const loads = AUDIO_SOURCES.map(async (source) => {
      const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
      return sound;
    });
    this.sounds = await Promise.all(loads);
    this.initialized = true;
  }

  async playByIndex(index: number, onDone?: () => void): Promise<void> {
    if (!this.initialized || index < 0 || index >= this.sounds.length) return;
    const sound = this.sounds[index];

    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.setOnPlaybackStatusUpdate(null);
        // Release the audio session so iOS immediately restores other apps' volume
        await Audio.setAudioModeAsync({ ...ACTIVE_MODE, staysActiveInBackground: false });
        await Audio.setAudioModeAsync(ACTIVE_MODE);
        onDone?.();
      }
    });

    await sound.setPositionAsync(0);
    await sound.playAsync();
  }

  async playRandom(): Promise<void> {
    if (!this.initialized || this.sounds.length === 0) return;
    await this.playByIndex(Math.floor(Math.random() * this.sounds.length));
  }

  async unload(): Promise<void> {
    await Promise.all(this.sounds.map((s) => s.unloadAsync()));
    this.sounds = [];
    this.initialized = false;
  }
}

export default new AudioPlayer();
