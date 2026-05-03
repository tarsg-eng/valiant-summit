import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

const QUOTE_COUNT = 20;

class AudioPlayer {
  private sounds: Audio.Sound[] = [];
  private initialized = false;

  async init(): Promise<void> {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
    });

    const loads: Promise<void>[] = [];
    for (let i = 1; i <= QUOTE_COUNT; i++) {
      const num = String(i).padStart(2, '0');
      loads.push(
        Audio.Sound.createAsync(
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          { uri: `asset:/audio/quote_${num}.mp3` },
          { shouldPlay: false }
        ).then(({ sound }) => {
          this.sounds.push(sound);
        })
      );
    }
    await Promise.all(loads);
    this.initialized = true;
  }

  async playRandom(): Promise<void> {
    if (!this.initialized || this.sounds.length === 0) return;
    const sound = this.sounds[Math.floor(Math.random() * this.sounds.length)];
    await sound.setPositionAsync(0);
    await sound.playAsync();
  }

  async unload(): Promise<void> {
    await Promise.all(this.sounds.map((s) => s.unloadAsync()));
    this.sounds = [];
    this.initialized = false;
  }
}

export default new AudioPlayer();
