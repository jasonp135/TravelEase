import axios from "axios";

const API_KEY = ""; // Replace with your Eleven Labs API key
const BASE_URL = "https://api.elevenlabs.io/v1";

// Voice IDs map for easier reference
const VOICE_IDS = {
  Alice: "21m00Tcm4TlvDq8ikWAM", // Alice voice
  Josh: "TxGEqnHWrfWFTfGW9XjX",  // Josh voice
  Arnold: "VR6AewLTigWG4xSOukaG", // Arnold voice
  Bella: "EXAVITQu4vr4xnSDxMaL"  // Bella voice
};

export const generateSpeech = async (text: string, voiceName: string = "Alice") => {
  try {
    // Get the voice ID from the map or use the provided name as ID if not found
    const voiceId = VOICE_IDS[voiceName] || voiceName;
    
    console.log(`Using voice ID: ${voiceId} for voice name: ${voiceName}`);
    
    // Correct URL format for Eleven Labs API
    const url = `${BASE_URL}/text-to-speech/${voiceId}`;
    console.log(`Sending request to: ${url}`);
    
    // Limit text length to avoid API issues
    const trimmedText = text.length > 300 ? text.substring(0, 300) + "..." : text;
    
    const response = await axios({
      method: 'post',
      url: url,
      data: {
        text: trimmedText,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
        },
      },
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY,
      },
      responseType: "arraybuffer",
      timeout: 15000, // 15 second timeout
    });

    console.log("Speech generation successful, response status:", response.status);
    return response.data; // Return audio data
  } catch (error) {
    console.error("Error generating speech:", error);
    if (error.response) {
      console.error("Response status:", error.response.status);
      try {
        // Only try to convert to string if it's not binary data
        if (typeof error.response.data === 'string') {
          console.error("Response data:", error.response.data);
        }
      } catch (e) {
        console.error("Could not parse response data");
      }
    }
    throw new Error("Failed to generate speech");
  }
};