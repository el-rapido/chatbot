import React, { useState, useEffect, useCallback } from 'react';
import './chat.css';

// Define the type for a message
type Message = {
  sender: 'user' | 'bot'; // Literal union type
  text: string;
};

// Define the type for a single question
type Question = {
  id: string;
  text: string;
  options: { label: string; nextQuestionId?: string; answer?: string }[];
};

const Chatbot: React.FC<{ currentPage: string }> = ({ currentPage }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('q1');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [userInput, setUserInput] = useState<string>('');
  const [questions, setQuestions] = useState<Record<string, Question>>({});
  const [audioUrl, setAudioUrl] = useState<string | null>(null); // Store the audio URL
  const [isPlaying, setIsPlaying] = useState<boolean>(false); // Track audio playback state
  const [isMuted, setIsMuted] = useState<boolean>(false); // Track mute state

  // Dynamically load the JSON file based on the current page name
  useEffect(() => {
    const loadQuestionData = async () => {
      try {
        console.log(`Attempting to load ${currentPage}.json`);
        try {
          const module = await import(/* @vite-ignore */ `../public/json/${currentPage}.json`);
          console.log(`Successfully loaded ${currentPage}.json`);
          setQuestions(module.default || module);
        } catch (specificError) {
          console.warn(`Couldn't load ${currentPage}.json:`, specificError);
          const fallbackModule = await import(/* @vite-ignore */ '../public/json/home.json');
          console.log('Falling back to home.json');
          setQuestions(fallbackModule.default || fallbackModule);
        }
      } catch (error) {
        console.error('Error loading question data:', error);
      }
    };

    loadQuestionData();
  }, [currentPage]);

  // Play the welcome message when the chatbot is opened
  useEffect(() => {
    if (isOpen && Object.keys(questions).length > 0) {
      const initialQuestion = questions['q1'];
      if (initialQuestion && initialQuestion.text.trim()) {
        speakText(initialQuestion.text); // Read the welcome message
      }
    }
  }, [isOpen, questions]);

  // Speak the current question's text when currentQuestionId changes
  useEffect(() => {
    const currentQuestion = questions[currentQuestionId];
    if (currentQuestion && currentQuestion.text.trim()) {
      speakText(currentQuestion.text); // Read the current question's text
    }
  }, [currentQuestionId, questions]);

  // Function to handle user selection
  const handleOptionClick = useCallback(
    (option: { label: string; nextQuestionId?: string; answer?: string }) => {
      console.log('Option clicked:', option);

      // Batch all state updates into a single call
      setMessages((prevMessages) => {
        const newMessages = [
          ...prevMessages,
          { sender: 'user' as const, text: option.label }, // Explicitly cast 'user'
        ];

        if (option.answer) {
          newMessages.push({ sender: 'bot' as const, text: option.answer || '' }); // Explicitly cast 'bot'
        } else if (option.nextQuestionId) {
          setCurrentQuestionId(option.nextQuestionId);
        }

        console.log('Updated messages:', newMessages);
        return newMessages;
      });

      // Speak the answer if it exists and the chatbot is not muted
      if (option.answer && !isMuted) {
        speakText(option.answer || '');
      }
    },
    [isMuted] // Add `isMuted` as a dependency
  );

  // Handle user typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  // Handle sending user input
  const handleSendMessage = () => {
    if (userInput.trim() === '') return;

    const botResponse = `You said: "${userInput}". How can I assist you further?`;
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: 'user' as const, text: userInput }, // Explicitly cast 'user'
      { sender: 'bot' as const, text: botResponse }, // Explicitly cast 'bot'
    ]);

    // Speak the bot's response if the chatbot is not muted
    if (!isMuted) {
      speakText(botResponse);
    }

    setUserInput('');
  };

  // Function to send text to the TTS backend
  const speakText = async (text: string) => {
    console.log(`[DEBUG] speakText called with text: "${text}"`);

    if (isMuted || isPlaying) {
      console.log('[DEBUG] Chatbot is muted or already playing audio. Skipping TTS.');
      return; // Skip if muted or already playing
    }

    try {
      console.log('[DEBUG] Starting audio generation...');
      setIsPlaying(true); // Mark audio as playing

      const response = await fetch('http://127.0.0.1:5000/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `text=${encodeURIComponent(text)}`,
      });

      if (!response.ok) {
        console.error(`[DEBUG] Failed to generate audio: ${response.statusText}`);
        setIsPlaying(false); // Reset playing state on failure
        return;
      }

      console.log('[DEBUG] Audio generated successfully. Creating audio URL...');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url); // Set the audio URL for playback
      console.log('[DEBUG] Audio URL created:', url);
    } catch (error) {
      console.error('[DEBUG] Error during TTS request:', error);
      setIsPlaying(false); // Reset playing state on error
    }
  };

  // Play the audio when the URL is updated
  useEffect(() => {
    if (audioUrl) {
      console.log('[DEBUG] Audio URL detected. Starting playback...');
      const audio = new Audio(audioUrl);
      setIsPlaying(true); // Mark audio as playing

      audio.play()
        .then(() => {
          console.log('[DEBUG] Audio playback started successfully.');
        })
        .catch((err) => {
          console.error('[DEBUG] Audio playback failed:', err);
          setIsPlaying(false); // Reset playing state on failure
        });

      // Listen for the `ended` event to reset `isPlaying`
      audio.addEventListener('ended', () => {
        console.log('[DEBUG] Audio playback completed. Resetting isPlaying state...');
        setIsPlaying(false); // Reset playing state after playback
        URL.revokeObjectURL(audioUrl); // Clean up the object URL
        setAudioUrl(null); // Clear the audio URL to prevent duplicate playback
      });
    }
  }, [audioUrl]);

  const currentQuestion = questions[currentQuestionId];

  return (
    <div>
      {/* Floating Chat Icon */}
      {!isOpen && (
        <button className="chat-icon" onClick={() => setIsOpen(true)}>
          💬
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              {/* Dynamic Robot GIF */}
              <div className="bot-avatar">
                <img
                  key={isPlaying ? 'speaking' : 'idle'} // Unique key for each GIF
                  src={isPlaying ? '/gif/duxManTalk.gif' : '/gif/duxManSilent.gif'}
                  alt="Bot Avatar"
                  style={{
                    width: '200px', // Larger size
                    height: '200px', // Larger size
                    border: '2px solid #ffffff', // Optional: Add a border for contrast
                    borderRadius: '8px', // Slight rounding for a polished look
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                className="mute-button"
                onClick={() => {
                  const newMuteState = !isMuted;
                  setIsMuted(newMuteState);
                  console.log(`Chatbot ${newMuteState ? 'muted' : 'unmuted'}`);
                }}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? '🔇' : '🔈'} {/* Show mute/unmute icon */}
              </button>
              <button className="close-button" onClick={() => setIsOpen(false)}>
                ✖
              </button>
            </div>
          </div>

          {/* Conversation Area */}
          <div className="conversation-area">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
              >
                {message.text}
              </div>
            ))}
          </div>

          {/* Current Question */}
          {currentQuestion && (
            <div className="current-question">
              <div className="message bot-message">{currentQuestion.text}</div>
            </div>
          )}

          {/* Options */}
          <div className="options">
            {currentQuestion?.options.map((option, index) => (
              <button
                key={index}
                className="option-button"
                onClick={() => handleOptionClick(option)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Input Field */}
          <div className="input-container">
            <input
              type="text"
              value={userInput}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="input-field"
            />
            <button className="send-button" onClick={handleSendMessage}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;