import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaTimes, FaRobot, FaPaperPlane, FaVolumeUp } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * ChatGPT-Style Voice Assistant
 * Features:
 * - Conversational AI (ask questions, get immediate answers)
 * - Voice input and text-to-speech output
 * - Chat history
 * - Can also fill trip planning form
 * - Multi-language voice support (Hindi, Spanish, French, etc.)
 */
function VoiceAssistant({ darkMode, onVoiceCommand }) {
  // States
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant',
      content: "👋 Hi! I'm your AI travel assistant. Ask me anything about travel or say 'plan a trip to Paris' to start planning!",
      timestamp: new Date()
    }
  ]);

  // Refs
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const chatEndRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const networkRetryCountRef = useRef(0);
  const networkRetryTimerRef = useRef(null);
  const fullTranscriptRef = useRef('');
  const isManualStopRef = useRef(false);
  const MAX_NETWORK_RETRIES = 2;
  const SILENCE_TIMEOUT_MS = 3000; // allow a few seconds of pause between phrases before sending

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      initializeSpeechRecognition();
    } else {
      setIsSupported(false);
      console.warn('Speech recognition not supported in this browser');
    }

    // Load voices
    loadVoices();
    
    // Some browsers load voices async
    if (synthRef.current) {
      synthRef.current.onvoiceschanged = loadVoices;
    }

    return () => {
      isManualStopRef.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      clearTimeout(networkRetryTimerRef.current);
    };
  }, []);

  // Load available voices
  const loadVoices = () => {
    if (!synthRef.current) return;

    const voices = synthRef.current.getVoices();
    console.log('🔊 Loading voices... Found:', voices.length);

    if (voices.length > 0) {
      console.log('✅ Voices loaded successfully:', voices.map(v => `${v.name} (${v.lang})`));
      setVoicesLoaded(true);
    } else {
      console.warn('⚠️ No voices available yet, will retry...');
      // Retry after a short delay for browsers that load voices async
      setTimeout(() => {
        const retryVoices = synthRef.current.getVoices();
        if (retryVoices.length > 0) {
          console.log('✅ Voices loaded on retry:', retryVoices.length);
          setVoicesLoaded(true);
        }
      }, 500);
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Initialize speech recognition
  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event) => {
      // A result means the connection to the recognition service is healthy
      networkRetryCountRef.current = 0;

      // Accumulate every finalized chunk so a pause between phrases doesn't
      // drop what was already said; interim text is just for live display.
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          fullTranscriptRef.current = `${fullTranscriptRef.current} ${result[0].transcript}`.trim();
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setCurrentTranscript(`${fullTranscriptRef.current} ${interimTranscript}`.trim());

      // Reset the silence countdown on any speech activity (interim or final)
      // so the user gets a few full seconds of pause before we auto-send.
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const finalMessage = fullTranscriptRef.current.trim();
        if (finalMessage) {
          isManualStopRef.current = true;
          recognitionRef.current?.stop();
          fullTranscriptRef.current = '';
          handleSendMessage(finalMessage, true);
        }
      }, SILENCE_TIMEOUT_MS);
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);

      if (event.error === 'not-allowed') {
        setIsListening(false);
        toast.error('🎤 Microphone access denied. Please enable it in browser settings.');
      } else if (event.error === 'no-speech') {
        // Don't flip isListening here — onend fires right after this and will
        // transparently resume the session if the user's own silence timer
        // (our 3s gap tolerance) hasn't elapsed yet, avoiding a UI flicker.
      } else if (event.error === 'network') {
        // The Web Speech API needs to reach the browser's speech servers.
        // Transient blips are common, so retry a couple of times before
        // bothering the user, then fall back to typing instead of just erroring.
        setIsListening(false);
        if (networkRetryCountRef.current < MAX_NETWORK_RETRIES) {
          networkRetryCountRef.current += 1;
          clearTimeout(networkRetryTimerRef.current);
          networkRetryTimerRef.current = setTimeout(() => {
            try {
              setIsListening(true);
              recognitionRef.current.start();
            } catch (e) {
              // already stopped/started elsewhere - ignore
            }
          }, 600 * networkRetryCountRef.current);
        } else {
          networkRetryCountRef.current = 0;
          toast.warning('🎤 Voice connection is unstable right now — you can type your message instead.');
          setTimeout(() => {
            document.getElementById('voice-text-input')?.focus();
          }, 100);
        }
      }
    };

    recognitionRef.current.onend = () => {
      if (isManualStopRef.current) {
        isManualStopRef.current = false;
        setIsListening(false);
        setCurrentTranscript('');
        return;
      }

      // Some browsers end the recognition session on their own during a pause,
      // even with continuous=true. If our own silence timer hasn't fired yet,
      // the user hasn't actually gone quiet long enough — resume transparently
      // instead of cutting them off, keeping whatever was already transcribed.
      if (silenceTimerRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
          return;
        } catch (e) {
          // already starting/started elsewhere - fall through to stopped state
        }
      }

      setIsListening(false);
      setCurrentTranscript('');
    };
  };

  // Detect language from text
  const detectLanguage = (text) => {
    // Simple language detection based on Unicode ranges
    const hindiRegex = /[\u0900-\u097F]/;
    const arabicRegex = /[\u0600-\u06FF]/;
    const chineseRegex = /[\u4E00-\u9FFF]/;
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF]/;
    const koreanRegex = /[\uAC00-\uD7AF]/;
    const russianRegex = /[\u0400-\u04FF]/;
    
    if (hindiRegex.test(text)) return 'hi-IN';
    if (arabicRegex.test(text)) return 'ar-SA';
    if (chineseRegex.test(text)) return 'zh-CN';
    if (japaneseRegex.test(text)) return 'ja-JP';
    if (koreanRegex.test(text)) return 'ko-KR';
    if (russianRegex.test(text)) return 'ru-RU';
    
    // Check for common words in other languages
    const lowerText = text.toLowerCase();
    if (/\b(hola|gracias|por favor|buenos días)\b/.test(lowerText)) return 'es-ES';
    if (/\b(bonjour|merci|s'il vous plaît)\b/.test(lowerText)) return 'fr-FR';
    if (/\b(hallo|danke|bitte)\b/.test(lowerText)) return 'de-DE';
    if (/\b(ciao|grazie|prego)\b/.test(lowerText)) return 'it-IT';
    if (/\b(olá|obrigado|por favor)\b/.test(lowerText)) return 'pt-BR';
    
    return 'en-US'; // Default to English
  };

  // Get appropriate voice for language
  const getVoiceForLanguage = (langCode) => {
    const voices = synthRef.current.getVoices();
    
    console.log('🔍 Looking for voice with language:', langCode);
    console.log('📋 Available voices:', voices.length);
    
    if (voices.length === 0) {
      console.warn('⚠️ No voices loaded yet');
      return null;
    }
    
    // Try exact match first
    let voice = voices.find(v => v.lang === langCode);
    
    if (voice) {
      console.log('✅ Found exact match:', voice.name, voice.lang);
      return voice;
    }
    
    // Try language code without region (e.g., 'hi' from 'hi-IN')
    const shortLang = langCode.split('-')[0];
    voice = voices.find(v => v.lang.startsWith(shortLang));
    
    if (voice) {
      console.log('✅ Found language match:', voice.name, voice.lang);
      return voice;
    }
    
    // For Hindi specifically, try common Hindi voice names
    if (shortLang === 'hi') {
      voice = voices.find(v => 
        v.name.toLowerCase().includes('hindi') || 
        v.lang.includes('hi')
      );
      if (voice) {
        console.log('✅ Found Hindi voice by name:', voice.name, voice.lang);
        return voice;
      }
    }
    
    // Fallback to English
    voice = voices.find(v => v.lang.startsWith('en'));
    
    if (voice) {
      console.log('⚠️ Using English fallback:', voice.name, voice.lang);
    } else {
      console.log('⚠️ Using default voice');
      voice = voices[0];
    }
    
    return voice;
  };

  // Start listening
  const startListening = () => {
    if (!isSupported) {
      toast.error('Voice recognition not supported. Please use Chrome, Edge, or Safari.');
      return;
    }

    networkRetryCountRef.current = 0;
    clearTimeout(networkRetryTimerRef.current);
    isManualStopRef.current = false;
    fullTranscriptRef.current = '';
    setCurrentTranscript('');
    setIsListening(true);

    try {
      recognitionRef.current.start();
      // REMOVED: No more annoying "I'm listening. Go ahead!" announcement
    } catch (error) {
      console.error('Failed to start listening:', error);
      setIsListening(false);
      toast.error('Failed to start listening. Please try again.');
    }
  };

  // Stop listening
  const stopListening = () => {
    isManualStopRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    clearTimeout(silenceTimerRef.current);

    // Send whatever was transcribed (finalized + in-progress) if any
    const finalMessage = currentTranscript.trim() || fullTranscriptRef.current.trim();
    if (finalMessage) {
      handleSendMessage(finalMessage, true);
    }
    fullTranscriptRef.current = '';
  };

  // Text-to-speech with multi-language support
  const speak = (text, languageCode = null, retryCount = 0) => {
    if (!synthRef.current || !('speechSynthesis' in window)) {
      console.warn('❌ Speech synthesis not available in this browser');
      toast.warning('Audio output not supported in this browser');
      return;
    }

    // Check if voices are loaded
    const voices = synthRef.current.getVoices();

    if (voices.length === 0 && retryCount < 3) {
      // Voices not loaded yet, retry after a delay
      console.log(`⏳ Voices not loaded, retrying... (attempt ${retryCount + 1}/3)`);
      setTimeout(() => {
        speak(text, languageCode, retryCount + 1);
      }, 500);
      return;
    }

    if (voices.length === 0) {
      console.error('❌ No voices available after retries');
      toast.error('Audio output unavailable. Please check browser TTS settings.');
      return;
    }

    // Stop any ongoing speech
    synthRef.current.cancel();

    // Detect language if not provided
    const detectedLang = languageCode || detectLanguage(text);

    console.log('🗣️ Speaking text:', text.substring(0, 50));
    console.log('🌍 Detected language:', detectedLang);
    console.log('🔊 Available voices:', voices.length);

    const utterance = new SpeechSynthesisUtterance(text);

    // Get appropriate voice for the language
    const voice = getVoiceForLanguage(detectedLang);

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
      console.log('🎤 Using voice:', voice.name, '(', voice.lang, ')');
    } else {
      // If no voice found, use default with language code
      utterance.lang = detectedLang;
      console.log('🎤 No specific voice found, using default with lang:', detectedLang);
    }

    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      console.log('▶️ Started speaking in', utterance.lang);
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      console.log('⏹️ Finished speaking');
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('❌ Speech error:', event.error, event);
      setIsSpeaking(false);

      if (event.error === 'not-allowed') {
        toast.error('🔇 Audio blocked. Please allow audio in browser settings.');
      } else if (event.error === 'synthesis-failed') {
        toast.error('Audio synthesis failed. Try refreshing the page.');
      } else {
        console.error('Speech synthesis error details:', event);
      }
    };

    // Ensure synthesis is ready before speaking
    setTimeout(() => {
      try {
        console.log('🎯 Attempting to speak now...');
        synthRef.current.speak(utterance);
        console.log('✅ speak() called successfully');
      } catch (error) {
        console.error('❌ Error calling speak():', error);
        setIsSpeaking(false);
        toast.error('Failed to play audio response');
      }
    }, 200);
  };

  // Handle sending message (voice or text)
  // viaVoice controls whether the AI's reply is spoken aloud - typed
  // messages should just get a chat reply, voice input should get a spoken one
  const handleSendMessage = async (message, viaVoice = false) => {
    const userMessage = message || textInput;
    
    if (!userMessage.trim()) return;

    // Stop listening if active
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    // Add user message to chat
    const userChatEntry = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, userChatEntry]);
    
    // Clear inputs
    setTextInput('');
    setCurrentTranscript('');
    setIsProcessing(true);

    try {
      // Detect language from user input
      const inputLanguage = detectLanguage(userMessage);
      const langCode = inputLanguage.split('-')[0]; // e.g., 'hi' from 'hi-IN'
      
      console.log('📤 Sending message in language:', langCode);

      // Call AI API
      const response = await axios.post(
        `${API_URL}/api/process-voice-command`,
        {
          user_input: userMessage,
          language: langCode // Send detected language
        },
        {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { commands, response_text, detected_language } = response.data;

      console.log('📥 Response language from API:', detected_language);
      console.log('📝 Response text:', response_text.substring(0, 100));

      // Add AI response to chat
      const aiChatEntry = {
        role: 'assistant',
        content: response_text,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, aiChatEntry]);

      // Determine language for TTS
      // Priority: detected_language from API > detected from response text > detected from input
      let speakLanguage = null;
      
      if (detected_language) {
        // Map short codes to full codes
        const langMap = {
          'en': 'en-US',
          'hi': 'hi-IN',
          'es': 'es-ES',
          'fr': 'fr-FR',
          'de': 'de-DE',
          'zh': 'zh-CN',
          'ja': 'ja-JP',
          'ar': 'ar-SA',
          'pt': 'pt-BR',
          'it': 'it-IT',
          'ru': 'ru-RU',
          'ko': 'ko-KR'
        };
        speakLanguage = langMap[detected_language] || detected_language;
      } else {
        // Detect from response text
        speakLanguage = detectLanguage(response_text);
      }
      
      console.log('🎯 Final TTS language:', speakLanguage);

      // Only speak the reply aloud if the user spoke to us - typed messages
      // just get a normal chat reply, no audio.
      if (viaVoice) {
        speak(response_text, speakLanguage);
      }

      // Execute form commands if any
      if (commands && commands.length > 0 && onVoiceCommand) {
        commands.forEach(command => {
          onVoiceCommand(command);
        });
      }

    } catch (error) {
      console.error('AI processing error:', error);
      
      const errorMessage = error.response?.data?.detail || 'Sorry, I had trouble processing that. Please try again.';
      
      const errorChatEntry = {
        role: 'assistant',
        content: `❌ ${errorMessage}`,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorChatEntry]);
      
      toast.error('Failed to process message. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle text input submit
  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      handleSendMessage(textInput);
    }
  };

  // Toggle assistant panel
  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Auto-focus text input when opening
      setTimeout(() => {
        document.getElementById('voice-text-input')?.focus();
      }, 100);
    }
  };

  if (!isSupported) {
    return null; // Don't show if not supported
  }

  return (
    <>
      {/* Floating Voice Button */}
      <button
        onClick={toggleOpen}
        className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center ${
          isListening 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : isProcessing
            ? 'bg-yellow-500 hover:bg-yellow-600'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
        }`}
        title="AI Voice Assistant"
      >
        <div className="relative">
          <FaRobot className="text-white text-2xl" />
          {isProcessing && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
          )}
          {chatHistory.length > 1 && !isOpen && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {chatHistory.length - 1}
            </div>
          )}
        </div>
      </button>

      {/* Voice Assistant Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-28 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] animate-slide-up">
          <div className={`rounded-2xl shadow-2xl overflow-hidden ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaRobot className="text-white text-xl animate-bounce" />
                  <div>
                    <h3 className="text-white font-bold">AI Travel Assistant</h3>
                    <p className="text-xs text-blue-100">
                      {isListening ? '🎤 Listening...' : isProcessing ? '🤔 Thinking...' : isSpeaking ? '🔊 Speaking...' : '💬 Ask me anything!'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleOpen}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className={`h-96 overflow-y-auto p-4 space-y-3 ${
              darkMode ? 'bg-gray-900' : 'bg-gray-50'
            }`}>
              {chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-none'
                        : darkMode
                        ? 'bg-gray-800 text-gray-100 rounded-bl-none'
                        : 'bg-white text-gray-900 rounded-bl-none shadow-md'
                    } ${message.role === 'assistant' && index === chatHistory.length - 1 && isSpeaking ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}
                  >
                    <div className="flex items-start space-x-2">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap flex-1">{message.content}</p>
                      {message.role === 'assistant' && index === chatHistory.length - 1 && isSpeaking && (
                        <FaVolumeUp className="text-blue-500 animate-pulse mt-1" />
                      )}
                    </div>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Current listening transcript */}
              {isListening && currentTranscript && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-blue-500/30 text-blue-700 dark:text-blue-300 rounded-br-none border-2 border-blue-400 border-dashed">
                    <p className="text-sm italic">{currentTranscript}</p>
                    <p className="text-xs mt-1">Listening...</p>
                  </div>
                </div>
              )}
              
              {isProcessing && (
                <div className="flex justify-start">
                  <div className={`rounded-2xl px-4 py-3 ${
                    darkMode ? 'bg-gray-800' : 'bg-white shadow-md'
                  }`}>
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className={`p-4 border-t ${
              darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
            }`}>
              <form onSubmit={handleTextSubmit} className="flex space-x-2">
                <input
                  id="voice-text-input"
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your message or use voice..."
                  disabled={isListening || isProcessing}
                  className={`flex-1 px-4 py-2 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  } ${(isListening || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing}
                  className={`p-3 rounded-xl transition-all ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isListening ? <FaMicrophoneSlash /> : <FaMicrophone />}
                </button>
                
                <button
                  type="submit"
                  disabled={!textInput.trim() || isProcessing}
                  className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <FaPaperPlane />
                </button>
              </form>
              
              <div className="mt-2 text-xs text-center text-gray-500">
                {isListening ? (
                  <span className="text-red-500 font-semibold">🎤 Listening... (Click mic to send)</span>
                ) : voicesLoaded ? (
                  <span>Click 🎤 to speak or type your message</span>
                ) : (
                  <span className="text-yellow-600">⏳ Loading voices...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for slide-up animation */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

export default VoiceAssistant;