import { Audio } from "expo-av";
import { Alert } from "react-native";

export const playAudio = async (audioBuffer: ArrayBuffer) => {
  try {
    // First, ensure Audio is initialized
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    
    console.log("Creating audio from buffer, size:", audioBuffer.byteLength);
    
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      throw new Error("Empty audio buffer received");
    }
    
    // Create a base64 string from the audio buffer
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    console.log("Base64 audio length:", base64Audio.length);
    
    // Create a temporary file URI for the audio
    const uri = `data:audio/mpeg;base64,${base64Audio}`;
    console.log("Audio URI created");
    
    // Load the sound
    console.log("Loading sound...");
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false, volume: 1.0, progressUpdateIntervalMillis: 100 }
    );
    
    // Set up status monitoring
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        if (status.isPlaying) {
          console.log("Audio is playing");
        }
        if (status.didJustFinish) {
          console.log("Audio playback finished");
          sound.unloadAsync();
        }
      } else if (status.error) {
        console.error("Playback error:", status.error);
      }
    });
    
    // Play the sound
    console.log("Playing audio...");
    await sound.playAsync();
    
    return sound;
  } catch (error) {
    console.error("Error playing audio:", error);
    Alert.alert("Audio Error", "Failed to play audio response");
    throw error;
  }
};