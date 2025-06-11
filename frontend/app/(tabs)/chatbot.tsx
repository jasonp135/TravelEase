import React, { useState, useEffect, useRef } from "react";
import Voice from "@react-native-community/voice";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  GestureResponderEvent,
  RefreshControl,
  ScrollView,
  Button,
  ImageBackground,
  Alert,
  ActivityIndicator,
} from "react-native";
// import LoadingOverlay from "../LoadingOverlay";
import useLoadingState from "../useLoadingState";
import { Ionicons } from "@expo/vector-icons";
import { generateSpeech } from "../Soundout";
import { playAudio } from "../playAudio";
import axios from "axios";
import { Audio } from "expo-av";

type Message = {
  id: string;
  text: string;
  sender: "user" | "bot";
};

const chatbot: React.FC = () => {
  // const [messages, setMessages] = useState<Message[]>([
  //     { id: "1", text: "Hi there! How can I assist you today?", sender: "bot" },
  // ]);
  const [input, setInput] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false); // Tracks whether it's in voice mode or keyboard mode
  const [isRecording, setIsRecording] = useState(false); // Tracks if voice is being recorded
  const [voiceAvailable, setVoiceAvailable] = useState(true); // Tracks if voice recognition is available
  const [refreshing, setRefreshing] = useState(false);
  const { isError, errorMessage, startLoading, setError, reset } =
    useLoadingState();

  // Load initial data and initialize audio
  useEffect(() => {
    loadMessages();
    
    // Initialize audio system
    const setupAudio = async () => {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: true,
        });
        console.log("Audio system initialized");
      } catch (error) {
        console.error("Error initializing audio:", error);
      }
    };
    
    setupAudio();
    
    // Set up Voice recognition
    const setupVoiceRecognition = async () => {
      try {
        console.log("Setting up voice recognition...");
        
        // Set up event handlers
        Voice.onSpeechStart = () => {
          console.log("Speech started");
        };
        
        Voice.onSpeechEnd = () => {
          console.log("Speech ended");
          setIsRecording(false);
        };
        
        Voice.onSpeechResults = (e) => {
          console.log("Speech results:", e.value);
          if (e.value && e.value[0]) {
            setInput(e.value[0]);
          }
        };
        
        Voice.onSpeechPartialResults = (e) => {
          console.log("Partial results:", e.value);
          if (e.value && e.value[0]) {
            setInput(e.value[0]);
          }
        };
        
        Voice.onSpeechError = (e) => {
          console.error("Speech error:", e);
          setIsRecording(false);
        };
        
        // Check if voice recognition is available
        setVoiceAvailable(true);
        console.log("Voice recognition initialized successfully");
      } catch (error) {
        console.error("Error setting up voice recognition:", error);
        setVoiceAvailable(false);
      }
    };
    
    setupVoiceRecognition();
    
    // Cleanup
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // Load messages function
  const loadMessages = async () => {
    try {
      startLoading();
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      reset();
    } catch (error) {
      setError("Failed to load messages");
    }
  };

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Simulate refreshing data
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // setMessages([
      //     { id: "1", text: "Hi there! How can I assist you today?", sender: "bot" },
      // ]);
      setRefreshing(false);
    } catch (error) {
      setRefreshing(false);
      setError("Failed to refresh");
    }
  };

  // Handle sending a message
  const handleSend = () => {
    if (input.trim() === "") return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Simulate loading state for response
    startLoading();

    setTimeout(() => {
      const botMessage: Message = {
        id: Date.now().toString(),
        text: "Thank you for your message! Let me help you with that.",
        sender: "bot",
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
      reset();
    }, 1000);

    setInput("");
  };

  // Handle voice recording
  const startVoiceRecording = async () => {
    try {
      // Clear previous input before starting new recording
      setInput("");
      console.log("Starting voice recording...");
      await Voice.start('en-US');
      setIsRecording(true);
    } catch (e) {
      console.error("Error starting voice recording:", e);
      Alert.alert("Voice Error", "Could not start voice recording");
      setIsRecording(false);
    }
  };
  
  const stopVoiceRecording = async () => {
    try {
      console.log("Stopping voice recording...");
      await Voice.stop();
      setIsRecording(false);
      
      // Wait a moment for final results to process
      console.log("Waiting for final speech results...");
      setTimeout(() => {
        console.log("Current input after voice stop:", input);
        if (input && input.trim()) {
          console.log("Sending voice message:", input);
          sendMessage();
        } else {
          console.log("No voice input detected");
        }
      }, 1500);
    } catch (e) {
      console.error("Error stopping voice recording:", e);
      setIsRecording(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === "user";
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.botMessage,
        ]}
      >
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  const [messages, setMessages] = useState([]);
  const scrollViewRef = useRef(null);

  const sendMessage = async () => {
    if (!input.trim()) {
      console.log("Empty input, not sending message");
      return;
    }

    console.log("Sending message:", input);
    const userInput = input.trim(); // Store the current input
    const userMessage = { role: "user", content: userInput };
    const thinkingMessage = { role: "bot", content: "⏳ I'm thinking..." };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setInput(""); // Clear the input field

    try {
      // Get response from AI
      const res = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "mistralai/mistral-7b-instruct",
          messages: [{ role: "user", content: "You are a helpful assistant. Your primary role is to: - Answer questions related to Hong Kong, such as its culture, history, and major attractions. - Help users create detailed and personalized travel plans for Hong Kong, including itinerary suggestions, transportation options, and recommended activities When creating a travel plan, follow this example format: Example: Day 1: - Morning: Visit Victoria Peak for a panoramic view of Hong Kong. Take the Peak Tram for a scenic ride. - Afternoon: Explore Central District. Have lunch at a local dim sum restaurant. - Evening: Walk along Tsim Sha Tsui Promenade and enjoy the Symphony of Lights show. Day 2: - Morning: Visit Lantau Island to see the Big Buddha and Ngong Ping 360 Cable Car. - Afternoon: Explore Tai O Fishing Village and try local snacks. - Evening: Return to the city and enjoy shopping at Temple Street Night Market. -Day 3...ect - Provide practical advice such as the best times to visit specific locations, local etiquette, and food recommendations. - Offer alternative plans in case of weather changes or unexpected situations. Always provide accurate, concise, and friendly responses. When you generate travel plans, ensure they are realistic and tailored to the user's preferences (e.g., budget, interests, and time constraints)." }],
        },
        {
          headers: {
            Authorization:
              "Bearer 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",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
          },
        }
      );

      const botReply = res.data.choices?.[0]?.message?.content || "No reply";

      // Update messages with bot's response
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "bot", content: botReply };
        return updated;
      });

      try {
        // Generate and play speech for the bot's response
        console.log("Generating speech for:", botReply.substring(0, 50) + "...");
        
        // Show a small indicator that audio is being prepared
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { 
            role: "bot", 
            content: botReply + "\n\n🔊 Preparing audio..." 
          };
          return updated;
        });
        
        const audioBuffer = await generateSpeech(botReply, "Alice");
        console.log("Audio generated successfully, buffer size:", audioBuffer.byteLength);
        
        // Update message to remove the preparing indicator
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "bot", content: botReply };
          return updated;
        });
        
        console.log("Playing audio now...");
        await playAudio(audioBuffer);
      } catch (audioError) {
        console.error("Error with audio generation or playback:", audioError);
        Alert.alert(
          "Audio Error", 
          "Failed to generate or play audio response. Please check your internet connection."
        );
      }
    } 
    catch (error) {
      console.error("Error generating response:", error);

      // Handle errors gracefully
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "bot",
          content: "Sorry, I encountered an error generating a response.",
        };
        return updated;
      });
    }
  };

  return (
    <>
      {/* Header */}
      <ImageBackground
        source={{
          uri: "https://images.ctfassets.net/bth3mlrehms2/2qHworX4SxuqmcIVQ0BQhx/2bf600001f20beb5a584cf9fbdf49a18/China_Hong_Kong_Skyline.jpg",
        }}
        style={styles.hero}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Chat with Assistant</Text>
          <Text style={styles.heroSubtitle}>Let me guild your trip</Text>
        </View>
      </ImageBackground>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Chat Area */}
        <ScrollView style={styles.scroll}>
          {messages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.messageContainer,
                msg.role === "user" ? styles.userMessage : styles.botMessage,
              ]}
            >
              <Text style={styles.messageText}>{msg.content}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          {voiceAvailable && (
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setIsVoiceMode(!isVoiceMode)}
            >
              <Ionicons
                name={isVoiceMode ? "keyboard-outline" : "mic-outline"}
                size={24}
                color="#fe7f2d"
              />
            </TouchableOpacity>
          )}

          {isVoiceMode && voiceAvailable ? (
            <TouchableOpacity
              style={[styles.voiceButton, isRecording && styles.recordingButton]}
              onPressIn={startVoiceRecording}
              onPressOut={stopVoiceRecording}
            >
              {isRecording ? (
                <View style={styles.recordingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.voiceButtonText}>Recording... (Release to stop)</Text>
                </View>
              ) : (
                <Text style={styles.voiceButtonText}>Hold to speak</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TextInput
              style={styles.textInput}
              placeholder="Type your message..."
              placeholderTextColor="#999"
              value={input}
              onChangeText={setInput}
            />
          )}
          
          {(!isVoiceMode || !voiceAvailable) && (
            <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  // chatbot
  container: {
    flex: 1,
    backgroundColor: "white",
    padding: 10,
  },
  scroll: {
    flex: 1,
    marginBottom: 10,
    backgroundColor: "white",
    padding: 20,
  },
  messageContainer: {
    padding: 10,
    borderRadius: 12,
    marginVertical: 5,
    maxWidth: "80%",
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#fe7f2d",
  },
  botMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#e5e7eb",
  },
  messageText: {
    color: "black",
    fontSize: 15,
  },
  inputContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 12,
    alignItems: "center",
    elevation: 2,
  },
  input: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: "#333",
  },
  sendButton: {
    backgroundColor: "#fe7f2d",
    padding: 10,
    borderRadius: 20,
    marginLeft: 8,
  },

  // header
  hero: {
    height: 400,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    zIndex: 1,
  },
  heroContent: {
    zIndex: 2,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontSize: 56,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 18,
    color: "#f1f5f9",
    textAlign: "center",
    maxWidth: 600,
  },
  backBtn: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fe7f2d",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 20,
    backdropFilter: "blur(4px)",
    gap: 6,
  },
  backText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  container1: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 0,
    margin: 0,
  },
  // end header

  header: {
    // marginTop: 50,
    flexDirection: "column",
    padding: 16,
    backgroundColor: "#fe7f2d",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 2,
    marginBottom: 8,
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: "#f9f9f9",
  },

  toggleButton: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#eaeaea",
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    color: "#333",
  },
  voiceButton: {
    flex: 1,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fe7f2d",
    borderRadius: 20,
    marginRight: 8,
  },
  recordingButton: {
    backgroundColor: "#e74c3c",
  },
  recordingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  voiceButtonText: {
    color: "white",
    fontSize: 14,
  },
});

export default chatbot;
